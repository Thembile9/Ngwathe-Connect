-- ============ ROLES ============
create type public.app_role as enum ('admin','switchboard','supervisor','technician');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text not null default '',
  email text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create or replace function public.is_control_room(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','switchboard'))
$$;

alter table public.personnel add column if not exists user_id uuid unique;

create or replace function public.current_personnel_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.personnel where user_id = auth.uid() limit 1
$$;

create or replace function public.current_department()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select department from public.personnel where user_id = auth.uid() limit 1),
    (select department from public.profiles where user_id = auth.uid() limit 1)
  )
$$;

-- profiles policies
create policy "Users read own profile" on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_control_room(auth.uid()));
create policy "Users insert own profile" on public.profiles for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- user_roles policies (read only from client; grants happen server side)
create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_control_room(auth.uid()));

-- ============ AUDIT LOGS ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  entity_ref text,
  action text not null,
  actor_user_id uuid,
  actor_name text,
  department text,
  ward_id uuid references public.wards(id),
  status text,
  priority text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "Control room reads audit logs" on public.audit_logs for select to authenticated
  using (public.is_control_room(auth.uid()));
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create or replace function public.tg_audit_complaint()
returns trigger language plpgsql security definer set search_path = public as $$
declare diff jsonb := '{}'::jsonb;
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_logs(entity_type, entity_id, entity_ref, action, actor_user_id, actor_name, department, ward_id, status, priority, changes)
    values ('complaint', new.id, new.reference, 'created', auth.uid(), coalesce((select full_name from public.profiles where user_id = auth.uid()), 'Resident'), new.assigned_department, new.ward_id, new.status::text, new.priority::text,
      jsonb_build_object('channel', new.channel, 'resident_name', new.resident_name));
    return new;
  end if;
  if (new.status is distinct from old.status) then diff := diff || jsonb_build_object('status', jsonb_build_array(old.status, new.status)); end if;
  if (new.priority is distinct from old.priority) then diff := diff || jsonb_build_object('priority', jsonb_build_array(old.priority, new.priority)); end if;
  if (new.assigned_department is distinct from old.assigned_department) then diff := diff || jsonb_build_object('assigned_department', jsonb_build_array(old.assigned_department, new.assigned_department)); end if;
  if (new.assigned_official is distinct from old.assigned_official) then diff := diff || jsonb_build_object('assigned_official', jsonb_build_array(old.assigned_official, new.assigned_official)); end if;
  if diff = '{}'::jsonb then return new; end if;
  insert into public.audit_logs(entity_type, entity_id, entity_ref, action, actor_user_id, actor_name, department, ward_id, status, priority, changes)
  values ('complaint', new.id, new.reference, 'updated', auth.uid(), coalesce((select full_name from public.profiles where user_id = auth.uid()), 'System'), new.assigned_department, new.ward_id, new.status::text, new.priority::text, diff);
  return new;
end; $$;

create trigger audit_complaints_ins after insert on public.complaints for each row execute function public.tg_audit_complaint();
create trigger audit_complaints_upd after update on public.complaints for each row execute function public.tg_audit_complaint();

create or replace function public.tg_audit_job_card()
returns trigger language plpgsql security definer set search_path = public as $$
declare diff jsonb := '{}'::jsonb;
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_logs(entity_type, entity_id, entity_ref, action, actor_user_id, actor_name, department, ward_id, status, priority, changes)
    values ('job_card', new.id, new.job_number, 'created', auth.uid(), coalesce((select full_name from public.profiles where user_id = auth.uid()), 'System'), new.department, new.ward_id, new.status::text, new.priority::text,
      jsonb_build_object('title', new.title, 'assigned_to', new.assigned_to));
    return new;
  end if;
  if (new.status is distinct from old.status) then diff := diff || jsonb_build_object('status', jsonb_build_array(old.status, new.status)); end if;
  if (new.assigned_to is distinct from old.assigned_to) then diff := diff || jsonb_build_object('assigned_to', jsonb_build_array(old.assigned_to, new.assigned_to)); end if;
  if (new.priority is distinct from old.priority) then diff := diff || jsonb_build_object('priority', jsonb_build_array(old.priority, new.priority)); end if;
  if (new.department is distinct from old.department) then diff := diff || jsonb_build_object('department', jsonb_build_array(old.department, new.department)); end if;
  if (new.completion_notes is distinct from old.completion_notes) then diff := diff || jsonb_build_object('completion_notes', jsonb_build_array(old.completion_notes, new.completion_notes)); end if;
  if diff = '{}'::jsonb then return new; end if;
  insert into public.audit_logs(entity_type, entity_id, entity_ref, action, actor_user_id, actor_name, department, ward_id, status, priority, changes)
  values ('job_card', new.id, new.job_number, 'updated', auth.uid(), coalesce((select full_name from public.profiles where user_id = auth.uid()), 'System'), new.department, new.ward_id, new.status::text, new.priority::text, diff);
  return new;
end; $$;

create trigger audit_job_cards_ins after insert on public.job_cards for each row execute function public.tg_audit_job_card();
create trigger audit_job_cards_upd after update on public.job_cards for each row execute function public.tg_audit_job_card();

-- ============ LOCK DOWN EXISTING TABLES ============
-- complaints
drop policy if exists "Demo public read complaints" on public.complaints;
drop policy if exists "Demo public update complaints" on public.complaints;
drop policy if exists "Demo public insert complaints" on public.complaints;
revoke select, update on public.complaints from anon;
grant insert on public.complaints to anon;
grant select, insert, update on public.complaints to authenticated;

