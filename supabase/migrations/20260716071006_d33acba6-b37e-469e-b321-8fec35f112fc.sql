
-- Enums
CREATE TYPE public.complaint_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE public.complaint_status AS ENUM ('new', 'acknowledged', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed');
CREATE TYPE public.event_type AS ENUM ('created', 'status_changed', 'assigned', 'note', 'attachment', 'notified');

-- Wards
CREATE TABLE public.wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_number INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  councillor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wards TO anon, authenticated;
GRANT ALL ON public.wards TO service_role;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wards" ON public.wards FOR SELECT USING (true);

-- Towns
CREATE TABLE public.towns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.towns TO anon, authenticated;
GRANT ALL ON public.towns TO service_role;
ALTER TABLE public.towns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read towns" ON public.towns FOR SELECT USING (true);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);

-- Subcategories
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  default_priority public.complaint_priority NOT NULL DEFAULT 'medium',
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (category_id, slug)
);
GRANT SELECT ON public.subcategories TO anon, authenticated;
GRANT ALL ON public.subcategories TO service_role;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read subcategories" ON public.subcategories FOR SELECT USING (true);

-- Complaints reference sequence
CREATE SEQUENCE public.complaints_ref_seq START 1000;

-- Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL DEFAULT ('NGW-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.complaints_ref_seq')::text, 6, '0')),
  category_id UUID REFERENCES public.categories(id),
  subcategory_id UUID REFERENCES public.subcategories(id),
  ward_id UUID REFERENCES public.wards(id),
  town_id UUID REFERENCES public.towns(id),
  resident_name TEXT NOT NULL,
  resident_phone TEXT NOT NULL,
  resident_email TEXT,
  resident_id_number TEXT,
  street_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT NOT NULL,
  ai_summary TEXT,
  ai_categorization JSONB,
  priority public.complaint_priority NOT NULL DEFAULT 'medium',
  status public.complaint_status NOT NULL DEFAULT 'new',
  assigned_department TEXT,
  assigned_official TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  channel TEXT NOT NULL DEFAULT 'web',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.complaints (status);
CREATE INDEX ON public.complaints (priority);
CREATE INDEX ON public.complaints (ward_id);
CREATE INDEX ON public.complaints (category_id);
CREATE INDEX ON public.complaints (created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.complaints TO anon, authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
-- Demo mode: open access. Phase 4 will lock down.
CREATE POLICY "Demo public read complaints" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Demo public insert complaints" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Demo public update complaints" ON public.complaints FOR UPDATE USING (true);

-- Complaint events
CREATE TABLE public.complaint_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  event_type public.event_type NOT NULL,
  actor TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.complaint_events (complaint_id, created_at DESC);
GRANT SELECT, INSERT ON public.complaint_events TO anon, authenticated;
GRANT ALL ON public.complaint_events TO service_role;
ALTER TABLE public.complaint_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo public read events" ON public.complaint_events FOR SELECT USING (true);
CREATE POLICY "Demo public insert events" ON public.complaint_events FOR INSERT WITH CHECK (true);

-- Notices
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  ward_id UUID REFERENCES public.wards(id),
  town_id UUID REFERENCES public.towns(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO anon, authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read notices" ON public.notices FOR SELECT USING (published = true);
CREATE POLICY "Demo public manage notices" ON public.notices FOR ALL USING (true) WITH CHECK (true);

-- Subscriptions (opt-in notifications)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  ward_id UUID REFERENCES public.wards(id),
  town_id UUID REFERENCES public.towns(id),
  categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone, ward_id)
);
GRANT SELECT, INSERT, DELETE ON public.subscriptions TO anon, authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo public manage subs" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed wards (Ngwathe has 19 wards)
INSERT INTO public.wards (ward_number, name) VALUES
(1,'Ward 1 - Tumahole'),(2,'Ward 2 - Tumahole'),(3,'Ward 3 - Tumahole'),(4,'Ward 4 - Parys'),
(5,'Ward 5 - Parys/Schonkenville'),(6,'Ward 6 - Tumahole'),(7,'Ward 7 - Tumahole'),
(8,'Ward 8 - Vredefort/Mokwallo'),(9,'Ward 9 - Mokwallo'),(10,'Ward 10 - Koppies'),
(11,'Ward 11 - Kwakwatsi'),(12,'Ward 12 - Heilbron'),(13,'Ward 13 - Phiritona'),
(14,'Ward 14 - Phiritona'),(15,'Ward 15 - Edenville/Ngwathe'),(16,'Ward 16 - Parys'),
(17,'Ward 17 - Tumahole'),(18,'Ward 18 - Tumahole'),(19,'Ward 19 - Heilbron/Phiritona');

