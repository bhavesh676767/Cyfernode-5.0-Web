-- ==============================================================================
-- Cyfernode 5.0 - Clue-Less Wave 2 Clean Reset & Official Leaderboard Table
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Create dedicated leaderboard table with time-tracking
create table if not exists public.clue_less_leaderboard (
  id uuid primary key default gen_random_uuid(),
  school_code text not null unique,
  school_name text not null,
  team_name text,
  participant_name text,
  role text default 'student',
  score int not null default 0 check (score >= 0),
  levels_solved int not null default 0 check (levels_solved >= 0),
  last_level_cleared text,
  last_solve_time timestamptz,       -- Exact timestamp of most recent point-scoring solve
  last_active_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was already created
alter table public.clue_less_leaderboard 
  add column if not exists last_solve_time timestamptz;

-- Index for instant rank ordering: highest score first, then earliest solve time (tie-breaker)
create index if not exists idx_clue_less_leaderboard_rank 
  on public.clue_less_leaderboard (score desc, last_solve_time asc nulls last);

-- 2. Realtime Publication
alter table public.clue_less_leaderboard replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'clue_less_leaderboard'
  ) then
    alter publication supabase_realtime add table public.clue_less_leaderboard;
  end if;
end $$;

-- 3. Row Level Security (RLS) - Read-only for Public/Anon, Mutations restricted to Service Role
alter table public.clue_less_leaderboard enable row level security;

-- Public/Anon can only SELECT (view leaderboard)
drop policy if exists "Allow public read on clue_less_leaderboard" on public.clue_less_leaderboard;
create policy "Allow public read on clue_less_leaderboard"
  on public.clue_less_leaderboard for select
  to anon, authenticated
  using (true);

-- Only Service Role can insert / update / delete
drop policy if exists "Allow service role full access on clue_less_leaderboard" on public.clue_less_leaderboard;
create policy "Allow service role full access on clue_less_leaderboard"
  on public.clue_less_leaderboard for all
  to service_role
  using (true)
  with check (true);

-- Revoke write privileges from public & anon
revoke insert, update, delete, truncate on table public.clue_less_leaderboard from anon, authenticated, public;

-- 4. CRITICAL SECURITY: Enforce Monotonic Scores via Trigger (Points can NEVER be lost once claimed)
create or replace function public.enforce_monotonic_score()
returns trigger language plpgsql as $$
begin
  -- Score can NEVER decrease once claimed
  if new.score < old.score then
    new.score := old.score;
  end if;
  -- Solves count can NEVER decrease
  if new.levels_solved < old.levels_solved then
    new.levels_solved := old.levels_solved;
  end if;
  -- If score increased, record timestamp
  if new.score > old.score and new.last_solve_time is null then
    new.last_solve_time := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_monotonic_score on public.clue_less_leaderboard;
create trigger trg_enforce_monotonic_score
  before update on public.clue_less_leaderboard
  for each row execute function public.enforce_monotonic_score();

