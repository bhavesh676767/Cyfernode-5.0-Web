import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'

const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type, x-clueless-session'

// ─── Difficulty-based points ───────────────────────────────────────────────────
const LEVEL_CONFIG: Record<string, { order: number; basePoints: number; difficulty: string }> = {
  'am-i-retarded':      { order: 1, basePoints: 500, difficulty: 'Hard' },
  'this-too-shall-pass': { order: 2, basePoints: 600, difficulty: 'Hard' },
}


// First-solver bonus: 1st → +100%, 2nd → +50%, 3rd → +25%, 4th+ → 0%
function calcBonus(rank: number, base: number): number {
  if (rank === 1) return base   // +100%
  if (rank === 2) return Math.round(base * 0.5)  // +50%
  if (rank === 3) return Math.round(base * 0.25) // +25%
  return 0
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req, ALLOW_HEADERS), 'Content-Type': 'application/json' },
  })
}

function fail(req: Request, error: string, status = 400) {
  return json(req, { ok: false, error }, status)
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase service role is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req, ALLOW_HEADERS), status: 204 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const action = String(body.action || '').trim()
  const admin = adminClient()

  try {
    // ── record-solve: called when a school correctly answers a level ──────────
    if (action === 'record-solve') {
      const levelId = String(body.levelId || '').trim().toLowerCase()
      const sessionToken = String(body.token || '').trim()
      const schoolCode = String(body.schoolCode || '').trim().toUpperCase()

      if (!levelId || !sessionToken || !schoolCode) {
        return fail(req, 'levelId, token, and schoolCode are required.')
      }

      if (!LEVEL_CONFIG[levelId]) {
        return fail(req, `Unknown level: ${levelId}`)
      }

      // Verify the session token
      const tokenHash = await sha256(sessionToken)
      const { data: sessionRow, error: sessErr } = await admin
        .from('clue_less_sessions')
        .select('school_code, expires_at')
        .eq('token_hash', tokenHash)
        .eq('school_code', schoolCode)
        .maybeSingle()

      if (sessErr || !sessionRow) {
        return fail(req, 'Invalid or expired session token.', 401)
      }

      if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
        return fail(req, 'Session has expired. Please re-authenticate.', 401)
      }

      // Call the server-side RPC (handles idempotency + atomicity)
      const { data: result, error: rpcErr } = await admin
        .rpc('record_level_solve', {
          p_school_code: schoolCode,
          p_level_id: levelId,
        })

      if (rpcErr) {
        console.error('record_level_solve error:', rpcErr)
        return fail(req, 'Failed to record solve. Please try again.', 500)
      }

      const row = Array.isArray(result) ? result[0] : result
      const cfg = LEVEL_CONFIG[levelId]

      return json(req, {
        ok: true,
        alreadySolved: row.already_solved,
        solveRank: row.solve_rank,
        basePoints: row.base_points,
        bonusPoints: row.points_earned - row.base_points,
        pointsEarned: row.points_earned,
        totalScore: row.total_score,
        difficulty: cfg.difficulty,
        levelId,
      })
    }

    // ── get-level-solves: returns all solve records for leaderboard detail ────
    if (action === 'get-level-solves') {
      const { data, error } = await admin
        .from('clue_less_level_solves')
        .select(`
          school_code,
          level_id,
          solve_rank,
          points_earned,
          solved_at
        `)
        .order('level_id', { ascending: true })
        .order('solve_rank', { ascending: true })

      if (error) {
        return fail(req, 'Could not load level solves.', 500)
      }

      return json(req, { ok: true, solves: data || [] })
    }

    // ── get-level-config: returns the points config for all levels ────────────
    if (action === 'get-level-config') {
      const config = Object.entries(LEVEL_CONFIG).map(([id, cfg]) => ({
        levelId: id,
        order: cfg.order,
        basePoints: cfg.basePoints,
        difficulty: cfg.difficulty,
        firstSolverPoints: cfg.basePoints * 2,
        secondSolverPoints: cfg.basePoints + Math.round(cfg.basePoints * 0.5),
        thirdSolverPoints: cfg.basePoints + Math.round(cfg.basePoints * 0.25),
      }))

      return json(req, { ok: true, config: config.sort((a, b) => a.order - b.order) })
    }

    return fail(req, 'Unknown action.', 404)
  } catch (err) {
    console.error('clueless-solve exception:', err)
    return fail(req, err instanceof Error ? err.message : 'Unexpected error.', 500)
  }
})