-- Seed towns with approx coordinates
INSERT INTO public.towns (name, latitude, longitude) VALUES
('Parys', -26.9036, 27.4592),
('Tumahole', -26.9200, 27.4400),
('Schonkenville', -26.9100, 27.4700),
('Vredefort', -27.0000, 27.3667),
('Mokwallo', -27.0100, 27.3600),
('Koppies', -27.2400, 27.5800),
('Kwakwatsi', -27.2500, 27.5900),
('Heilbron', -27.2833, 27.9667),
('Phiritona', -27.2900, 27.9700),
('Edenville', -27.5522, 27.6975);

-- Seed categories
INSERT INTO public.categories (slug, name, department, icon, color, sort_order) VALUES
('water','Water Services','Water & Sanitation','droplet','#0ea5e9',1),
('electricity','Electricity','Electrical Services','zap','#f59e0b',2),
('sewer','Sewer & Sanitation','Water & Sanitation','waves','#8b5cf6',3),
('refuse','Refuse Removal','Waste Management','trash-2','#10b981',4),
('roads','Roads & Potholes','Roads & Storm Water','construction','#ef4444',5),
('storm-water','Storm Water','Roads & Storm Water','cloud-rain','#3b82f6',6),
('street-lights','Street Lights','Electrical Services','lamp','#eab308',7),
('illegal-dumping','Illegal Dumping','Waste Management','octagon-alert','#84cc16',8),
('parks','Parks & Cemeteries','Community Services','trees','#22c55e',9),
('fire','Fire & Emergencies','Fire & Rescue','flame','#dc2626',10),
('accounts','Municipal Accounts','Revenue','receipt','#6366f1',11),
('other','Other','Customer Care','circle-help','#64748b',99);

-- Seed subcategories
WITH c AS (SELECT id, slug FROM public.categories)
INSERT INTO public.subcategories (category_id, slug, name, default_priority, sort_order)
SELECT c.id, s.slug, s.name, s.priority::public.complaint_priority, s.sort_order
FROM c JOIN (VALUES
  ('water','no-water','No Water','high',1),
  ('water','pipe-burst','Pipe Burst','critical',2),
  ('water','water-leak','Water Leak','high',3),
  ('water','low-pressure','Low Water Pressure','medium',4),
  ('water','dirty-water','Dirty Water','high',5),
  ('water','meter-problem','Water Meter Problem','low',6),
  ('water','tank-empty','Water Tank Empty','high',7),
  ('water','other','Other','medium',99),
  ('electricity','power-outage','Power Outage','critical',1),
  ('electricity','transformer-fault','Transformer Fault','critical',2),
  ('electricity','street-light','Street Light Not Working','low',3),
  ('electricity','illegal-connection','Illegal Connection','high',4),
  ('electricity','exposed-cable','Exposed Cable','critical',5),
  ('electricity','meter-problem','Meter Problem','medium',6),
  ('electricity','other','Other','medium',99),
  ('sewer','blockage','Sewer Blockage','high',1),
  ('sewer','overflow','Sewer Overflow','critical',2),
  ('sewer','manhole-overflow','Manhole Overflow','critical',3),
  ('sewer','bad-smell','Bad Smell','medium',4),
  ('sewer','broken-manhole','Broken Manhole','high',5),
  ('sewer','other','Other','medium',99),
  ('refuse','not-collected','Refuse Not Collected','medium',1),
  ('refuse','overflowing-skip','Overflowing Skip','medium',2),
  ('refuse','dead-animal','Dead Animal Removal','high',3),
  ('refuse','other','Other','low',99),
  ('roads','pothole','Pothole','medium',1),
  ('roads','road-damaged','Road Damaged','medium',2),
  ('roads','drain-blocked','Storm Water Drain Blocked','high',3),
  ('roads','missing-sign','Missing Road Sign','low',4),
  ('roads','speed-hump','Speed Hump Request','low',5),
  ('roads','other','Other','medium',99),
  ('fire','house-fire','House Fire','critical',1),
  ('fire','grass-fire','Grass Fire','high',2),
  ('fire','building-fire','Building Fire','critical',3),
  ('fire','electrical-fire','Electrical Fire','critical',4),
  ('fire','vehicle-fire','Vehicle Fire','critical',5),
  ('fire','other','Other Emergency','high',99),
  ('illegal-dumping','general','Illegal Dumping Site','medium',1),
  ('street-lights','not-working','Street Light Not Working','low',1),
  ('storm-water','drain-blocked','Drain Blocked','high',1),
  ('parks','maintenance','Park Maintenance','low',1),
  ('accounts','query','Account Query','low',1),
  ('accounts','payment','Payment Issue','medium',2),
  ('other','general','General Enquiry','low',1)
) s(cat_slug, slug, name, priority, sort_order) ON c.slug = s.cat_slug;

