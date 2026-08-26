-- Ensure registration tables match the expected admin/register schema.

alter table if exists registrations
  add column if not exists submitted_at timestamptz not null default now();

alter table if exists event_registrations
  add column if not exists event_category text,
  add column if not exists event_mode text,
  add column if not exists created_at timestamptz not null default now();

alter table if exists participants
  add column if not exists participant_no int;

-- Backfill participant numbers when missing.
with numbered as (
  select
    id,
    row_number() over (
      partition by event_registration_id
      order by id
    ) as rn
  from participants
  where participant_no is null
)
update participants p
set participant_no = numbered.rn
from numbered
where p.id = numbered.id;

alter table if exists participants
  alter column participant_no set not null;
