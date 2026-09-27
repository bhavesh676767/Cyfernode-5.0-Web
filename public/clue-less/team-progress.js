/**
 * Compatibility bridge for the static Clue-Less puzzle pages.
 *
 * Older pages call a global `markLevelCompleted` function.  Keep that API, but
 * make every completion go through the authenticated server-side team record.
 */
import {
  SUPABASE_ANON_KEY,
  buildSolvedCard,
  markLevelCompleted as recordTeamSolve,
  syncMySchoolSolves,
  subscribeToMySchoolSolves,
} from '/clue-less/scoring.js'

const LEGACY_SCORE_RPC = '/rest/v1/rpc/update_clueless_score'
const SOLVE_ENDPOINT = 'https://stjjvgnewkswzwmmzyoh.supabase.co/functions/v1/clueless-solve'

const COMPLETED_STORAGE_KEY = 'cyfernode_clueless_completed_levels'
const SOLVES_CACHE_KEY = 'cyfernode_clueless_solves_cache'

function writeLocalTeamProgress({ completedIds = [], solvesMap = {} }) {
  try {
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedIds))
    localStorage.setItem(SOLVES_CACHE_KEY, JSON.stringify(solvesMap))
  } catch {
    // The puzzle remains playable if browser storage is unavailable.
  }
}

function currentLevelId() {
  const segments = window.location.pathname.replace(/\/$/, '').split('/')
  const candidate = segments[segments.length - 1]
  return candidate === 'verify' ? 'whistle-podu' : candidate
}

function showTeamSolvedState({ completedIds = [], solvesMap = {} }) {
  const levelId = currentLevelId()
  if (!completedIds.includes(levelId) || document.querySelector('.team-solved-banner')) return

  const notice = document.createElement('aside')
  notice.setAttribute('aria-live', 'polite')
  notice.style.cssText = 'position:fixed;z-index:99999;top:16px;left:16px;right:16px;max-width:560px;margin:auto;'
  notice.innerHTML = buildSolvedCard(levelId, solvesMap[levelId], true)
  document.body.append(notice)

  document.querySelectorAll('input, button[type="submit"]').forEach((control) => {
    control.disabled = true
  })
}

async function completeTeamLevel(levelId) {
  const result = await recordTeamSolve(levelId)
  const synced = await syncMySchoolSolves()
  writeLocalTeamProgress(synced)
  return result
}

// Some static puzzle pages still contain the pre-lockdown RPC call. Their
// completion handlers are local functions, so the global bridge below cannot
// replace them. Convert only that retired request to the authenticated Edge
// Function until those static pages are regenerated.
const nativeFetch = window.fetch.bind(window)
window.fetch = async function clueLessFetch(input, init) {
  const url = typeof input === 'string' ? input : input?.url
  if (!url || !url.includes(LEGACY_SCORE_RPC)) {
    return nativeFetch(input, init)
  }

  let legacyPayload = {}
  try {
    legacyPayload = JSON.parse(init?.body || '{}')
  } catch {
    return nativeFetch(input, init)
  }

  const levelId = String(legacyPayload.p_current_level || '').trim()
  let session = null
  try {
    const raw = localStorage.getItem('cyfernode-clueless-auth') ||
      sessionStorage.getItem('cyfernode-clueless-auth')
    session = raw ? JSON.parse(raw) : null
  } catch {
    // The Edge Function will return the normal authentication error below.
  }

  return nativeFetch(SOLVE_ENDPOINT, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      action: 'record-solve',
      levelId,
      token: session?.token || '',
      schoolCode: session?.profile?.schoolCode || '',
    }),
  })
}

// Preserve the global used by all legacy level pages. This assignment happens
// after classic page scripts have declared their local-only implementation.
window.markLevelCompleted = completeTeamLevel
window.completeTeamLevel = completeTeamLevel

// Keep a teammate's browser current even on pages that do not render a custom
// solved card. Pages with a level-specific sync UI can also subscribe directly.
subscribeToMySchoolSolves((synced) => {
  writeLocalTeamProgress(synced)
  showTeamSolvedState(synced)
})

syncMySchoolSolves().then((synced) => {
  writeLocalTeamProgress(synced)
  showTeamSolvedState(synced)
}).catch(() => {})
