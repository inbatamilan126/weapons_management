-- Migration: Updated Weapon Reminders with Due Today & Daily Overdue Notifications at 9 AM

-- 1. Update notifications table type constraint to include 'due_today'
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('due_soon', 'due_today', 'overdue'));

-- 2. Updated generate_weapon_reminders function
create or replace function public.generate_weapon_reminders() returns void as $$
declare
  issue record;
  msg text;
  n_type text;
  items_summary text;
begin
  -- A. DUE SOON (1 to 2 days before expected_return_date)
  for issue in
    select wi.id, wi.issued_by, wi.expected_return_date, s.name as student_name
    from public.weapon_issues wi
    join public.students s on s.id = wi.student_id
    where wi.status in ('issued', 'partially_returned')
      and wi.expected_return_date = current_date + interval '1 day'
  loop
    -- Build items summary for multi-weapon issue
    select string_agg(w.name || ' (x' || wii.quantity_issued || ')', ', ')
    into items_summary
    from public.weapon_issue_items wii
    join public.weapons w on w.id = wii.weapon_id
    where wii.issue_id = issue.id;

    msg := 'DUE SOON: Weapons [' || coalesce(items_summary, 'Weapon') || '] issued to ' || issue.student_name || ' are due tomorrow (' || issue.expected_return_date || ').';
    n_type := 'due_soon';

    insert into public.notifications (user_id, weapon_issue_id, type, message)
    select issue.issued_by, issue.id, n_type, msg
    where not exists (
      select 1 from public.notifications
      where weapon_issue_id = issue.id and type = n_type and created_at::date = current_date
    );
  end loop;

  -- B. DUE TODAY (Collect weapons today on expected_return_date)
  for issue in
    select wi.id, wi.issued_by, wi.expected_return_date, s.name as student_name
    from public.weapon_issues wi
    join public.students s on s.id = wi.student_id
    where wi.status in ('issued', 'partially_returned')
      and wi.expected_return_date = current_date
  loop
    select string_agg(w.name || ' (x' || wii.quantity_issued || ')', ', ')
    into items_summary
    from public.weapon_issue_items wii
    join public.weapons w on w.id = wii.weapon_id
    where wii.issue_id = issue.id;

    msg := 'COLLECT TODAY: Weapons [' || coalesce(items_summary, 'Weapon') || '] issued to ' || issue.student_name || ' are due for return today!';
    n_type := 'due_today';

    insert into public.notifications (user_id, weapon_issue_id, type, message)
    select issue.issued_by, issue.id, n_type, msg
    where not exists (
      select 1 from public.notifications
      where weapon_issue_id = issue.id and type = n_type and created_at::date = current_date
    );
  end loop;

  -- C. OVERDUE (Triggers DAILY every morning at 9 AM until fully returned)
  for issue in
    select wi.id, wi.issued_by, wi.expected_return_date, s.name as student_name
    from public.weapon_issues wi
    join public.students s on s.id = wi.student_id
    where wi.status in ('issued', 'partially_returned', 'overdue')
      and wi.expected_return_date < current_date
  loop
    -- Update issue status to overdue
    update public.weapon_issues set status = 'overdue', updated_at = now() where id = issue.id;

    select string_agg(w.name || ' (x' || wii.quantity_issued || ')', ', ')
    into items_summary
    from public.weapon_issue_items wii
    join public.weapons w on w.id = wii.weapon_id
    where wii.issue_id = issue.id;

    msg := 'OVERDUE DAILY REMINDER: Weapons [' || coalesce(items_summary, 'Weapon') || '] issued to ' || issue.student_name || ' were due on ' || issue.expected_return_date || '. Please collect them immediately!';
    n_type := 'overdue';

    -- Inserts daily overdue notification (one per day until returned)
    insert into public.notifications (user_id, weapon_issue_id, type, message)
    select issue.issued_by, issue.id, n_type, msg
    where not exists (
      select 1 from public.notifications
      where weapon_issue_id = issue.id and type = n_type and created_at::date = current_date
    );
  end loop;
end;
$$ language plpgsql security definer;

-- 3. Enable pg_cron schedule at 9:00 AM daily if pg_cron extension is enabled
create extension if not exists pg_cron;

select cron.unschedule('daily-weapon-reminders-9am') where exists (
  select 1 from cron.job where jobname = 'daily-weapon-reminders-9am'
);

select cron.schedule(
  'daily-weapon-reminders-9am',
  '0 9 * * *',
  $$ select public.generate_weapon_reminders(); $$
);
