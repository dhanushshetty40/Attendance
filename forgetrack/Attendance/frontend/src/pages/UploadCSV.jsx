import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { genAI } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { Upload, FileText, ChevronRight, CheckCircle, AlertCircle, XCircle, Search } from 'lucide-react'

const SYSTEM_PROMPT = `You are a data mapping assistant.
Map spreadsheet columns to: [student_name, usn, admission_number, email, branch_code, date, session_topic, attendance_status, IGNORE].

Return ONLY a JSON object:
{
  "mapping": { "source_column": "target_field" },
  "date_format": "DD/MM/YY",
  "attendance_convention": "TRUE/FALSE",
  "is_pivoted": true,
  "date_columns": ["col1", "col2"],
  "reasoning": "Explain your choice.",
  "inferred_dates": { "col1": "YYYY-MM-DD" }
}
`

function parseDateStr(str) {
  if (!str) return null
  str = String(str).trim()
  if (str.includes('-')) {
    const parts = str.split('-')
    if (parts[0].length === 4) return str
  }
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length === 3) {
      let year = parseInt(parts[2])
      if (year < 100) year += (year < 50 ? 2000 : 1900)
      let month = parts[1].padStart(2, '0')
      let day = parts[0].padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
  return null
}

function parseStatus(val) {
  if (val === undefined || val === null) return null
  const s = String(val).trim().toLowerCase()
  if (['true', 'p', 'present', '1', 'y'].includes(s)) return true
  if (['false', 'a', 'absent', '0', 'n'].includes(s)) return false
  return null
}

