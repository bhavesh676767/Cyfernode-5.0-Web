-- ─────────────────────────────────────────────────────────────────────────────
-- Clue-Less: Security Lockdown for Score Tampering Prevention
-- Migration: 20260927020000_lockdown_clueless_scores.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. CRITICAL: Revoke execution of update_clueless_score from anonymous / public users.
-- This function allowed client-side manipulation of arbitrary scores by passing p_score.
-- Now, only service_role (Edge Functions) can call it if needed.
revoke execute on function public.update_clueless_score(text, int, text) from public;
revoke execute on function public.update_clueless_score(text, int, text) from anon;
revoke execute on function public.update_clueless_score(text, int, text) from authenticated;
grant execute on function public.update_clueless_score(text, int, text) to service_role;

-- 2. Verify record_level_solve execution permissions
-- Only service_role should ever call record_level_solve (from clueless-solve edge function)
revoke execute on function public.record_level_solve(text, text) from public;
revoke execute on function public.record_level_solve(text, text) from anon;
revoke execute on function public.record_level_solve(text, text) from authenticated;
grant execute on function public.record_level_solve(text, text) to service_role;

-- 3. Ensure clue_less_teams RLS is strictly read-only for public/anon
alter table public.clue_less_teams enable row level security;

drop policy if exists "Allow public read on clue_less_teams" on public.clue_less_teams;
create policy "Allow public read on clue_less_teams"
  on public.clue_less_teams for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow service role full access on clue_less_teams" on public.clue_less_teams;
create policy "Allow service role full access on clue_less_teams"
  on public.clue_less_teams for all
  to service_role
  using (true)
  with check (true);

-- 4. Ensure clue_less_level_solves RLS is strictly read-only for public/anon
alter table public.clue_less_level_solves enable row level security;

drop policy if exists "Public read level solves" on public.clue_less_level_solves;
create policy "Public read level solves"
  on public.clue_less_level_solves for select
  to anon, authenticated
  using (true);

drop policy if exists "Service role write level solves" on public.clue_less_level_solves;
create policy "Service role write level solves"
  on public.clue_less_level_solves for all
  to service_role
  using (true)
  with check (true);

-- 5. Ensure clue_less_sessions RLS is strictly service_role only
alter table public.clue_less_sessions enable row level security;

drop policy if exists "Allow service role full access on clue_less_sessions" on public.clue_less_sessions;
create policy "Allow service role full access on clue_less_sessions"
  on public.clue_less_sessions for all
  to service_role
  using (true)
  with check (true);
