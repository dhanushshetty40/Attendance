const XLSX = require('xlsx');
const path = require('path');

const filePath = 'g:\\antigravity\\forgetrack\\Attendance\\document file\\Data Engineering and AI - Actual Program.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    console.log(`\n--- Sheet: ${sheetName} ---`);
    console.log('Header Row (1st row):', JSON.stringify(json[0]));
    console.log('Sample Data (Row 2-5):', JSON.stringify(json.slice(1, 5)));
  });
} catch (err) {
  console.error('Error reading file:', err.message);
}
