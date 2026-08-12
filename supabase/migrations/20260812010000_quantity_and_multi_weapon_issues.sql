-- Migration for Bulk Quantity Inventory & Multi-Weapon Checkout System

-- 1. Alter weapons table for bulk / quantity tracking
alter table public.weapons
  add column if not exists tracking_type text not null default 'bulk' check (tracking_type in ('bulk', 'individual')),
  add column if not exists total_quantity integer not null default 1 check (total_quantity >= 0),
  add column if not exists available_quantity integer not null default 1 check (available_quantity >= 0 and available_quantity <= total_quantity);

-- 2. Modify weapon_issues table (Parent issue session)
alter table public.weapon_issues
  drop constraint if exists weapon_issues_weapon_id_fkey,
  alter column weapon_id drop not null,
  alter column condition_on_issue drop not null;

alter table public.weapon_issues
  drop constraint if exists weapon_issues_status_check;

alter table public.weapon_issues
  add constraint weapon_issues_status_check
  check (status in ('issued', 'partially_returned', 'returned', 'overdue', 'lost'));

-- 3. Create weapon_issue_items table (Child line items for multi-weapon checkouts)
create table if not exists public.weapon_issue_items (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.weapon_issues(id) on delete cascade,
  weapon_id uuid not null references public.weapons(id),
  quantity_issued integer not null check (quantity_issued > 0),
  quantity_returned integer not null default 0 check (quantity_returned >= 0 and quantity_returned <= quantity_issued),
  condition_on_issue text not null default 'good',
  condition_on_return_breakdown jsonb,
  status text not null default 'issued' check (status in ('issued', 'partially_returned', 'returned', 'lost')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_weapon_issue_items_issue_id on public.weapon_issue_items(issue_id);
create index if not exists idx_weapon_issue_items_weapon_id on public.weapon_issue_items(weapon_id);

-- 4. Update weapon_condition_logs to record quantity
alter table public.weapon_condition_logs
  add column if not exists quantity integer not null default 1;

-- 5. Trigger function to handle stock decrement on issue line item creation and increment on return
create or replace function public.sync_weapon_issue_item_stock() returns trigger as $$
declare
  good_ret int := 0;
  fair_ret int := 0;
  poor_ret int := 0;
  damaged_ret int := 0;
  delta_returned int := 0;
  parent_issue_id uuid;
begin
  if (TG_OP = 'INSERT') then
    -- Decrement available stock
    update public.weapons
    set available_quantity = greatest(0, available_quantity - new.quantity_issued),
        updated_at = now()
    where id = new.weapon_id;
    
    return new;
  elsif (TG_OP = 'UPDATE') then
    delta_returned := new.quantity_returned - old.quantity_returned;

    if delta_returned > 0 then
      if new.condition_on_return_breakdown is not null then
        damaged_ret := coalesce((new.condition_on_return_breakdown->>'damaged')::int, 0);
      end if;

      -- Usable items returned go back to available_quantity
      -- Damaged items reduce total_quantity
      update public.weapons
      set available_quantity = least(total_quantity, available_quantity + delta_returned - damaged_ret),
          total_quantity = greatest(0, total_quantity - damaged_ret),
          updated_at = now()
      where id = new.weapon_id;
    end if;

    -- Update line item status
    if new.quantity_returned = new.quantity_issued then
      new.status := 'returned';
    elsif new.quantity_returned > 0 then
      new.status := 'partially_returned';
    end if;

    -- Update parent weapon_issues status
    parent_issue_id := new.issue_id;
    
    perform 1 from public.weapon_issue_items
    where issue_id = parent_issue_id and quantity_returned < quantity_issued and id != new.id;
    
    if not found and new.quantity_returned = new.quantity_issued then
      update public.weapon_issues
      set status = 'returned', actual_return_date = current_date, updated_at = now()
      where id = parent_issue_id;
    else
      update public.weapon_issues
      set status = 'partially_returned', updated_at = now()
      where id = parent_issue_id;
    end if;

    return new;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_weapon_issue_item_stock on public.weapon_issue_items;
create trigger trg_sync_weapon_issue_item_stock
before insert or update on public.weapon_issue_items
for each row execute function public.sync_weapon_issue_item_stock();

-- 6. Enable RLS on weapon_issue_items
alter table public.weapon_issue_items enable row level security;

drop policy if exists "view weapon issue items" on public.weapon_issue_items;
create policy "view weapon issue items" on public.weapon_issue_items
  for select using (public.has_permission('issue_management', 'view'));

drop policy if exists "manage weapon issue items" on public.weapon_issue_items;
create policy "manage weapon issue items" on public.weapon_issue_items
  for all using (public.has_permission('issue_management', 'manage'))
  with check (public.has_permission('issue_management', 'manage'));
