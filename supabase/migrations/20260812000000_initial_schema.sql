-- Initial Migration for Martial Arts Weapons Management PWA

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Handle new user trigger function
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2. User permissions table
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module text not null check (module in ('user_management','inventory_management','issue_management','issue_notifications')),
  can_view boolean not null default false,
  can_manage boolean not null default false,
  granted_by uuid references public.profiles(id),
  updated_at timestamptz default now(),
  unique (user_id, module)
);

-- 3. Students table
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  added_by uuid references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists idx_students_name on public.students(name);

-- 4. Weapons table
create table if not exists public.weapons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  serial_or_tag text,
  acquired_date date,
  photo_url text,
  current_condition text not null default 'good'
    check (current_condition in ('excellent','good','fair','poor','damaged','retired')),
  status text not null default 'available'
    check (status in ('available','issued','under_repair','retired')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_weapons_status on public.weapons(status);
create index if not exists idx_weapons_category on public.weapons(category);

-- 5. Weapon issues table
create table if not exists public.weapon_issues (
  id uuid primary key default gen_random_uuid(),
  weapon_id uuid not null references public.weapons(id),
  student_id uuid not null references public.students(id),
  issued_by uuid not null references public.profiles(id),
  purpose text,
  issue_date date not null default current_date,
  expected_return_date date not null,
  actual_return_date date,
  condition_on_issue text not null,
  condition_on_return text,
  return_notes text,
  received_by uuid references public.profiles(id),
  status text not null default 'issued'
    check (status in ('issued','returned','overdue','lost')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_return_date check (actual_return_date is null or actual_return_date >= issue_date),
  constraint valid_expected_date check (expected_return_date >= issue_date)
);
create index if not exists idx_weapon_issues_weapon_id on public.weapon_issues(weapon_id);
create index if not exists idx_weapon_issues_student_id on public.weapon_issues(student_id);
create index if not exists idx_weapon_issues_status on public.weapon_issues(status);
create index if not exists idx_weapon_issues_expected_return_date on public.weapon_issues(expected_return_date);

-- 6. Weapon condition logs table
create table if not exists public.weapon_condition_logs (
  id uuid primary key default gen_random_uuid(),
  weapon_id uuid not null references public.weapons(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id),
  condition text not null check (condition in ('excellent','good','fair','poor','damaged','retired')),
  note text,
  related_issue_id uuid references public.weapon_issues(id),
  created_at timestamptz default now()
);

-- Trigger: keep weapons.status and current_condition in sync
create or replace function public.sync_weapon_status() returns trigger as $$
begin
  if new.status = 'issued' and new.actual_return_date is null then
    update public.weapons set status = 'issued', updated_at = now() where id = new.weapon_id;
  elsif new.actual_return_date is not null then
    update public.weapons set status = 'available',
      current_condition = coalesce(new.condition_on_return, current_condition),
      updated_at = now()
    where id = new.weapon_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_weapon_status on public.weapon_issues;
create trigger trg_sync_weapon_status
after insert or update on public.weapon_issues
for each row execute function public.sync_weapon_status();

-- 7. Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  weapon_issue_id uuid references public.weapon_issues(id),
  type text not null check (type in ('due_soon','overdue')),
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user_is_read on public.notifications(user_id, is_read);

-- 8. ABAC Helper function
create or replace function public.has_permission(p_module text, p_level text) returns boolean as $$
  select
    exists (select 1 from public.profiles where id = auth.uid() and is_admin and is_active)
    or exists (
      select 1 from public.user_permissions up
      join public.profiles p on p.id = up.user_id
      where up.user_id = auth.uid()
        and up.module = p_module
        and p.is_active
        and (
          (p_level = 'view' and (up.can_view or up.can_manage))
          or (p_level = 'manage' and up.can_manage)
        )
    );
$$ language sql stable security definer;

-- 9. Row Level Security Policies
alter table public.profiles enable row level security;
alter table public.user_permissions enable row level security;
alter table public.students enable row level security;
alter table public.weapons enable row level security;
alter table public.weapon_issues enable row level security;
alter table public.weapon_condition_logs enable row level security;
alter table public.notifications enable row level security;

-- Profiles Policies
drop policy if exists "allow authenticated users to select profiles" on public.profiles;
create policy "allow authenticated users to select profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "allow users to update own profile" on public.profiles;
create policy "allow users to update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "allow user management to manage profiles" on public.profiles;
create policy "allow user management to manage profiles" on public.profiles
  for all using (public.has_permission('user_management', 'manage'))
  with check (public.has_permission('user_management', 'manage'));

-- User Permissions Policies
drop policy if exists "view user permissions" on public.user_permissions;
create policy "view user permissions" on public.user_permissions
  for select using (user_id = auth.uid() or public.has_permission('user_management', 'view'));

drop policy if exists "manage user permissions" on public.user_permissions;
create policy "manage user permissions" on public.user_permissions
  for all using (public.has_permission('user_management', 'manage'))
  with check (public.has_permission('user_management', 'manage'));

-- Weapons Policies
drop policy if exists "view weapons" on public.weapons;
create policy "view weapons" on public.weapons
  for select using (public.has_permission('inventory_management', 'view'));

drop policy if exists "manage weapons" on public.weapons;
create policy "manage weapons" on public.weapons
  for all using (public.has_permission('inventory_management', 'manage'))
  with check (public.has_permission('inventory_management', 'manage'));

-- Students Policies
drop policy if exists "view students" on public.students;
create policy "view students" on public.students
  for select using (public.has_permission('issue_management', 'view'));

drop policy if exists "manage students" on public.students;
create policy "manage students" on public.students
  for all using (public.has_permission('issue_management', 'manage'))
  with check (public.has_permission('issue_management', 'manage'));

-- Weapon Issues Policies
drop policy if exists "view weapon issues" on public.weapon_issues;
create policy "view weapon issues" on public.weapon_issues
  for select using (public.has_permission('issue_management', 'view'));

drop policy if exists "manage weapon issues" on public.weapon_issues;
create policy "manage weapon issues" on public.weapon_issues
  for all using (public.has_permission('issue_management', 'manage'))
  with check (public.has_permission('issue_management', 'manage'));

-- Weapon Condition Logs Policies
drop policy if exists "view weapon condition logs" on public.weapon_condition_logs;
create policy "view weapon condition logs" on public.weapon_condition_logs
  for select using (public.has_permission('issue_management', 'view') or public.has_permission('inventory_management', 'view'));

drop policy if exists "manage weapon condition logs" on public.weapon_condition_logs;
create policy "manage weapon condition logs" on public.weapon_condition_logs
  for all using (public.has_permission('issue_management', 'manage') or public.has_permission('inventory_management', 'manage'))
  with check (public.has_permission('issue_management', 'manage') or public.has_permission('inventory_management', 'manage'));

-- Notifications Policies
drop policy if exists "read notifications" on public.notifications;
create policy "read notifications" on public.notifications for select
  using (user_id = auth.uid() or public.has_permission('issue_notifications', 'view'));

drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 10. Storage setup for weapon-photos
insert into storage.buckets (id, name, public)
values ('weapon-photos', 'weapon-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public Read Weapon Photos" on storage.objects;
create policy "Public Read Weapon Photos" on storage.objects
  for select using (bucket_id = 'weapon-photos');

drop policy if exists "Authenticated Upload Weapon Photos" on storage.objects;
create policy "Authenticated Upload Weapon Photos" on storage.objects
  for insert with check (bucket_id = 'weapon-photos' and public.has_permission('inventory_management', 'manage'));

drop policy if exists "Authenticated Manage Weapon Photos" on storage.objects;
create policy "Authenticated Manage Weapon Photos" on storage.objects
  for update using (bucket_id = 'weapon-photos' and public.has_permission('inventory_management', 'manage'));

-- 11. Reminder Generation Function
create or replace function public.generate_weapon_reminders() returns void as $$
declare
  issue record;
  msg text;
  n_type text;
begin
  -- Process due soon (expected_return_date between current_date and current_date + 2 days)
  for issue in
    select wi.id, wi.issued_by, wi.expected_return_date, w.name as weapon_name, s.name as student_name
    from public.weapon_issues wi
    join public.weapons w on w.id = wi.weapon_id
    join public.students s on s.id = wi.student_id
    where wi.status = 'issued'
      and wi.expected_return_date >= current_date
      and wi.expected_return_date <= current_date + interval '2 days'
  loop
    msg := 'Weapon "' || issue.weapon_name || '" issued to ' || issue.student_name || ' is due on ' || issue.expected_return_date || '.';
    n_type := 'due_soon';
    
    insert into public.notifications (user_id, weapon_issue_id, type, message)
    select issue.issued_by, issue.id, n_type, msg
    where not exists (
      select 1 from public.notifications 
      where weapon_issue_id = issue.id and type = n_type
    );
  end loop;

  -- Process overdue (expected_return_date < current_date)
  for issue in
    select wi.id, wi.issued_by, wi.expected_return_date, w.name as weapon_name, s.name as student_name
    from public.weapon_issues wi
    join public.weapons w on w.id = wi.weapon_id
    join public.students s on s.id = wi.student_id
    where wi.status in ('issued', 'overdue')
      and wi.expected_return_date < current_date
  loop
    msg := 'OVERDUE: Weapon "' || issue.weapon_name || '" issued to ' || issue.student_name || ' was due on ' || issue.expected_return_date || '.';
    n_type := 'overdue';

    -- Update issue status to overdue
    update public.weapon_issues set status = 'overdue', updated_at = now() where id = issue.id;

    insert into public.notifications (user_id, weapon_issue_id, type, message)
    select issue.issued_by, issue.id, n_type, msg
    where not exists (
      select 1 from public.notifications 
      where weapon_issue_id = issue.id and type = n_type
    );
  end loop;
end;
$$ language plpgsql security definer;
