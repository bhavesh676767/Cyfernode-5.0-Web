-- Cyfernode 5.0 event registrations

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  registration_id text not null unique,
  mode text not null check (mode in ('single', 'multi')),
  submitted_at timestamptz not null default now()
);

create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  event_id text not null,
  event_name text not null,
  event_category text,
  event_mode text,
  school_name text not null,
  teacher_name text not null,
  teacher_phone text not null,
  teacher_email text not null,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  event_registration_id uuid not null references event_registrations(id) on delete cascade,
  participant_no int not null,
  name text not null,
  email text not null,
  phone text not null,
  grade text not null
);

create index if not exists idx_event_registrations_registration_id
  on event_registrations(registration_id);

create index if not exists idx_participants_event_registration_id
  on participants(event_registration_id);

alter table registrations enable row level security;
alter table event_registrations enable row level security;
alter table participants enable row level security;

-- No public policies: inserts go through the register Edge Function (service role).
