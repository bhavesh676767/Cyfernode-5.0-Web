-- ─────────────────────────────────────────────────────────────────────────────
-- Clue-Less: Device tracking (max 2 per school) + teamname + active columns
-- Migration: 20260927010000_clueless_devices_teamname.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add `teamname` and `active` columns to clue_less_teams ─────────────────
-- `teamname` : friendly display name the team enters at registration (pulled from event_registrations.team_name)
-- `active`   : count of currently-online devices for this school code (updated by heartbeat)

alter table clue_less_teams
  add column if not exists teamname text,          -- friendly team display name (shown in leaderboard)
  add column if not exists active   integer not null default 0; -- realtime active device count

-- ── 2. Device registry table ──────────────────────────────────────────────────
-- Tracks the unique device IDs that have authenticated for each school.
-- Enforces a hard cap of 2 devices per school_code.

create table if not exists clue_less_devices (
  id            uuid        primary key default gen_random_uuid(),
  school_code   text        not null,
  device_id     text        not null,          -- crypto.randomUUID() stored in client localStorage
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (school_code, device_id)
);

create index if not exists idx_clue_less_devices_school
  on clue_less_devices (school_code);

-- ── 3. RLS for clue_less_devices ──────────────────────────────────────────────
alter table clue_less_devices enable row level security;

-- Public can read (needed to check device count on client — optional, keep locked if preferred)
-- Only service_role can write (via Edge Function)
drop policy if exists "Service role full access devices" on clue_less_devices;
create policy "Service role full access devices"
  on clue_less_devices for all to service_role using (true);

-- ── 4. RLS for the new columns on clue_less_teams ────────────────────────────
-- clue_less_teams already has RLS; no new policy needed for the extra columns
-- because existing policies cover all columns of the table.

-- ── 5. Grant read access ──────────────────────────────────────────────────────
grant select on clue_less_devices to anon, authenticated;
