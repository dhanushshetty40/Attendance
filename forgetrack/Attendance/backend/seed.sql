-- Comprehensive Seed Script for ForgeTrack
-- This script populates the database with 25 students, 15 sessions, and materials
-- as required by the SKILL_build_forgetrack.md specification.

-- 1. Clear existing data
TRUNCATE public.attendance, public.materials, public.sessions, public.users, public.students, public.import_log RESTART IDENTITY;

-- 2. Insert 25 Students
-- Using realistic Indian names and 4SH24CS### USN format
INSERT INTO public.students (name, usn, email, branch_code, batch, is_active) VALUES
('Abhishek Sharma', '4SH24CS001', 'abhishek@gmail.com', 'CS', '2024-2028', true),
('Divya Kulkarni', '4SH24CS002', 'divya@gmail.com', 'AI', '2024-2028', true),
('Ravi Kumar', '4SH24CS003', 'ravi@gmail.com', 'CS', '2024-2028', true),
('Priya Singh', '4SH24CS004', 'priya@gmail.com', 'IS', '2024-2028', true),
('Aditya Verma', '4SH24CS005', 'aditya@gmail.com', 'CS', '2024-2028', true),
('Ananya Rao', '4SH24CS006', 'ananya@gmail.com', 'AI', '2024-2028', true),
('Siddharth Jain', '4SH24CS007', 'siddharth@gmail.com', 'CS', '2024-2028', true),
('Isha Gupta', '4SH24CS008', 'isha@gmail.com', 'IS', '2024-2028', true),
('Vikram Mehra', '4SH24CS009', 'vikram@gmail.com', 'CS', '2024-2028', true),
('Sneha Patil', '4SH24CS010', 'sneha@gmail.com', 'AI', '2024-2028', true),
('Karthik Shetty', '4SH24CS011', 'karthik@gmail.com', 'CS', '2024-2028', true),
('Meghana Bhat', '4SH24CS012', 'meghana@gmail.com', 'IS', '2024-2028', true),
('Rahul Deshmukh', '4SH24CS013', 'rahul@gmail.com', 'CS', '2024-2028', true),
('Tanvi Hegde', '4SH24CS014', 'tanvi@gmail.com', 'AI', '2024-2028', true),
('Varun Prabhu', '4SH24CS015', 'varun.p@gmail.com', 'CS', '2024-2028', true),
('Riya Nayak', '4SH24CS016', 'riya@gmail.com', 'IS', '2024-2028', true),
('Manjunath R', '4SH24CS017', 'manju@gmail.com', 'CS', '2024-2028', true),
('Sahana K', '4SH24CS018', 'sahana@gmail.com', 'AI', '2024-2028', true),
('Ganesh Prasad', '4SH24CS019', 'ganesh@gmail.com', 'CS', '2024-2028', true),
('Kavya Shree', '4SH24CS020', 'kavya@gmail.com', 'IS', '2024-2028', true),
('Nithin Kumar', '4SH24CS021', 'nithin@gmail.com', 'CS', '2024-2028', true),
('Deepika S', '4SH24CS022', 'deepika@gmail.com', 'AI', '2024-2028', true),
('Pavan Kalyan', '4SH24CS023', 'pavan@gmail.com', 'CS', '2024-2028', true),
('Shruthi G', '4SH24CS024', 'shruthi@gmail.com', 'IS', '2024-2028', true),
('Nischith B', '4SH24CS025', 'nischith@gmail.com', 'CS', '2024-2028', true);