create policy "Residents may log complaints" on public.complaints for insert to anon, authenticated with check (true);
create policy "Control room reads complaints" on public.complaints for select to authenticated
  using (public.is_control_room(auth.uid()));
create policy "Department staff read their complaints" on public.complaints for select to authenticated
  using (
    public.has_role(auth.uid(),'supervisor') and assigned_department is not distinct from public.current_department()
  );
create policy "Technicians read complaints on their jobs" on public.complaints for select to authenticated
  using (
    public.has_role(auth.uid(),'technician')
    and exists (select 1 from public.job_cards j where j.complaint_id = complaints.id and j.assigned_to = public.current_personnel_id())
  );
create policy "Control room updates complaints" on public.complaints for update to authenticated
  using (public.is_control_room(auth.uid())) with check (public.is_control_room(auth.uid()));
create policy "Supervisors update department complaints" on public.complaints for update to authenticated
  using (public.has_role(auth.uid(),'supervisor') and assigned_department is not distinct from public.current_department())
  with check (public.has_role(auth.uid(),'supervisor'));

-- complaint_events
drop policy if exists "Demo public read events" on public.complaint_events;
drop policy if exists "Demo public insert events" on public.complaint_events;
revoke select on public.complaint_events from anon;
grant insert on public.complaint_events to anon;
grant select, insert on public.complaint_events to authenticated;
create policy "Log complaint events" on public.complaint_events for insert to anon, authenticated with check (true);
create policy "Staff read complaint events" on public.complaint_events for select to authenticated
  using (exists (select 1 from public.complaints c where c.id = complaint_events.complaint_id));

-- job_cards
drop policy if exists "Demo public manage job cards" on public.job_cards;
revoke all on public.job_cards from anon;
grant select, insert, update on public.job_cards to authenticated;
create policy "Control room reads job cards" on public.job_cards for select to authenticated
  using (public.is_control_room(auth.uid()));
create policy "Supervisors read department job cards" on public.job_cards for select to authenticated
  using (public.has_role(auth.uid(),'supervisor') and department is not distinct from public.current_department());
create policy "Technicians read own job cards" on public.job_cards for select to authenticated
  using (public.has_role(auth.uid(),'technician') and assigned_to = public.current_personnel_id());
create policy "Control room writes job cards" on public.job_cards for insert to authenticated
  with check (public.is_control_room(auth.uid()));
create policy "Control room updates job cards" on public.job_cards for update to authenticated
  using (public.is_control_room(auth.uid())) with check (public.is_control_room(auth.uid()));
create policy "Supervisors update department job cards" on public.job_cards for update to authenticated
  using (public.has_role(auth.uid(),'supervisor') and department is not distinct from public.current_department())
  with check (public.has_role(auth.uid(),'supervisor') and department is not distinct from public.current_department());
create policy "Technicians update own job cards" on public.job_cards for update to authenticated
  using (public.has_role(auth.uid(),'technician') and assigned_to = public.current_personnel_id())
  with check (public.has_role(auth.uid(),'technician') and assigned_to = public.current_personnel_id());

-- job_card_events
drop policy if exists "Demo public read job events" on public.job_card_events;
drop policy if exists "Demo public insert job events" on public.job_card_events;
revoke all on public.job_card_events from anon;
grant select, insert on public.job_card_events to authenticated;
create policy "Staff read job events" on public.job_card_events for select to authenticated
  using (exists (select 1 from public.job_cards j where j.id = job_card_events.job_card_id));
create policy "Staff log job events" on public.job_card_events for insert to authenticated
  with check (exists (select 1 from public.job_cards j where j.id = job_card_events.job_card_id));

-- personnel
drop policy if exists "Demo public manage personnel" on public.personnel;
revoke all on public.personnel from anon;
grant select, insert, update on public.personnel to authenticated;
create policy "Staff read personnel" on public.personnel for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "Control room writes personnel" on public.personnel for insert to authenticated
  with check (public.is_control_room(auth.uid()));
create policy "Control room updates personnel" on public.personnel for update to authenticated
  using (public.is_control_room(auth.uid())) with check (public.is_control_room(auth.uid()));

-- notices
drop policy if exists "Demo public manage notices" on public.notices;
revoke all on public.notices from anon;
grant select on public.notices to anon;
grant select, insert, update, delete on public.notices to authenticated;
create policy "Staff read all notices" on public.notices for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "Control room writes notices" on public.notices for insert to authenticated
  with check (public.is_control_room(auth.uid()));
create policy "Control room updates notices" on public.notices for update to authenticated
  using (public.is_control_room(auth.uid())) with check (public.is_control_room(auth.uid()));
create policy "Control room deletes notices" on public.notices for delete to authenticated
  using (public.is_control_room(auth.uid()));

-- subscriptions
drop policy if exists "Demo public manage subs" on public.subscriptions;
revoke all on public.subscriptions from anon;
grant insert on public.subscriptions to anon;
grant select, insert on public.subscriptions to authenticated;
create policy "Anyone may subscribe" on public.subscriptions for insert to anon, authenticated with check (true);
create policy "Control room reads subscriptions" on public.subscriptions for select to authenticated
  using (public.is_control_room(auth.uid()));

-- updated_at triggers
create trigger profiles_updated_at before update on public.profiles for each row execute function public.tg_set_updated_at();

-- bootstrap: first staff account becomes admin
create or replace function public.claim_bootstrap_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin') on conflict do nothing;
  return true;
end; $$;
revoke all on function public.claim_bootstrap_admin() from public;
grant execute on function public.claim_bootstrap_admin() to authenticated;