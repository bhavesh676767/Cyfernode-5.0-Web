-- ─────────────────────────────────────────────────────────────────────────────
-- Clue-Less: Difficulty-based scoring with first-solver bonuses
-- Migration: 20260927000000_clueless_scoring.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Level definitions: base points and difficulty label ───────────────────
-- Points scale with complexity. Early levels reward participation; later levels
-- reward deep technical/cryptographic skill.
--
-- Level order (as presented on the hunt page):
--   1. whistle-podu            EASY        100 pts
--   2. only-ww                 EASY        150 pts
--   3. the-image-that-isnt-an-image  MEDIUM  220 pts
--   4. the-bearer              MEDIUM      300 pts
--   5. a-comedy-of-accuracy    HARD        400 pts
--   6. the-third-tung          HARD        525 pts
--   7. redline-echo            EXPERT      675 pts
--   8. the-hollow-chime        EXPERT      850 pts
--
-- First-solver bonus multipliers (applied to base points):
--   1st solver: +100%  (2× base)
--   2nd solver: +50%   (1.5× base)
--   3rd solver: +25%   (1.25× base)
--   4th+:        +0%   (1× base)

create table if not exists clue_less_level_config (
  level_id        text primary key,
  level_order     int  not null unique,
  base_points     int  not null,
  difficulty      text not null check (difficulty in ('easy', 'medium', 'hard', 'expert'))
);

-- Seed with the 8 hunt levels
insert into clue_less_level_config (level_id, level_order, base_points, difficulty) values
  ('whistle-podu',                   1, 100,  'easy'),
  ('only-ww',                        2, 150,  'easy'),
  ('the-image-that-isnt-an-image',   3, 220,  'medium'),
  ('the-bearer',                     4, 300,  'medium'),
  ('a-comedy-of-accuracy',           5, 400,  'hard'),
  ('the-third-tung',                 6, 525,  'hard'),
  ('redline-echo',                   7, 675,  'expert'),
  ('the-hollow-chime',               8, 850,  'expert')
on conflict (level_id) do update
  set level_order = excluded.level_order,
      base_points = excluded.base_points,
      difficulty  = excluded.difficulty;

-- ── 2. Level solves log ──────────────────────────────────────────────────────
-- Records every unique (school_code × level_id) solve.
-- solve_rank = 1 means first school to solve this level globally.

create table if not exists clue_less_level_solves (
  id            uuid        primary key default gen_random_uuid(),
  school_code   text        not null,
  level_id      text        not null references clue_less_level_config(level_id),
  solved_at     timestamptz not null default now(),
  solve_rank    int         not null default 1,   -- 1=1st, 2=2nd, 3=3rd, …
  points_earned int         not null default 0,
  unique (school_code, level_id)
);

create index if not exists idx_clue_less_level_solves_level
  on clue_less_level_solves (level_id, solved_at);

create index if not exists idx_clue_less_level_solves_school
  on clue_less_level_solves (school_code);

-- ── 3. Server-side RPC: record a level solve ─────────────────────────────────
-- Called by the Edge Function when a school submits a correct answer.
-- Returns the points earned and the solve rank so the client can show it.
-- Idempotent: calling it twice for the same (school_code, level_id) is a no-op.

create or replace function record_level_solve(
  p_school_code text,
  p_level_id    text
)
returns table (
  already_solved boolean,
  solve_rank     int,
  base_points    int,
  points_earned  int,
  total_score    int
)
language plpgsql
security definer
as $$
declare
  v_base_points   int;
  v_solve_rank    int;
  v_bonus_pct     numeric;
  v_points_earned int;
  v_already       boolean := false;
  v_total_score   int;
begin
  -- Check if already solved
  if exists (
    select 1 from clue_less_level_solves
    where school_code = p_school_code and level_id = p_level_id
  ) then
    v_already := true;
    select
      cls.solve_rank, cfg.base_points, cls.points_earned
    into v_solve_rank, v_base_points, v_points_earned
    from clue_less_level_solves cls
    join clue_less_level_config cfg on cfg.level_id = cls.level_id
    where cls.school_code = p_school_code and cls.level_id = p_level_id;

    select coalesce(sum(points_earned), 0) into v_total_score
    from clue_less_level_solves
    where school_code = p_school_code;

    return query select v_already, v_solve_rank, v_base_points, v_points_earned, v_total_score;
    return;
  end if;

  -- Get base points for this level
  select base_points into v_base_points
  from clue_less_level_config
  where level_id = p_level_id;

  if v_base_points is null then
    raise exception 'Unknown level_id: %', p_level_id;
  end if;

  -- Determine solve rank (how many schools solved this level before this one)
  select coalesce(max(solve_rank), 0) + 1 into v_solve_rank
  from clue_less_level_solves
  where level_id = p_level_id;

  -- First-solver bonus
  v_bonus_pct := case
    when v_solve_rank = 1 then 1.0   -- 2× (100% bonus → multiply base by 2)
    when v_solve_rank = 2 then 0.5   -- 1.5×
    when v_solve_rank = 3 then 0.25  -- 1.25×
    else 0.0                          -- 1×
  end;

  v_points_earned := v_base_points + round(v_base_points * v_bonus_pct);

  -- Insert the solve record
  insert into clue_less_level_solves
    (school_code, level_id, solve_rank, points_earned)
  values
    (p_school_code, p_level_id, v_solve_rank, v_points_earned)
  on conflict (school_code, level_id) do nothing;

  -- Compute new total score for this school
  select coalesce(sum(points_earned), 0) into v_total_score
  from clue_less_level_solves
  where school_code = p_school_code;

  -- Update clue_less_teams score and levels_completed
  update clue_less_teams
  set
    score             = v_total_score,
    levels_completed  = (
      select count(*) from clue_less_level_solves
      where school_code = p_school_code
    ),
    current_level     = p_level_id,
    last_active_at    = now(),
    updated_at        = now()
  where school_code   = p_school_code;

  return query select v_already, v_solve_rank, v_base_points, v_points_earned, v_total_score;
end;
$$;

-- ── 4. Level solve leaderboard view (per-level first-solvers) ─────────────────
create or replace view clue_less_level_leaderboard as
select
  cfg.level_id,
  cfg.level_order,
  cfg.difficulty,
  cfg.base_points,
  cls.school_code,
  cls.solve_rank,
  cls.points_earned,
  cls.solved_at
from clue_less_level_config cfg
left join clue_less_level_solves cls on cls.level_id = cfg.level_id
order by cfg.level_order, cls.solve_rank;

-- ── 5. Row-level security ─────────────────────────────────────────────────────
alter table clue_less_level_config  enable row level security;
alter table clue_less_level_solves  enable row level security;

-- Read-only public access (needed for the realtime scoreboard)
create policy "Public read level config"
  on clue_less_level_config for select to anon using (true);

create policy "Public read level solves"
  on clue_less_level_solves for select to anon using (true);

-- Only service role can insert/update solves (via Edge Function)
create policy "Service role write level solves"
  on clue_less_level_solves for all to service_role using (true);

-- ── 6. Grant view access ──────────────────────────────────────────────────────
grant select on clue_less_level_leaderboard to anon, authenticated;
grant select on clue_less_level_config      to anon, authenticated;
grant select on clue_less_level_solves      to anon, authenticated;
grant execute on function record_level_solve(text, text) to service_role;
