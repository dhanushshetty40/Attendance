-- Seed script for ForgeTrack

-- Insert test students
INSERT INTO public.students (id, name, usn, branch_code, batch, is_active) VALUES
(1, 'Rahul Kumar', '4SH24CS001', 'CS', '2024-2028', true),
(2, 'Divya Kulkarni', '4SH24CS002', 'AI', '2024-2028', true),
(3, 'Abhishek Sharma', '4SH24CS003', 'CS', '2024-2028', true)
ON CONFLICT (usn) DO NOTHING;

-- Insert test sessions
INSERT INTO public.sessions (id, date, topic, month_number, duration_hours, session_type) VALUES
(1, '2026-04-01', '8-Layer AI Stack', 4, 2.0, 'offline'),
(2, '2026-04-02', 'ReAct Agent Pattern', 4, 2.0, 'offline'),
(3, '2026-04-08', 'pgvector RAG', 4, 2.0, 'offline')
ON CONFLICT (date) DO NOTHING;

-- Insert test attendance
INSERT INTO public.attendance (student_id, session_id, present, marked_by) VALUES
(1, 1, true, 'system'),
(2, 1, true, 'system'),
(3, 1, false, 'system'),
(1, 2, true, 'system'),
(2, 2, false, 'system'),
(3, 2, true, 'system')
ON CONFLICT (student_id, session_id) DO NOTHING;

-- Reset sequence numbers
SELECT setval('students_id_seq', (SELECT MAX(id) FROM public.students));
SELECT setval('sessions_id_seq', (SELECT MAX(id) FROM public.sessions));
SELECT setval('attendance_id_seq', (SELECT MAX(id) FROM public.attendance));