-- 5. Wave 2 Clean Reset: Seed all teams with 0 points and NULL solve times
insert into public.clue_less_leaderboard (
  school_code, school_name, team_name, participant_name, role, score, levels_solved, last_level_cleared, last_solve_time, last_active_at
) values
  ('CYN23', 'Maharaja Aggarsain Adarsh Public School', 'Maharaja Aggarsain Adarsh Public School', 'Bhavya Aggarwal', 'student', 0, 0, null, null, now()),
  ('CYN38', 'Sanskriti School', 'Sanskriti School', 'Ms Punita Ahuja', 'teacher_in_charge', 0, 0, null, null, now()),
  ('CYN39', 'colonel''s central academy', 'colonel''s central academy', 'Tripti', 'teacher_in_charge', 0, 0, null, null, now()),
  ('CYN33', 'Amity International School, Sector-46, Gurugram, Haryana', 'Amity International School, Sector-46, Gurugram, Haryana', 'Medhansh Jain', 'student', 0, 0, null, null, now()),
  ('CYN21', 'ST.MARY''S PUBLIC SCHOOL', 'ST.MARY''S PUBLIC SCHOOL', 'RITU KAUSHIK', 'teacher_in_charge', 0, 0, null, null, now()),
  ('CYN20', 'CM Shri, Kalkaji', 'CM Shri, Kalkaji', 'Mohammad Huzaifa', 'student', 0, 0, null, null, now()),
  ('CYN09', 'Blue Bells Model School', 'Blue Bells Model School', 'Saurish Mittal', 'student', 0, 0, null, null, now()),
  ('CYN06', 'Jagran Public School Noida', 'Jagran Public School Noida', 'Atharv Singh negi', 'student', 0, 0, null, null, now()),
  ('CYN27', 'American Montessori Public School', 'American Montessori Public School', 'Ms. Archna Sundriyal', 'teacher_in_charge', 0, 0, null, null, now()),
  ('CYN36', 'DPS SUSHANT LOK', 'DPS SUSHANT LOK', 'Advit Sharma', 'student', 0, 0, null, null, now()),
  ('CYN26', 'S. R. D. A. V. Public School', 'S. R. D. A. V. Public School', 'Astik Barnwal', 'student', 0, 0, null, null, now()),
  ('CYN35', 'Aravali International School, Sector-85', 'Aravali International School, Sector-85', 'Nilay Mishra', 'student', 0, 0, null, null, now()),
  ('CYN29', 'G D GOENKA PUBLIC SCHOOL, SECTOR 48, GURGAON', 'G D GOENKA PUBLIC SCHOOL, SECTOR 48, GURGAON', 'YUVAAN SINGH', 'student', 0, 0, null, null, now()),
  ('CYN15', 'SUNCITY SCHOOL 37 D', 'SUNCITY SCHOOL 37 D', 'Manju Chhillar', 'teacher_in_charge', 0, 0, null, null, now()),
  ('CYN16', 'Delhi Public School, Sector 45 Gurgaon', 'Delhi Public School, Sector 45 Gurgaon', 'Pari Shrivastava', 'student', 0, 0, null, null, now())
on conflict (school_code) do update set
  score = 0,
  levels_solved = 0,
  last_level_cleared = null,
  last_solve_time = null,
  last_active_at = now(),
  updated_at = now();

-- 6. Helper function for Wave 2 solve recording with automatic timestamping
create or replace function public.record_wave2_solve(
  p_school_code text,
  p_points int,
  p_level_id text default null
) returns void as $$
begin
  update public.clue_less_leaderboard
  set
    score = score + greatest(p_points, 0),
    levels_solved = levels_solved + 1,
    last_level_cleared = coalesce(p_level_id, last_level_cleared),
    last_solve_time = now(),
    last_active_at = now(),
    updated_at = now()
  where school_code = p_school_code;
end;
$$ language plpgsql security definer;

revoke execute on function public.record_wave2_solve(text, int, text) from public, anon, authenticated;
grant execute on function public.record_wave2_solve(text, int, text) to service_role;

-- 7. Helper function for direct leaderboard update with solve time support
create or replace function public.update_leaderboard_entry(
  p_school_code text,
  p_score int,
  p_levels_solved int default null,
  p_last_level text default null,
  p_last_solve_time timestamptz default null
) returns void as $$
begin
  update public.clue_less_leaderboard
  set
    score = greatest(score, p_score),
    levels_solved = greatest(levels_solved, coalesce(p_levels_solved, levels_solved)),
    last_level_cleared = coalesce(p_last_level, last_level_cleared),
    last_solve_time = case
      when p_score > score then coalesce(p_last_solve_time, now())
      else last_solve_time
    end,
    last_active_at = now(),
    updated_at = now()
  where school_code = p_school_code;
end;
$$ language plpgsql security definer;

revoke execute on function public.update_leaderboard_entry(text, int, int, text, timestamptz) from public, anon, authenticated;
grant execute on function public.update_leaderboard_entry(text, int, int, text, timestamptz) to service_role;