export default function UploadCSV() {
  const { userRecord } = useAuth()
  
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawData, setRawData] = useState([])
  const [mappingState, setMappingState] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [workbook, setWorkbook] = useState(null)
  const [availableSheets, setAvailableSheets] = useState([])
  const [selectedSheets, setSelectedSheets] = useState([])
  const [candidates, setCandidates] = useState([])
  const [dbStudents, setDbStudents] = useState([])
  const [dbSessions, setDbSessions] = useState([])
  const [schedule, setSchedule] = useState('')
  const [importProgress, setImportProgress] = useState(0)
  const [importSummary, setImportSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchHistory()
    fetchDbData()
  }, [])

  async function fetchHistory() {
    const { data } = await supabase.from('import_log').select('*').order('uploaded_at', { ascending: false })
    if (data) setHistory(data)
  }

  async function fetchDbData() {
    const { data: students } = await supabase.from('students').select('*')
    const { data: sessions } = await supabase.from('sessions').select('*')
    if (students) setDbStudents(students)
    if (sessions) setDbSessions(sessions)
  }

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) processFile(e.target.files[0])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0])
  }

  const processFile = (f) => {
    if (f.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.")
      return
    }
    const ext = f.name.split('.').pop().toLowerCase()
    if (ext !== 'csv' && ext !== 'xlsx') {
      alert("Only .csv or .xlsx files are allowed.")
      return
    }
    setFile(f)
    if (ext === 'csv') {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setRawHeaders(results.meta.fields || [])
          setRawData(results.data)
          setAvailableSheets(['CSV File'])
          setSelectedSheets(['CSV File'])
        }
      })
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        setWorkbook(wb)
        setAvailableSheets(wb.SheetNames)
        setSelectedSheets([wb.SheetNames[0]]) // Default to first sheet
      }
      reader.readAsArrayBuffer(f)
    }
  }

  const prepareMultiSheetData = () => {
    if (!workbook) {
      if (rawData.length > 0) runAiMapping(rawHeaders, rawData)
      return
    }

    let combinedHeaders = []
    let combinedData = []
    
    selectedSheets.forEach(name => {
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' })
      if (json.length > 0) {
        combinedHeaders = [...new Set([...combinedHeaders, ...Object.keys(json[0])])]
        combinedData = [...combinedData, ...json]
      }
    })

    setRawHeaders(combinedHeaders)
    setRawData(combinedData)
    runAiMapping(combinedHeaders, combinedData)
  }

  const localSmartMapper = (headers) => {
    const mapping = {}
    const dateCols = []
    let isPivoted = false

    headers.forEach(h => {
      const lower = h.toLowerCase().trim()
      if (lower.includes('name')) mapping[h] = 'student_name'
      else if (lower.includes('usn') || lower.includes('roll')) mapping[h] = 'usn'
      else if (lower.includes('email')) mapping[h] = 'email'
      else if (lower.includes('branch')) mapping[h] = 'branch_code'
      else if (lower.includes('admission')) mapping[h] = 'admission_number'
      else if (lower.includes('/') || lower.includes('202') || lower.match(/\d{1,2}[/-]\d{1,2}/)) {
        mapping[h] = 'date'
        dateCols.push(h)
      }
      else mapping[h] = 'IGNORE'
    })

    if (dateCols.length > 1) isPivoted = true

    return {
      mapping,
      date_format: 'DD/MM/YY',
      attendance_convention: 'P/A',
      is_pivoted: isPivoted,
      date_columns: dateCols,
      reasoning: "Local Smart Mapper identified these fields automatically."
    }
  }

  const runAiMapping = async (headersToUse, dataToUse) => {
    // Fallback to state if arguments are missing (e.g. from a direct button click)
    const finalHeaders = headersToUse?.length ? headersToUse : rawHeaders
    const finalData = dataToUse?.length ? dataToUse : rawData

    setError('')
    setAiLoading(true)
    setStep(2)

    // TRY LOCAL MAPPING FIRST
    const localResult = localSmartMapper(finalHeaders)
    setMappingState(localResult)

    // If we have at least student_name and usn, we can proceed even if AI fails later
    const hasBasics = Object.values(localResult.mapping).includes('student_name') && 
                      Object.values(localResult.mapping).includes('usn')

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0 
        }
      })
      
      // Clean sample: Skip empty rows
      const sample = finalData
        .filter(row => Object.values(row).some(v => v && v.toString().trim().length > 0))
        .slice(0, 10)

      const existingDates = dbSessions.map(s => s.date)
      const userMessage = JSON.stringify({ 
        headers: finalHeaders, 
        sample_data: sample,
        existing_database_dates: existingDates,
        sheets_selected: selectedSheets,
        typical_weekly_schedule: schedule
      })

      console.log("Sending to Gemini:", userMessage)
      const result = await model.generateContent([SYSTEM_PROMPT, userMessage])
      const responseText = result.response.text()
      console.log("Gemini Response:", responseText)
      
      const parsed = JSON.parse(responseText)
      
      // Ensure all headers are represented
      finalHeaders.forEach(h => {
        if (!parsed.mapping[h]) parsed.mapping[h] = 'IGNORE'
      })

      setMappingState(parsed)
    } catch (err) {
      console.error("AI Mapping Error:", err)
      const isQuota = err.message?.includes('429') || err.message?.includes('quota')
      if (isQuota) {
        setError("AI is at capacity. Using local smart mapping instead.")
      } else {
        setError(`AI Agent issue: ${err.message}. Local mapping is active.`)
      }
    } finally {
      setAiLoading(false)
    }
  }

  const runValidation = () => {
    const cands = []
    const targetFields = ['student_name', 'usn', 'admission_number', 'email', 'branch_code']
    
    rawData.forEach((row, i) => {
      const isBlank = Object.values(row).every(v => !v || v.toString().trim() === '')
      const isSummary = Object.values(row).some(v => v && ['total', 'average'].includes(v.toString().trim().toLowerCase()))
      if (isBlank || isSummary) return

      const studentInfo = {}
      Object.entries(mappingState.mapping).forEach(([src, target]) => {
        if (targetFields.includes(target)) studentInfo[target] = row[src]
      })

      if (mappingState.is_pivoted) {
        mappingState.date_columns.forEach(dCol => {
          const val = row[dCol]
          if (val === undefined || val === null || val === '') return
          cands.push({ ...studentInfo, raw_date: dCol, raw_status: val, source_row: i + 2, exclude: false })
        })
      } else {
        const dCol = Object.keys(mappingState.mapping).find(k => mappingState.mapping[k] === 'date')
        const sCol = Object.keys(mappingState.mapping).find(k => mappingState.mapping[k] === 'attendance_status')
        if (row[sCol] === undefined || row[sCol] === null || row[sCol] === '') return
        cands.push({ ...studentInfo, raw_date: row[dCol], raw_status: row[sCol], source_row: i + 2, exclude: false })
      }
    })

    const validated = cands.map(c => {
      const errs = []
      const warns = []
      
      if (!c.student_name) errs.push("Missing student name")
      if (!c.usn) errs.push("Missing USN")
      
      // Use inferred date if available
      const rawDateToUse = (mappingState.inferred_dates && mappingState.inferred_dates[c.raw_date]) || c.raw_date
      const parsedDate = parseDateStr(rawDateToUse)
      
      if (!parsedDate) errs.push("Invalid date format")
      else if (parsedDate < '2025-08-04') errs.push("Date before program start")
      else if (new Date(parsedDate) > new Date()) errs.push("Date in future")
      
      const parsedStatus = parseStatus(c.raw_status)
      if (parsedStatus === null) errs.push("Invalid status value")
      
      const dbMatch = dbStudents.find(s => s.usn === c.usn)
      if (!dbMatch && c.usn) warns.push("USN not in DB (will create)")
      
      // CONFLICT DETECTION
      const sessConflict = dbSessions.find(s => s.date === parsedDate)
      if (sessConflict) {
        warns.push(`Session for ${parsedDate} already exists in DB`)
      }

      let finalStatus = 'clean'
      if (warns.length > 0) finalStatus = 'warning'
      if (errs.length > 0) finalStatus = 'error'

      return { ...c, parsedDate, parsedStatus, dbMatch, errs, warns, validationStatus: finalStatus, isConflict: !!sessConflict }
    })
    
    setCandidates(validated)
    setStep(3)
  }

  const runImport = async () => {
    const toImport = candidates.filter(c => !c.exclude && c.validationStatus !== 'error')
    if (toImport.length === 0) return
    
    setStep(4)
    setImportProgress(10)

    const { data: logData } = await supabase.from('import_log').insert({
      filename: file.name,
      uploaded_by: userRecord.display_name,
      total_rows: rawData.length,
      imported_rows: 0,
      skipped_rows: candidates.filter(c => c.exclude || c.validationStatus === 'error').length,
      status: 'in_progress',
      column_mapping: JSON.stringify(mappingState)
    }).select().single()

    const importId = logData.id

    // Create unique sessions
    const uniqueDates = [...new Set(toImport.map(c => c.parsedDate))]
    for (const d of uniqueDates) {
      if (!dbSessions.find(s => s.date === d)) {
        const { data: newSess } = await supabase.from('sessions').insert({
          date: d,
          topic: 'Imported Session',
          month_number: new Date(d).getMonth() + 1
        }).select().single()
        if (newSess) setDbSessions(prev => [...prev, newSess])
      }
    }
    setImportProgress(30)

    // Create unique students
    const uniqueUSNs = [...new Set(toImport.map(c => c.usn))]
    for (const usn of uniqueUSNs) {
      if (!dbStudents.find(s => s.usn === usn)) {
        const cData = toImport.find(c => c.usn === usn)
        const { data: newStu } = await supabase.from('students').insert({
          name: cData.student_name,
          usn: cData.usn,
          branch_code: cData.branch_code || 'UNKN'
        }).select().single()
        if (newStu) setDbStudents(prev => [...prev, newStu])
      }
    }
    setImportProgress(50)

    // Build attendance rows
    const attRows = toImport.map(c => {
      const sess = dbSessions.find(s => s.date === c.parsedDate) || dbSessions[dbSessions.length-1]
      const stu = dbStudents.find(s => s.usn === c.usn) || dbStudents[dbStudents.length-1]
      return {
        student_id: stu?.id,
        session_id: sess?.id,
        present: c.parsedStatus,
        marked_by: 'csv_import',
        import_id: importId
      }
    }).filter(r => r.student_id && r.session_id)

    // Insert in batches of 50
    let successCount = 0
    for (let i = 0; i < attRows.length; i += 50) {
      const batch = attRows.slice(i, i + 50)
      const { error } = await supabase.from('attendance').upsert(batch, { onConflict: 'student_id,session_id' })
      if (!error) successCount += batch.length
      setImportProgress(50 + Math.floor((i / attRows.length) * 50))
    }

    await supabase.from('import_log').update({
      imported_rows: successCount,
      status: successCount === attRows.length ? 'completed' : 'partial'
    }).eq('id', importId)

    setImportProgress(100)
    setImportSummary({ successCount, total: attRows.length })
    fetchHistory()
  }

  const updateMapping = (src, tgt) => {
    setMappingState(prev => ({
      ...prev,
      mapping: { ...prev.mapping, [src]: tgt }
    }))
  }

  const targetOptions = ['IGNORE', 'student_name', 'usn', 'admission_number', 'email', 'branch_code', 'date', 'session_topic', 'attendance_status']

  const hasErrors = candidates.some(c => !c.exclude && c.validationStatus === 'error')

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <h1 className="text-h1 mb-6">Upload CSV</h1>

      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-caption ${step === s ? 'bg-accent-glow text-inverse' : step > s ? 'bg-success-bg text-success-fg' : 'bg-surface-raised text-tertiary'}`}>
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
            {s < 4 && <div className={`w-16 h-px mx-4 ${step > s ? 'bg-success-fg' : 'bg-border-subtle'}`}></div>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card text-center py-16 px-8 relative border-2 border-dashed border-border-default hover:border-accent-glow hover:bg-accent-glow/5 transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept=".csv, .xlsx" />
          <Upload size={48} className="mx-auto text-tertiary mb-4" />
          <h2 className="text-h2 mb-2">Drag and drop your file here</h2>
          <p className="text-body text-secondary mb-6">Supports .csv and .xlsx up to 5MB.</p>
          <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>Browse Files</button>
          
          {file && availableSheets.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border-subtle text-left">
              <div className="text-body-lg font-medium mb-4 flex items-center gap-2"><FileText size={18}/> {file.name}</div>
              
              {availableSheets.length > 1 && (
                <div className="mb-6">
                  <label className="text-label text-tertiary block mb-3">SELECT SHEETS TO IMPORT</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableSheets.map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          if (selectedSheets.includes(name)) {
                            setSelectedSheets(selectedSheets.filter(s => s !== name))
                          } else {
                            setSelectedSheets([...selectedSheets, name])
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-body-sm transition-all border ${selectedSheets.includes(name) ? 'bg-accent-glow text-inverse border-accent-glow' : 'bg-surface-inset text-secondary border-border-subtle hover:border-border-default'}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-caption text-secondary mb-6">{rawData.length} rows detected • {rawHeaders.length} columns</div>
              <button 
                className="btn-primary w-full sm:w-auto" 
                disabled={selectedSheets.length === 0}
                onClick={prepareMultiSheetData}
              >
                Next: Map Columns <ChevronRight size={16} className="inline"/>
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2 className="text-h2 mb-4">Map Columns</h2>
          {error && (
            <div className="bg-danger-bg/10 border border-danger-border rounded-lg p-4 mb-6 text-body-sm text-danger-fg flex gap-3">
              <XCircle size={18} className="shrink-0"/>
              {error}
            </div>
          )}
          {aiLoading ? (
            <div className="py-12 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-accent-glow border-t-transparent animate-spin mb-4"></div>
              <p className="text-body text-secondary">AI Agent is analyzing headers and sample data...</p>
            </div>
          ) : mappingState ? (
            <>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="text-label text-tertiary block mb-2">WEEKLY SCHEDULE (FOR MISSING DATES)</label>
                  <div className="flex gap-2">
                    <input 
                      className="input flex-1 h-10" 
                      placeholder="e.g. Mon, Wed, Fri" 
                      value={schedule}
                      onChange={e => setSchedule(e.target.value)}
                    />
                    <button className="btn-secondary h-10 px-4" onClick={() => runAiMapping(rawHeaders, rawData)}>
                      Re-Analyze
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <span className="pill bg-surface-inset border-border-subtle text-secondary h-10 flex items-center">Format: {mappingState.date_format}</span>
                  <span className="pill bg-surface-inset border-border-subtle text-secondary h-10 flex items-center">Values: {mappingState.attendance_convention}</span>
                  {mappingState.is_pivoted && <span className="pill bg-info-bg text-info-fg border-info-border h-10 flex items-center">Pivoted Layout</span>}
                </div>
              </div>

              {mappingState.reasoning && (
                <div className="bg-info-bg/10 border border-info-border rounded-lg p-4 mb-6 text-body-sm text-info-fg flex gap-3">
                  <AlertCircle size={18} className="shrink-0"/>
                  <div>
                    <span className="font-bold">AI Reasoning:</span> {mappingState.reasoning}
                  </div>
                </div>
              )}
              <div className="max-h-[50vh] overflow-y-auto border border-border-subtle rounded-lg">
                <table className="table w-full text-left">
                  <thead className="bg-surface-inset sticky top-0">
                    <tr>
                      <th className="p-4 text-label text-tertiary">Source Column</th>
                      <th className="p-4 text-label text-tertiary">Sample Data</th>
                      <th className="p-4 text-label text-tertiary">Target Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {rawHeaders.map(h => (
                      <tr key={h}>
                        <td className="p-4 text-body font-medium">{h}</td>
                        <td className="p-4 text-caption text-secondary font-mono truncate max-w-[200px]">{rawData[0]?.[h]}</td>
                        <td className="p-4">
                          <select 
                            className="input h-9 text-body-sm py-0" 
                            value={mappingState.mapping[h] || 'IGNORE'}
                            onChange={e => updateMapping(h, e.target.value)}
                          >
                            {targetOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            {mappingState.is_pivoted && <option value="date">Date Column</option>}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="btn-primary" onClick={runValidation}>Next: Validate Data <ChevronRight size={16} className="inline"/></button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {step === 3 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-6 border-b border-border-subtle bg-surface flex justify-between items-center">
            <div>
              <h2 className="text-h2 mb-1">Validation Preview</h2>
              <div className="text-body-sm text-secondary">
                <span className="text-primary font-medium">{candidates.filter(c => !c.exclude).length}</span> ready • 
                <span className="text-warning-fg font-medium ml-2">{candidates.filter(c => c.validationStatus==='warning' && !c.exclude).length}</span> warnings • 
                <span className="text-danger-fg font-medium ml-2">{candidates.filter(c => c.validationStatus==='error' && !c.exclude).length}</span> errors
              </div>
            </div>
            <button className="btn-primary" disabled={hasErrors} onClick={runImport}>
              Import Data
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="table w-full">
              <thead className="bg-surface-inset sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-label text-tertiary w-10"></th>
                  <th className="p-4 text-label text-tertiary">Student</th>
                  <th className="p-4 text-label text-tertiary">Date</th>
                  <th className="p-4 text-label text-tertiary">Status</th>
                  <th className="p-4 text-label text-tertiary">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {candidates.map((c, i) => (
                  <tr key={i} className={`${c.exclude ? 'opacity-40' : ''} ${c.validationStatus === 'error' ? 'bg-danger-bg/5 border-l-4 border-danger-fg' : c.validationStatus === 'warning' ? 'bg-warning-bg/5 border-l-4 border-warning-fg' : 'border-l-4 border-success-fg'}`}>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={!c.exclude} 
                        onChange={() => {
                          const newCands = [...candidates]
                          newCands[i].exclude = !newCands[i].exclude
                          setCandidates(newCands)
                        }} 
                        className="w-4 h-4 rounded border-border-strong bg-surface-inset checked:bg-accent-glow" 
                      />
                    </td>
                    <td className="p-4">
                      <div className="text-body font-medium">{c.student_name}</div>
                      <div className="text-caption font-mono text-tertiary">{c.usn}</div>
                    </td>
                    <td className="p-4 text-body-sm">{c.parsedDate || c.raw_date}</td>
                    <td className="p-4">
                      {c.parsedStatus === true ? <span className="pill pill-success">Present</span> : c.parsedStatus === false ? <span className="pill pill-danger">Absent</span> : <span className="pill bg-surface-inset text-tertiary">{c.raw_status}</span>}
                    </td>
                    <td className="p-4 text-caption">
                      {c.errs.map(e => <div key={e} className="text-danger-fg flex items-center gap-1"><XCircle size={12}/> {e}</div>)}
                      {c.warns.map(w => <div key={w} className="text-warning-fg flex items-center gap-1"><AlertCircle size={12}/> {w}</div>)}
                      {c.validationStatus === 'clean' && <span className="text-success-fg flex items-center gap-1"><CheckCircle size={12}/> Clean</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card text-center py-16">
          {importProgress < 100 ? (
            <div className="max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full border-4 border-accent-glow border-t-transparent animate-spin mx-auto mb-6"></div>
              <h2 className="text-h2 mb-4">Importing Data...</h2>
              <div className="h-2 w-full bg-surface-inset rounded-full overflow-hidden">
                <div className="h-full bg-accent-glow transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
              </div>
            </div>
          ) : (
            <div>
              <CheckCircle size={48} className="mx-auto text-success-fg mb-4" />
              <h2 className="text-h2 mb-2">Import Complete</h2>
              <p className="text-body text-secondary mb-6">Successfully imported {importSummary?.successCount} out of {importSummary?.total} records.</p>
              <button className="btn-secondary" onClick={() => { setStep(1); setFile(null); setRawData([]) }}>Upload Another File</button>
            </div>
          )}
        </div>
      )}

      {/* History section below */}
      {step === 1 && history.length > 0 && (
        <div className="card mt-12 p-0 overflow-hidden">
          <div className="p-6 border-b border-border-subtle">
            <h2 className="text-h3">Import History</h2>
          </div>
          <table className="table w-full">
            <thead className="bg-surface-inset">
              <tr>
                <th className="text-left p-4 text-label text-tertiary">File</th>
                <th className="text-left p-4 text-label text-tertiary">Date</th>
                <th className="text-left p-4 text-label text-tertiary">Imported</th>
                <th className="text-left p-4 text-label text-tertiary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {history.map(h => (
                <tr key={h.id} className="hover:bg-surface-raised">
                  <td className="p-4 text-body font-medium">{h.filename}</td>
                  <td className="p-4 text-body-sm text-secondary">{new Date(h.uploaded_at).toLocaleDateString()}</td>
                  <td className="p-4 text-body tabular-nums">{h.imported_rows} / {h.total_rows}</td>
                  <td className="p-4">
                    {h.status === 'completed' ? <span className="pill pill-success">Completed</span> : <span className="pill pill-warning">Partial</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
