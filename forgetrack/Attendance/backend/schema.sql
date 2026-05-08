-- ForgeTrack Database Schema

CREATE TABLE public.students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  usn TEXT UNIQUE NOT NULL,
  admission_number TEXT,
  email TEXT,
  branch_code TEXT NOT NULL,
  batch TEXT DEFAULT '2024-2028',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.sessions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  month_number INTEGER NOT NULL,
  duration_hours DECIMAL(3,1) DEFAULT 2.0,
  session_type TEXT DEFAULT 'offline',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.import_log (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  total_rows INTEGER NOT NULL,
  imported_rows INTEGER NOT NULL,
  skipped_rows INTEGER NOT NULL,
  warnings TEXT,
  column_mapping TEXT,
  status TEXT NOT NULL
);

CREATE TABLE public.attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES public.students(id),
  session_id INTEGER NOT NULL REFERENCES public.sessions(id),
  present BOOLEAN NOT NULL,
  marked_at TIMESTAMP DEFAULT NOW(),
  marked_by TEXT DEFAULT 'system',
  import_id INTEGER REFERENCES public.import_log(id),
  UNIQUE(student_id, session_id)
);

CREATE TABLE public.materials (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY, -- Maps to auth.users.id
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
  student_id INTEGER REFERENCES public.students(id),
  display_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Students: Mentors can do all. Students can SELECT only their own row.
CREATE POLICY "mentor_all_students" ON public.students
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "students_read_own_student_record" ON public.students
  FOR SELECT USING (id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Sessions: Mentors can do all. Students can SELECT all.
CREATE POLICY "mentor_all_sessions" ON public.sessions
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "students_read_all_sessions" ON public.sessions
  FOR SELECT USING (true);

-- Attendance: Mentors can do all. Students can SELECT only their own.
CREATE POLICY "mentor_all_attendance" ON public.attendance
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "students_read_own_attendance" ON public.attendance
  FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Materials: Mentors can do all. Students can SELECT all.
CREATE POLICY "mentor_all_materials" ON public.materials
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "students_read_all_materials" ON public.materials
  FOR SELECT USING (true);

-- ImportLog: Mentors can SELECT/INSERT. Students have NO access.
CREATE POLICY "mentor_all_import_log" ON public.import_log
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');

-- Users: Mentors can do all. Students can SELECT their own.
CREATE POLICY "mentor_all_users" ON public.users
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "students_read_own_user" ON public.users
  FOR SELECT USING (id = auth.uid());

-- CHECK constraints
ALTER TABLE public.sessions
ADD CONSTRAINT check_session_date
CHECK (date <= CURRENT_DATE AND date >= '2025-08-04');

-- Auth trigger
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_student_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  default_email TEXT;
BEGIN
  default_email := LOWER(NEW.usn) || '@forge.local';
  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    is_sso_user
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    default_email,
    crypt(NEW.usn, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'student', 'student_id', NEW.id, 'display_name', NEW.name),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    false
  );

  INSERT INTO public.users (
    id,
    email,
    role,
    student_id,
    display_name,
    created_at
  ) VALUES (
    new_user_id,
    default_email,
    'student',
    NEW.id,
    NEW.name,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_student_created
  AFTER INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.create_student_auth_user();

