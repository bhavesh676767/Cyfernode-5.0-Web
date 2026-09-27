/**
 * Cyfernode Clue-Less — Scoring & Multi-Device Synchronization Client
 *
 * Handles server-side level solve recording with difficulty-based points,
 * first-solver bonuses, and real-time synchronization across all team members
 * sharing the same school code.
 */

export const SUPABASE_URL = 'https://stjjvgnewkswzwmmzyoh.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0amp2Z25ld2tzd3p3bW16eW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTM2NDgsImV4cCI6MjEwMzMyOTY0OH0.l_vf_ovBAbMP_iIn_easi8ztLkC13SJr-JxuWtdM9ng'
const SOLVE_ENDPOINT = `${SUPABASE_URL}/functions/v1/clueless-solve`
export const COMPLETED_STORAGE_KEY = 'cyfernode_clueless_completed_levels'
export const SOLVES_CACHE_KEY = 'cyfernode_clueless_solves_cache'

// Client-side level config (mirrors server config — used for instant UI feedback)
export const LEVEL_CONFIG = {
  'whistle-podu':                   { order: 1, basePoints: 100, difficulty: 'Easy', name: 'Whistle Podu' },
  'only-ww':                        { order: 2, basePoints: 150, difficulty: 'Easy', name: 'Only WW' },
  'the-image-that-isnt-an-image':   { order: 3, basePoints: 220, difficulty: 'Medium', name: "THE IMAGE THAT ISN'T AN IMAGE" },
  'the-bearer':                     { order: 4, basePoints: 300, difficulty: 'Medium', name: 'THE BEARER' },
  'a-comedy-of-accuracy':           { order: 5, basePoints: 400, difficulty: 'Hard', name: 'A comedy of accuracy' },
  'the-third-tung':                 { order: 6, basePoints: 525, difficulty: 'Hard', name: 'THE THIRD TUNG' },
  'redline-echo':                   { order: 7, basePoints: 675, difficulty: 'Expert', name: 'REDLINE ECHO' },
  'the-hollow-chime':               { order: 8, basePoints: 850, difficulty: 'Expert', name: 'THE HOLLOW CHIME' },
}

export function getSession() {
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
 * Syncs the school's solved levels from Supabase into local storage.
 * Uses server-side solves as the source of truth for authenticated teams and
 * notifies other tabs/listeners.
 *
 * @returns {Promise<{completedIds: string[], solvesMap: Record<string, any>, solvesList: any[]}>}
 */
export async function syncMySchoolSolves() {
  const session = getSession()
  const schoolCode = session?.profile?.schoolCode

  // Start with whatever is already cached locally
  let completedList = []
  let solvesMap = {}
  try {
    const rawCompleted = localStorage.getItem(COMPLETED_STORAGE_KEY)
    if (rawCompleted) completedList = JSON.parse(rawCompleted)
    const rawMap = localStorage.getItem(SOLVES_CACHE_KEY)
    if (rawMap) solvesMap = JSON.parse(rawMap)
  } catch { /* ignore */ }

  if (!schoolCode) {
    return { completedIds: completedList, solvesMap, solvesList: [] }
  }

  try {
    const solves = await fetchMyLevelSolves()
    if (Array.isArray(solves)) {
      // A browser may have stale local progress from a previous school code.
      // Once authenticated, only this school's records may mark a level done.
      completedList = solves.map(s => s.level_id)
      solvesMap = {}

      solves.forEach(s => {
        solvesMap[s.level_id] = {
          pointsEarned: s.points_earned,
          solveRank: s.solve_rank,
          solvedAt: s.solved_at,
          difficulty: LEVEL_CONFIG[s.level_id]?.difficulty || 'Unknown',
        }
      })

      try {
        localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedList))
        localStorage.setItem(SOLVES_CACHE_KEY, JSON.stringify(solvesMap))
      } catch { /* ignore */ }

      // Broadcast update event to the current window
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('clueless-solves-updated', {
          detail: { completedIds: completedList, solvesMap, solvesList: solves }
        }))
      }

      return { completedIds: completedList, solvesMap, solvesList: solves }
    }
  } catch (err) {
    console.warn('syncMySchoolSolves error:', err)
  }

  return { completedIds: completedList, solvesMap, solvesList: [] }
}