-- 3. Insert 15 Sessions
-- Spanning Months 4, 5, 6 with real topics
INSERT INTO public.sessions (date, topic, month_number, duration_hours, session_type) VALUES
('2026-04-01', '8-Layer AI Stack', 4, 2.0, 'offline'),
('2026-04-02', 'ReAct Agent Pattern', 4, 2.0, 'offline'),
('2026-04-08', 'pgvector RAG', 4, 2.0, 'offline'),
('2026-04-09', 'Tiered Autonomy Multi-Agent', 4, 2.0, 'offline'),
('2026-04-15', 'AI Agent Design', 4, 2.0, 'offline'),
('2026-04-22', 'Vector DB Optimization', 4, 2.0, 'offline'),
('2026-05-01', 'LLM Fine-tuning Basics', 5, 2.0, 'offline'),
('2026-05-02', 'Quantization Techniques', 5, 2.0, 'offline'),
('2026-05-06', 'LoRA and QLoRA', 5, 2.0, 'offline'),
('2026-05-07', 'Vibe Engineering Demo', 5, 2.0, 'offline'), -- TODAY
('2026-05-13', 'Prompt Engineering Advanced', 5, 2.0, 'offline'),
('2026-05-20', 'Model Evaluation Metrics', 5, 2.0, 'offline'),
('2026-06-03', 'Deploying AI with FastAPI', 6, 2.0, 'offline'),
('2026-06-10', 'Scaling LLM Apps', 6, 2.0, 'offline'),
('2026-06-17', 'Ethics in AI-ML', 6, 2.0, 'offline');

-- 4. Insert Test Attendance
-- We'll generate realistic attendance (70-90% present)
-- Abhishek (1) is always present. Others have some absences.
DO $$
DECLARE
  s_id RECORD;
  sess_id RECORD;
  prob FLOAT;
BEGIN
  FOR s_id IN SELECT id FROM public.students LOOP
    FOR sess_id IN SELECT id FROM public.sessions LOOP
      -- Abhishek (ID 1) always present, others 85% chance
      IF s_id.id = 1 THEN
        prob := 1.0;
      ELSE
        prob := random();
      END IF;

      INSERT INTO public.attendance (student_id, session_id, present, marked_by)
      VALUES (s_id.id, sess_id.id, prob > 0.15, 'Nischay B K');
    END LOOP;
  END LOOP;
END $$;

-- 5. Insert Materials
INSERT INTO public.materials (session_id, title, type, url, description)
SELECT id, topic || ' Slides', 'slides', 'https://slides.forge.local/' || id, 'Lecture slides for ' || topic
FROM public.sessions;

INSERT INTO public.materials (session_id, title, type, url, description)
SELECT id, topic || ' Recording', 'recording', 'https://video.forge.local/' || id, 'Recording for ' || topic
FROM public.sessions
WHERE id % 2 = 0; -- Add recordings for half the sessions

-- 6. Insert Import Log History
INSERT INTO public.import_log (filename, uploaded_by, uploaded_at, total_rows, imported_rows, skipped_rows, status) VALUES
('month_4_attendance.csv', 'Nischay B K', NOW() - INTERVAL '30 days', 150, 148, 2, 'completed'),
('month_5_historical.xlsx', 'Varun', NOW() - INTERVAL '15 days', 200, 195, 5, 'partial');

-- 7. Fix Authentication (Mentors)
DO $$
DECLARE
  nischay_id UUID := 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  varun_id UUID := 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
BEGIN
  -- Nischay
  DELETE FROM auth.users WHERE email = 'nischay@theboringpeople.in';
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, aud, role, is_sso_user
  ) VALUES (
    nischay_id, '00000000-0000-0000-0000-000000000000', 'nischay@theboringpeople.in', 
    extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), 
    '{"provider":"email","providers":["email"]}', '{"role":"mentor","display_name":"Nischay B K"}', 
    'authenticated', 'authenticated', false
  );
  
  INSERT INTO public.users (id, email, role, display_name)
  VALUES (nischay_id, 'nischay@theboringpeople.in', 'mentor', 'Nischay B K')
  ON CONFLICT (id) DO NOTHING;

  -- Varun
  DELETE FROM auth.users WHERE email = 'varun@theboringpeople.in';
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, aud, role, is_sso_user
  ) VALUES (
    varun_id, '00000000-0000-0000-0000-000000000000', 'varun@theboringpeople.in', 
    extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), 
    '{"provider":"email","providers":["email"]}', '{"role":"mentor","display_name":"Varun"}', 
    'authenticated', 'authenticated', false
  );
  
  INSERT INTO public.users (id, email, role, display_name)
  VALUES (varun_id, 'varun@theboringpeople.in', 'mentor', 'Varun')
  ON CONFLICT (id) DO NOTHING;
END $$;
