import {
  clearCluelessSession,
  getCluelessSession,
  heartbeatCluelessSession,
  validateCluelessSession,
} from './auth.js'

const PROMPT_HOME = '/prompts/clue-less-prompt?auth=required'
const session = getCluelessSession()

if (!session?.token || !session?.profile?.schoolCode) {
  window.location.replace(PROMPT_HOME)
} else {
  const isValid = await validateCluelessSession(session)
  if (!isValid) {
    clearCluelessSession()
    window.location.replace(PROMPT_HOME)
  } else {
    document.documentElement.style.visibility = ''
    window.setInterval(() => heartbeatCluelessSession(), 30000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') heartbeatCluelessSession()
    })
  }
}
