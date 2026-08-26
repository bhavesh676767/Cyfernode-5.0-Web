-- Unique school codes (CYN01, CYN02, …) assigned once per school name.

create sequence if not exists school_code_seq;

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  school_name_key text not null unique,
  school_code text not null unique,
  code_num int not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_schools_code on schools (school_code);

alter table schools enable row level security;

alter table event_registrations
  add column if not exists school_code text;

-- Backfill schools from existing registrations (ordered by first appearance).
with ranked as (
  select
    trim(school_name) as school_name,
    lower(trim(regexp_replace(school_name, '\s+', ' ', 'g'))) as school_name_key,
    min(created_at) as first_seen
  from event_registrations
  where school_name is not null and trim(school_name) <> ''
  group by 1, 2
),
numbered as (
  select
    school_name,
    school_name_key,
    row_number() over (order by first_seen, school_name_key) as rn
  from ranked
)
insert into schools (school_name, school_name_key, school_code, code_num)
select
  school_name,
  school_name_key,
  'CYN' || lpad(rn::text, 2, '0'),
  rn::int
from numbered
on conflict (school_name_key) do nothing;

select setval(
  'school_code_seq',
  coalesce((select max(code_num) from schools), 0),
  coalesce((select max(code_num) from schools), 0) > 0
);

update event_registrations er
set school_code = s.school_code
from schools s
where lower(trim(regexp_replace(er.school_name, '\s+', ' ', 'g'))) = s.school_name_key
  and (er.school_code is null or er.school_code = '');

create index if not exists idx_event_registrations_school_code
  on event_registrations (school_code);
