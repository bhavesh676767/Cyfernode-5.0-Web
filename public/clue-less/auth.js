/**
 * Cyfernode Clue-Less Authentication & Realtime Client
 */

export const SUPABASE_URL = 'https://stjjvgnewkswzwmmzyoh.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0amp2Z25ld2tzd3p3bW16eW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTM2NDgsImV4cCI6MjEwMzMyOTY0OH0.l_vf_ovBAbMP_iIn_easi8ztLkC13SJr-JxuWtdM9ng'

if (typeof window !== 'undefined') {
  window.SUPABASE_URL = SUPABASE_URL
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY
}
const ENDPOINT = `${SUPABASE_URL}/functions/v1/clueless-access`
const SESSION_KEY = 'cyfernode-clueless-auth'
const DEVICE_KEY = 'cyfernode-clueless-device'

function getCluelessDeviceId() {
  try {
    let deviceId = localStorage.getItem(DEVICE_KEY)
    if (!deviceId) {
      deviceId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      try { localStorage.setItem(DEVICE_KEY, deviceId) } catch {}
    }
    return deviceId
  } catch {
    return 'dev-fallback-' + Math.random().toString(36).slice(2)
  }
}

export function getCluelessSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setCluelessSession(sessionData) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
  } catch {
    // ignore
  }
}

export function clearCluelessSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export function isCluelessLoggedIn() {
  const session = getCluelessSession()
  return Boolean(session?.token && session?.profile?.schoolCode)
}

async function callCluelessAccess(action, payload = {}) {
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
    })
  } catch {
    throw new Error('Network request failed. Please check your internet connection.')
  }

  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok || body.ok === false) {
    throw new Error(body.error || 'Something went wrong. Please try again.')
  }

  return body
}

export function checkSchool(schoolCode) {
  return callCluelessAccess('check-school', { schoolCode })
}

export function verifyIdentity(schoolCode, email) {
  return callCluelessAccess('verify-identity', { schoolCode, email })
}

export function requestPasskey(schoolCode, email) {
  return callCluelessAccess('request-passkey', { schoolCode, email })
}

export async function verifyPasskey(schoolCode, email, passkey) {
  const currentSession = getCluelessSession()
  const result = await callCluelessAccess('verify-passkey', {
    schoolCode,
    email,
    passkey,
    deviceId: getCluelessDeviceId(),
    existingToken: currentSession?.token || '',
  })
  if (result.ok && result.token) {
    setCluelessSession({
      token: result.token,
      profile: result.profile,
    })
  }
  return result
}

export async function validateCluelessSession(session = getCluelessSession()) {
  if (!session?.token || !session?.profile?.schoolCode) return false
  try {
    const result = await callCluelessAccess('heartbeat', {
      token: session.token,
      schoolCode: session.profile.schoolCode,
      deviceId: getCluelessDeviceId(),
    })
    return Boolean(result.ok)
  } catch {
    return false
  }
}

export async function heartbeatCluelessSession(session = getCluelessSession()) {
  if (!session?.token || !session?.profile?.schoolCode) return false
  try {
    await callCluelessAccess('heartbeat', {
      token: session.token,
      schoolCode: session.profile.schoolCode,
      deviceId: getCluelessDeviceId(),
    })
    return true
  } catch {
    return false
  }
}

export async function fetchActiveTeams() {
  // 1. Try dedicated official leaderboard table (score desc, earliest solve time first)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/clue_less_leaderboard?select=*&order=score.desc,last_solve_time.asc.nullslast,last_active_at.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    if (res.ok) {
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length > 0) {
        return rows
      }
    }
  } catch {
    // ignore and fallback
  }

  // 2. Fallback to clue_less_teams
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/clue_less_teams?select=*&order=score.desc,last_active_at.desc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    if (!res.ok) {
      const fallback = await callCluelessAccess('list-teams')
      return fallback.teams || []
    }
    return await res.json()
  } catch {
    try {
      const fallback = await callCluelessAccess('list-teams')
      return fallback.teams || []
    } catch {
      return []
    }
  }
}

/**
 * Realtime subscription for Clue-Less leaderboard table
 */
export function subscribeToCluelessTeams(onUpdate) {
  let active = true
  let channel = null

  async function init() {
    // Initial fetch
    const initialData = await fetchActiveTeams()
    if (active) onUpdate(initialData)

    // Try Supabase Realtime using WebSocket or polling fallback
    try {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        channel = client
          .channel('clue_less_leaderboard_channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'clue_less_leaderboard' },
            async () => {
              if (!active) return
              const updated = await fetchActiveTeams()
              if (active) onUpdate(updated)
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'clue_less_teams' },
            async () => {
              if (!active) return
              const updated = await fetchActiveTeams()
              if (active) onUpdate(updated)
            }
          )
          .subscribe()
      }
    } catch (err) {
      console.warn('Realtime subscription error, using polling fallback:', err)
    }
  }

  init()

  // Polling fallback every 8 seconds
  const interval = setInterval(async () => {
    if (!active) return
    const updated = await fetchActiveTeams()
    if (active) onUpdate(updated)
  }, 8000)

  return function unsubscribe() {
    active = false
    clearInterval(interval)
    if (channel && channel.unsubscribe) {
      channel.unsubscribe()
    }
  }
}

