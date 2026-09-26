-- ==============================================================================
-- Cyfernode 5.0 - Clue-Less Realtime Database & Auth Setup
-- Run this entire script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Clue-Less Teams (Realtime Table for Logged-in Schools and Scores)
create table if not exists public.clue_less_teams (
  id uuid primary key default gen_random_uuid(),
  school_code text not null unique,
  school_name text not null,
  email text not null,
  user_name text not null default '',
  role text not null default 'student',
  logged_in boolean not null default true,
  score int not null default 0,
  current_level text not null default 'whistle-podu',
  levels_completed text[] not null default '{}',
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_clue_less_teams_school_code on public.clue_less_teams (school_code);
create index if not exists idx_clue_less_teams_score on public.clue_less_teams (score desc);
create index if not exists idx_clue_less_teams_last_active on public.clue_less_teams (last_active_at desc);

-- 2. Clue-Less Sessions (For Persistent Browser Authentication)
create table if not exists public.clue_less_sessions (
  id uuid primary key default gen_random_uuid(),
  school_code text not null,
  email text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_clue_less_sessions_token_hash on public.clue_less_sessions (token_hash);

-- 3. Clue-Less Verification Attempts (Rate Limiting & Lockouts)
create table if not exists public.clue_less_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  school_code text not null,
  email text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_code, email)
);

-- 4. Enable Supabase Realtime for clue_less_teams
alter table public.clue_less_teams replica identity full;

-- Check and add to supabase_realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'clue_less_teams'
  ) then
    alter publication supabase_realtime add table public.clue_less_teams;
  end if;
end $$;

-- 5. Row Level Security (RLS)
alter table public.clue_less_teams enable row level security;
alter table public.clue_less_sessions enable row level security;
alter table public.clue_less_verification_attempts enable row level security;

-- Public can read clue_less_teams (for Realtime Leaderboard and active schools tab)
drop policy if exists "Allow public read on clue_less_teams" on public.clue_less_teams;
create policy "Allow public read on clue_less_teams"
  on public.clue_less_teams for select
  using (true);

-- Service Role full access
drop policy if exists "Allow service role full access on clue_less_teams" on public.clue_less_teams;
create policy "Allow service role full access on clue_less_teams"
  on public.clue_less_teams for all
  using (auth.role() = 'service_role');

drop policy if exists "Allow service role full access on clue_less_sessions" on public.clue_less_sessions;
create policy "Allow service role full access on clue_less_sessions"
  on public.clue_less_sessions for all
  using (auth.role() = 'service_role');

drop policy if exists "Allow service role full access on clue_less_verification_attempts" on public.clue_less_verification_attempts;
create policy "Allow service role full access on clue_less_verification_attempts"
  on public.clue_less_verification_attempts for all
  using (auth.role() = 'service_role');

-- ==============================================================================
-- Optional helper function to update scores easily from SQL or admin dashboard:
-- Example: select update_clueless_score('CYN01', 100, 'swarm');
-- ==============================================================================
create or replace function public.update_clueless_score(
  p_school_code text,
  p_score int,
  p_current_level text default null
) returns void as $$
begin
  update public.clue_less_teams
  set
    score = p_score,
    current_level = coalesce(p_current_level, current_level),
    last_active_at = now(),
    updated_at = now()
  where school_code = p_school_code;
end;
$$ language plpgsql security definer;