-- Seed sample notices
INSERT INTO public.notices (title, body, category) VALUES
('Scheduled Water Interruption - Parys CBD', 'Water supply to Parys CBD will be interrupted on Saturday 08:00 - 14:00 for planned maintenance on the main reservoir line. Please store water in advance.', 'water'),
('Load Reduction Schedule - Tumahole', 'Eskom load reduction will be implemented in Tumahole between 05:00-09:00 and 17:00-21:00 due to high demand. Please conserve electricity.', 'electricity'),
('Council Meeting - Public Participation', 'The Ngwathe Local Municipality Council meeting will be held on 25 November 2026 at 10:00 at the Council Chambers, Parys. Members of the public are welcome.', 'meeting'),
('Refuse Collection - Public Holiday', 'Refuse collection scheduled for Monday will be moved to Tuesday due to the public holiday. Please put out bins by 06:00 on Tuesday.', 'refuse');

-- Seed sample complaints for demo
WITH cat AS (SELECT id, slug FROM public.categories),
     sub AS (SELECT id, slug, category_id FROM public.subcategories),
     w AS (SELECT id, ward_number FROM public.wards),
     t AS (SELECT id, name FROM public.towns)
INSERT INTO public.complaints (category_id, subcategory_id, ward_id, town_id, resident_name, resident_phone, street_address, latitude, longitude, description, priority, status, assigned_department, channel)
SELECT
  (SELECT id FROM cat WHERE slug = d.cat),
  (SELECT id FROM sub WHERE slug = d.sub AND category_id = (SELECT id FROM cat WHERE slug = d.cat) LIMIT 1),
  (SELECT id FROM w WHERE ward_number = d.ward),
  (SELECT id FROM t WHERE name = d.town),
  d.name, d.phone, d.addr, d.lat, d.lng, d.descr, d.pri::public.complaint_priority, d.stat::public.complaint_status, d.dept, 'web'
FROM (VALUES
  ('water','pipe-burst',4,'Parys','Thabo Mokoena','+27821234501','12 Bree Street, Parys',-26.9036,27.4592,'Large pipe burst on Bree Street flooding the road. Water gushing out for over an hour.','critical','in_progress','Water & Sanitation'),
  ('electricity','power-outage',1,'Tumahole','Nomsa Dlamini','+27821234502','45 Zone 3, Tumahole',-26.9200,27.4400,'Entire section of Zone 3 has been without electricity since 6am this morning.','critical','assigned','Electrical Services'),
  ('roads','pothole',5,'Schonkenville','Johan van der Merwe','+27821234503','78 Water Street, Schonkenville',-26.9100,27.4700,'Massive pothole damaging vehicles. Approximately 1m wide and 30cm deep.','high','new','Roads & Storm Water'),
  ('sewer','manhole-overflow',6,'Tumahole','Lerato Khumalo','+26821234504','Corner Main and Church, Tumahole',-26.9210,27.4410,'Manhole overflowing raw sewage onto the street. Terrible smell and health hazard.','critical','acknowledged','Water & Sanitation'),
  ('refuse','not-collected',12,'Heilbron','Sipho Radebe','+27821234505','15 Church Street, Heilbron',-27.2833,27.9667,'Refuse has not been collected for two weeks. Bins overflowing.','medium','new','Waste Management'),
  ('street-lights','not-working',10,'Koppies','Anna Botha','+27821234506','22 Voortrekker Street, Koppies',-27.2400,27.5800,'Three street lights not working on Voortrekker Street. Very dark at night, safety concern.','low','new','Electrical Services'),
  ('water','no-water',15,'Edenville','Mpho Nkosi','+27821234507','7 Main Road, Edenville',-27.5522,27.6975,'No water supply to entire street since yesterday morning.','high','in_progress','Water & Sanitation'),
  ('roads','pothole',4,'Parys','Karen Fourie','+27821234508','56 Bree Street, Parys',-26.9040,27.4600,'Another pothole further down Bree Street.','medium','resolved','Roads & Storm Water'),
  ('fire','grass-fire',8,'Vredefort','Piet Grobler','+27821234509','Outskirts of Vredefort',-27.0000,27.3667,'Grass fire spreading towards residential area. Wind is picking up.','critical','resolved','Fire & Rescue'),
  ('electricity','street-light',1,'Tumahole','Bongi Mahlangu','+27821234510','Zone 5, Tumahole',-26.9195,27.4405,'Street lights out in whole street.','low','new','Electrical Services'),
  ('illegal-dumping','general',7,'Tumahole','Sarah Mbeki','+27821234511','Open field, Zone 7',-26.9220,27.4390,'People dumping rubbish and rubble on the open field.','medium','acknowledged','Waste Management'),
  ('sewer','blockage',12,'Heilbron','Frans Nel','+27821234512','78 Kerk Street, Heilbron',-27.2830,27.9660,'Sewer blockage backing up into yard.','high','assigned','Water & Sanitation')
) d(cat, sub, ward, town, name, phone, addr, lat, lng, descr, pri, stat, dept);

-- Mark some resolved times
UPDATE public.complaints SET resolved_at = created_at + interval '2 days' WHERE status IN ('resolved','closed');