/**
 * Mark a level as completed locally and record it server-side.
 * Returns the server response with points earned, solve rank, etc.
 *
 * @param {string} levelId - the level identifier (e.g. 'whistle-podu')
 * @returns {Promise<{ok: boolean, pointsEarned: number, solveRank: number, totalScore: number, bonusPoints: number, alreadySolved: boolean}>}
 */
export async function markLevelCompleted(levelId) {
  // 1. Update local completed list immediately (for instant UI feedback)
  let completedList = []
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY)
    completedList = raw ? JSON.parse(raw) : []
  } catch { /* ignore */ }

  if (!completedList.includes(levelId)) {
    completedList.push(levelId)
    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedList))
    } catch { /* ignore */ }
  }

  // 2. Attempt server-side recording (if authenticated)
  const session = getSession()
  if (!session?.token || !session?.profile?.schoolCode) {
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
      // Update local solves cache
      let solvesMap = {}
      try {
        const rawMap = localStorage.getItem(SOLVES_CACHE_KEY)
        if (rawMap) solvesMap = JSON.parse(rawMap)
      } catch { /* ignore */ }

      solvesMap[levelId] = {
        pointsEarned: data.pointsEarned,
        solveRank: data.solveRank,
        solvedAt: new Date().toISOString(),
        difficulty: data.difficulty || LEVEL_CONFIG[levelId]?.difficulty || 'Unknown',
      }
      try {
        localStorage.setItem(SOLVES_CACHE_KEY, JSON.stringify(solvesMap))
      } catch { /* ignore */ }

      // Trigger full sync
      syncMySchoolSolves().catch(() => {})

      return { ...data, serverRecorded: true }
    }

    console.warn('clueless-solve server error:', data.error)
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
 * Fetch all level solves for the current session school.
 */
export async function fetchMyLevelSolves() {
  const session = getSession()
  if (!session?.profile?.schoolCode) return []

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/clue_less_level_solves?school_code=eq.${encodeURIComponent(session.profile.schoolCode)}&select=level_id,solve_rank,points_earned,solved_at`,
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
 * Subscribes to solves for the current school code in realtime.
 * Invokes onUpdate({ completedIds, solvesMap, latestSolve }) whenever a solve happens
 * (e.g. solved by a teammate on another computer).
 *
 * @param {Function} onUpdate - callback when team's solve progress updates
 * @returns {Function} unsubscribe function
 */
export function subscribeToMySchoolSolves(onUpdate) {
  let active = true
  let channel = null
  let bc = null

  const session = getSession()
  const schoolCode = session?.profile?.schoolCode

  // Cross-tab broadcast channel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('cyfernode_clueless_sync')
      bc.onmessage = async (msg) => {
        if (!active) return
        if (msg.data?.type === 'SOLVE_UPDATED' && msg.data?.schoolCode === schoolCode) {
          const synced = await syncMySchoolSolves()
          if (active && onUpdate) onUpdate(synced)
        }
      }
    }
  } catch { /* ignore */ }

  async function handleRefresh() {
    if (!active) return
    const synced = await syncMySchoolSolves()
    if (active && onUpdate) onUpdate(synced)
  }

  // Initial sync
  handleRefresh()

  // Listen to window custom events
  const onLocalSolve = () => {
    if (active) handleRefresh()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('clueless-solves-updated', onLocalSolve)
  }

  // Supabase Realtime subscription
  if (schoolCode && typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      channel = client
        .channel(`clueless_solves_${schoolCode}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clue_less_level_solves',
            filter: `school_code=eq.${schoolCode}`,
          },
          async () => {
            if (!active) return
            await handleRefresh()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clue_less_teams',
            filter: `school_code=eq.${schoolCode}`,
          },
          async () => {
            if (!active) return
            await handleRefresh()
          }
        )
        .subscribe()
    } catch (err) {
      console.warn('Realtime solves subscription error:', err)
    }
  }

  // Polling fallback every 4 seconds to guarantee team sync
  const interval = setInterval(() => {
    if (active) handleRefresh()
  }, 4000)

  return function unsubscribe() {
    active = false
    clearInterval(interval)
    if (typeof window !== 'undefined') {
      window.removeEventListener('clueless-solves-updated', onLocalSolve)
    }
    if (bc) bc.close()
    if (channel && channel.unsubscribe) channel.unsubscribe()
  }
}

