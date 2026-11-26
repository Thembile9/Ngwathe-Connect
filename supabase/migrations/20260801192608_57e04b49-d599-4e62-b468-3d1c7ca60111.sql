-- Personnel: municipal staff and field workers
CREATE TYPE public.staff_role AS ENUM ('admin', 'switchboard', 'supervisor', 'technician');
CREATE TYPE public.job_status AS ENUM ('registered', 'assigned', 'accepted', 'en_route', 'in_progress', 'completed', 'not_completed', 'cancelled');

CREATE TABLE public.personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  department text NOT NULL,
  role public.staff_role NOT NULL DEFAULT 'technician',
  skills text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personnel TO anon, authenticated;
GRANT ALL ON public.personnel TO service_role;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo public manage personnel" ON public.personnel FOR ALL USING (true) WITH CHECK (true);

CREATE SEQUENCE public.job_cards_ref_seq;

CREATE TABLE public.job_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text NOT NULL DEFAULT 'JC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.job_cards_ref_seq')::text, 5, '0'),
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
  department text NOT NULL,
  assigned_to uuid REFERENCES public.personnel(id) ON DELETE SET NULL,
  dispatched_by text,
  priority public.complaint_priority NOT NULL DEFAULT 'medium',
  status public.job_status NOT NULL DEFAULT 'registered',
  title text NOT NULL,
  work_description text NOT NULL,
  location_text text,
  latitude double precision,
  longitude double precision,
  ward_id uuid REFERENCES public.wards(id),
  town_id uuid REFERENCES public.towns(id),
  resident_name text,
  resident_phone text,
  complaint_received_at timestamptz,
  dispatched_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  completion_notes text,
  outcome text,
  materials_used text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_cards TO anon, authenticated;
GRANT ALL ON public.job_cards TO service_role;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo public manage job cards" ON public.job_cards FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.job_card_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id uuid NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor text,
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.job_card_events TO anon, authenticated;
GRANT ALL ON public.job_card_events TO service_role;
ALTER TABLE public.job_card_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo public read job events" ON public.job_card_events FOR SELECT USING (true);
CREATE POLICY "Demo public insert job events" ON public.job_card_events FOR INSERT WITH CHECK (true);

CREATE TRIGGER personnel_set_updated_at BEFORE UPDATE ON public.personnel FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER job_cards_set_updated_at BEFORE UPDATE ON public.job_cards FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_job_cards_status ON public.job_cards(status);
CREATE INDEX idx_job_cards_assigned ON public.job_cards(assigned_to);
CREATE INDEX idx_job_cards_complaint ON public.job_cards(complaint_id);

-- Seed field personnel across departments
INSERT INTO public.personnel (full_name, phone, department, role, skills) VALUES
  ('Thabo Mokoena', '+27 82 555 0101', 'Water & Sanitation', 'technician', ARRAY['water','burst pipes']),
  ('Sipho Radebe', '+27 82 555 0102', 'Water & Sanitation', 'technician', ARRAY['sewer','blockages']),
  ('Johan van Wyk', '+27 82 555 0103', 'Electricity', 'technician', ARRAY['street lights','outages']),
  ('Lerato Dlamini', '+27 82 555 0104', 'Electricity', 'technician', ARRAY['metering','faults']),
  ('Pieter Botha', '+27 82 555 0105', 'Roads & Stormwater', 'technician', ARRAY['potholes','stormwater']),
  ('Nomsa Khumalo', '+27 82 555 0106', 'Waste Management', 'technician', ARRAY['refuse','illegal dumping']),
  ('Andile Zwane', '+27 82 555 0107', 'Parks & Recreation', 'technician', ARRAY['grass cutting','trees']),
  ('Maria Sithole', '+27 82 555 0108', 'Water & Sanitation', 'supervisor', ARRAY['dispatch']),
  ('Kabelo Motaung', '+27 82 555 0109', 'Electricity', 'supervisor', ARRAY['dispatch']),
  ('Dineo Phiri', '+27 82 555 0110', 'Switchboard', 'switchboard', ARRAY['call centre']);