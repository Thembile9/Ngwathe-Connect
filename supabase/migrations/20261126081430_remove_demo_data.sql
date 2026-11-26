BEGIN;

-- Remove known sample complaints.
DELETE FROM public.complaints
WHERE resident_user_id IS NULL
AND (resident_name, resident_phone, description) IN (
    ('Thabo Mokoena', '+27821234501',
     'Large pipe burst on Bree Street flooding the road. Water gushing out for over an hour.'),
    ('Nomsa Dlamini', '+27821234502',
     'Entire section of Zone 3 has been without electricity since 6am this morning.'),
    ('Johan van der Merwe', '+27821234503',
     'Massive pothole damaging vehicles. Approximately 1m wide and 30cm deep.'),
    ('Lerato Khumalo', '+26821234504',
     'Manhole overflowing raw sewage onto the street. Terrible smell and health hazard.'),
    ('Sipho Radebe', '+27821234505',
     'Refuse has not been collected for two weeks. Bins overflowing.'),
    ('Anna Botha', '+27821234506',
     'Three street lights not working on Voortrekker Street. Very dark at night, safety concern.'),
    ('Mpho Nkosi', '+27821234507',
     'No water supply to entire street since yesterday morning.'),
    ('Karen Fourie', '+27821234508',
     'Another pothole further down Bree Street.'),
    ('Piet Grobler', '+27821234509',
     'Grass fire spreading towards residential area. Wind is picking up.'),
    ('Bongi Mahlangu', '+27821234510',
     'Street lights out in whole street.'),
    ('Sarah Mbeki', '+27821234511',
     'People dumping rubbish and rubble on the open field.'),
    ('Frans Nel', '+27821234512',
     'Sewer blockage backing up into yard.')
);

-- Remove known demonstration personnel.
DELETE FROM public.personnel
WHERE (full_name, phone) IN (
    ('Thabo Mokoena', '+27 82 555 0101'),
    ('Sipho Radebe', '+27 82 555 0102'),
    ('Johan van Wyk', '+27 82 555 0103'),
    ('Lerato Dlamini', '+27 82 555 0104'),
    ('Pieter Botha', '+27 82 555 0105'),
    ('Nomsa Khumalo', '+27 82 555 0106'),
    ('Andile Zwane', '+27 82 555 0107'),
    ('Maria Sithole', '+27 82 555 0108'),
    ('Kabelo Motaung', '+27 82 555 0109'),
    ('Dineo Phiri', '+27 82 555 0110')
)
AND email IS NULL;

-- Remove the four known sample notices.
DELETE FROM public.notices
WHERE (title, body) IN (
    (
        'Scheduled Water Interruption - Parys CBD',
        'Water supply to Parys CBD will be interrupted on Saturday 08:00 - 14:00 for planned maintenance on the main reservoir line. Please store water in advance.'
    ),
    (
        'Load Reduction Schedule - Tumahole',
        'Eskom load reduction will be implemented in Tumahole between 05:00-09:00 and 17:00-21:00 due to high demand. Please conserve electricity.'
    ),
    (
        'Council Meeting - Public Participation',
        'The Ngwathe Local Municipality Council meeting will be held on 25 November 2026 at 10:00 at the Council Chambers, Parys. Members of the public are welcome.'
    ),
    (
        'Refuse Collection - Public Holiday',
        'Refuse collection scheduled for Monday will be moved to Tuesday due to the public holiday. Please put out bins by 06:00 on Tuesday.'
    )
);

-- Remove only the identified orphaned profile.
DELETE FROM public.profiles p
WHERE p.id = '85937a34-a802-4679-9b21-5efe5bd41939'
AND NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p.user_id
);

-- Remove unrestricted demo access
DROP POLICY IF EXISTS "Demo public read job events"
ON public.job_card_events;
COMMIT;