/**
 * Initializes synchronization on a specific level page.
 * If this level is already solved by ANY teammate with the same school code,
 * calls onSolved(solveData) so the page can show the completed state.
 * Also listens in realtime while user is viewing the page.
 *
 * @param {string} levelId - level identifier
 * @param {Function} onSolved - called with solve info when level is or becomes solved
 * @returns {Function} unsubscribe function
 */
export function initLevelSync(levelId, onSolved) {
  let isSolvedTriggered = false

  function checkSolves(syncedData) {
    if (isSolvedTriggered) return
    const { completedIds = [], solvesMap = {} } = syncedData || {}
    if (completedIds.includes(levelId)) {
      isSolvedTriggered = true
      const solveInfo = solvesMap[levelId] || {
        pointsEarned: LEVEL_CONFIG[levelId]?.basePoints || 100,
        difficulty: LEVEL_CONFIG[levelId]?.difficulty || 'Easy',
        solveRank: null,
      }
      if (onSolved) onSolved(solveInfo)
    }
  }

  // Check local cache immediately for instant render
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    const rawMap = localStorage.getItem(SOLVES_CACHE_KEY)
    const map = rawMap ? JSON.parse(rawMap) : {}
    if (list.includes(levelId)) {
      checkSolves({ completedIds: list, solvesMap: map })
    }
  } catch { /* ignore */ }

  // Subscribe to realtime updates for this school
  const unsub = subscribeToMySchoolSolves((synced) => {
    checkSolves(synced)
  })

  return unsub
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
    ? `<div style="font-size:12px;color:#f59e0b;font-weight:700;margin-top:2px;">+${result.bonusPoints} first-solver bonus!</div>`
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
 * Builds a comprehensive "Already Solved by Your Team" card for level views.
 */
export function buildSolvedCard(levelId, solveInfo = {}, isRealtimeUpdate = false) {
  const cfg = LEVEL_CONFIG[levelId] || {}
  const rankLabels = { 1: '🥇 FIRST SOLVE', 2: '🥈 SECOND SOLVE', 3: '🥉 THIRD SOLVE' }
  const rankLabel = solveInfo.solveRank != null
    ? (rankLabels[solveInfo.solveRank] || `#${solveInfo.solveRank} SOLVE`)
    : null

  const points = solveInfo.pointsEarned || cfg.basePoints || 100
  const diff = solveInfo.difficulty || cfg.difficulty || 'Easy'

  return `
    <div class="team-solved-banner" style="
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 12px;
      padding: 18px 20px;
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.08);
      animation: fadeInSolved 0.35s ease-out;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:0.06em;color:#047857;text-transform:uppercase;">
          <i class="fa-solid fa-circle-check" style="color:#10b981;font-size:15px;"></i>
          ${isRealtimeUpdate ? 'Just solved by your teammate!' : 'Solved by your team'}
        </span>
        <span style="font-size:16px;font-weight:900;color:#047857;font-family:var(--font-mono, monospace);">
          +${points} pts
        </span>
      </div>
      <div style="font-size:13px;color:#065f46;line-height:1.4;">
        This level has already been solved by a team member on your school code. Your points have been recorded.
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:8px;border-top:1px solid #bbf7d0;">
        <span style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;">
          ${diff} ${rankLabel ? `• ${rankLabel}` : ''}
        </span>
        <a href="/prompts/clue-less-prompt" style="
          font-size:12px;font-weight:800;color:#d24500;text-decoration:none;
          display:inline-flex;align-items:center;gap:4px;
        ">
          <span>Return to Prompts</span>
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    </div>
    <style>
      @keyframes fadeInSolved {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `
}
