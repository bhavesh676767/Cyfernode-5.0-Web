/**
 * Cyfernode Clue-Less — Scoring Client
 *
 * Handles server-side level solve recording with difficulty-based points
 * and first-solver bonuses. Replaces the old flat "100 pts per level" system.
 *
 * Points System:
 *   Level 1  whistle-podu                  EASY    100 pts
 *   Level 2  only-ww                       EASY    150 pts
 *   Level 3  the-image-that-isnt-an-image  MEDIUM  220 pts
 *   Level 4  the-bearer                    MEDIUM  300 pts
 *   Level 5  a-comedy-of-accuracy          HARD    400 pts
 *   Level 6  the-third-tung                HARD    525 pts
 *   Level 7  redline-echo                  EXPERT  675 pts
 *   Level 8  the-hollow-chime              EXPERT  850 pts
 *
 * First-Solver Bonus:
 *   1st school to solve → +100% (2× base)
 *   2nd school to solve → +50%  (1.5× base)
 *   3rd school to solve → +25%  (1.25× base)
 *   4th+ schools        → +0%   (base only)
 */

const SUPABASE_URL = 'https://stjjvgnewkswzwmmzyoh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0amp2Z25ld2tzd3p3bW16eW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTM2NDgsImV4cCI6MjEwMzMyOTY0OH0.l_vf_ovBAbMP_iIn_easi8ztLkC13SJr-JxuWtdM9ng'
const SOLVE_ENDPOINT = `${SUPABASE_URL}/functions/v1/clueless-solve`

// Client-side level config (mirrors server config — used for instant UI feedback)
export const LEVEL_CONFIG = {
  'whistle-podu':                   { order: 1, basePoints: 100, difficulty: 'Easy' },
  'only-ww':                        { order: 2, basePoints: 150, difficulty: 'Easy' },
  'the-image-that-isnt-an-image':   { order: 3, basePoints: 220, difficulty: 'Medium' },
  'the-bearer':                     { order: 4, basePoints: 300, difficulty: 'Medium' },
  'a-comedy-of-accuracy':           { order: 5, basePoints: 400, difficulty: 'Hard' },
  'the-third-tung':                 { order: 6, basePoints: 525, difficulty: 'Hard' },
  'redline-echo':                   { order: 7, basePoints: 675, difficulty: 'Expert' },
  'the-hollow-chime':               { order: 8, basePoints: 850, difficulty: 'Expert' },
}

function getSession() {
  try {
    const raw = localStorage.getItem('cyfernode-clueless-auth') ||
                sessionStorage.getItem('cyfernode-clueless-auth')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Mark a level as completed locally and record it server-side.
 * Returns the server response with points earned, solve rank, etc.
 *
 * @param {string} levelId - the level identifier (e.g. 'whistle-podu')
 * @returns {Promise<{ok: boolean, pointsEarned: number, solveRank: number, totalScore: number, bonusPoints: number, alreadySolved: boolean}>}
 */
export async function markLevelCompleted(levelId) {
  // 1. Update local completed list immediately (for UI)
  let completedList = []
  try {
    const raw = localStorage.getItem('cyfernode_clueless_completed_levels')
    completedList = raw ? JSON.parse(raw) : []
  } catch { /* ignore */ }

  if (!completedList.includes(levelId)) {
    completedList.push(levelId)
    try {
      localStorage.setItem('cyfernode_clueless_completed_levels', JSON.stringify(completedList))
    } catch { /* ignore */ }
  }

  // 2. Attempt server-side recording (if authenticated)
  const session = getSession()
  if (!session?.token || !session?.profile?.schoolCode) {
    // Not authenticated — show a local fallback with base points
    const cfg = LEVEL_CONFIG[levelId]
    const basePoints = cfg?.basePoints ?? 100
    return {
      ok: true,
      alreadySolved: false,
      solveRank: null,
      basePoints,
      bonusPoints: 0,
      pointsEarned: basePoints,
      totalScore: null,
      difficulty: cfg?.difficulty ?? 'Unknown',
      serverRecorded: false,
    }
  }

  try {
    const res = await fetch(SOLVE_ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'record-solve',
        levelId,
        token: session.token,
        schoolCode: session.profile.schoolCode,
      }),
    })

    const data = await res.json().catch(() => ({ ok: false }))

    if (data.ok) {
      // Sync authoritative total score back into the teams table via REST
      // (the RPC already did this server-side, but we trigger a realtime push)
      return { ...data, serverRecorded: true }
    }

    console.warn('clueless-solve server error:', data.error)
    // Fallback to base points on server error
    const cfg = LEVEL_CONFIG[levelId]
    return {
      ok: true,
      alreadySolved: false,
      solveRank: null,
      basePoints: cfg?.basePoints ?? 100,
      bonusPoints: 0,
      pointsEarned: cfg?.basePoints ?? 100,
      totalScore: null,
      difficulty: cfg?.difficulty ?? 'Unknown',
      serverRecorded: false,
    }
  } catch (err) {
    console.warn('clueless-solve network error:', err)
    const cfg = LEVEL_CONFIG[levelId]
    return {
      ok: true,
      alreadySolved: false,
      solveRank: null,
      basePoints: cfg?.basePoints ?? 100,
      bonusPoints: 0,
      pointsEarned: cfg?.basePoints ?? 100,
      totalScore: null,
      difficulty: cfg?.difficulty ?? 'Unknown',
      serverRecorded: false,
    }
  }
}

/**
 * Build a solve result banner HTML string.
 * Shows: points earned, solve rank badge, difficulty, bonus info.
 */
export function buildSolveBanner(result, levelId) {
  const cfg = LEVEL_CONFIG[levelId] || {}
  const rankLabels = { 1: '🥇 FIRST SOLVE', 2: '🥈 SECOND SOLVE', 3: '🥉 THIRD SOLVE' }
  const rankLabel = result.solveRank != null
    ? (rankLabels[result.solveRank] || `#${result.solveRank} SOLVE`)
    : null

  const diffColor = {
    Easy: '#10b981',
    Medium: '#f59e0b',
    Hard: '#f97316',
    Expert: '#ef4444',
  }[result.difficulty || cfg.difficulty] || '#888'

  const bonusLine = result.bonusPoints > 0
    ? `<div style="font-size:12px;color:#f59e0b;margin-top:2px;">+${result.bonusPoints} first-solver bonus!</div>`
    : ''

  const rankLine = rankLabel
    ? `<div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:${diffColor};text-transform:uppercase;margin-top:4px;">${rankLabel}</div>`
    : ''

  return `
    <div style="
      display:inline-flex;flex-direction:column;align-items:flex-start;
      background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
      padding:10px 14px;margin-top:12px;gap:2px;
    ">
      <div style="font-size:13px;font-weight:700;color:#111114;">
        ✓ Correct — 
        <span style="color:#10b981;font-size:16px;font-weight:900;">+${result.pointsEarned} pts</span>
        <span style="font-size:11px;color:#6b7280;margin-left:4px;">(${result.difficulty || cfg.difficulty})</span>
      </div>
      ${bonusLine}
      ${rankLine}
    </div>
  `
}

/**
 * Fetch all level solves for the current session school (for displaying which
 * levels are marked on the main page).
 */
export async function fetchMyLevelSolves() {
  const session = getSession()
  if (!session?.profile?.schoolCode) return []

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/clue_less_level_solves?school_code=eq.${session.profile.schoolCode}&select=level_id,solve_rank,points_earned,solved_at`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )
    return res.ok ? await res.json() : []
  } catch {
    return []
  }
}

/**
 * Fetch per-level leaderboard data (who solved each level first).
 */
export async function fetchLevelLeaderboard() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/clue_less_level_solves?select=school_code,level_id,solve_rank,points_earned,solved_at&order=level_id.asc,solve_rank.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )
    return res.ok ? await res.json() : []
  } catch {
    return []
  }
}
