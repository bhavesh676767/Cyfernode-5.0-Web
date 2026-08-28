import {
  VOID_HINTS,
  VOID_SOLUTION_STEPS,
} from './puzzle.js'
import {
  loadProgress,
  saveProgress,
  resetVoidProgress,
  resetAllProgress,
  VOID_SESSION_ENTERED,
  VOID_SESSION_ZERO,
} from './state.js'

export function isDebugMode() {
  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  return isLocal && new URLSearchParams(window.location.search).has('debug')
}

export function mountDebugPanel() {
  if (!isDebugMode()) return

  const panel = document.createElement('aside')
  panel.className = 'cl-debug'
  panel.setAttribute('aria-label', 'Development tools')
  panel.innerHTML = `
    <p class="cl-debug-title">Debug</p>
    <button type="button" data-action="reset-void">Reset level</button>
    <button type="button" data-action="reset-all">Reset all progress</button>
    <button type="button" data-action="show-state">Show test state</button>
    <details>
      <summary>Hints (organizers)</summary>
      <ol>${VOID_HINTS.map((hint) => `<li>${hint}</li>`).join('')}</ol>
    </details>
    <details>
      <summary>Solution (organizers)</summary>
      <ol>${VOID_SOLUTION_STEPS.map((step) => `<li>${step}</li>`).join('')}</ol>
    </details>
    <pre class="cl-debug-state" hidden></pre>
  `

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]')
    if (!button) return

    const action = button.getAttribute('data-action')
    if (action === 'reset-void') {
      saveProgress(resetVoidProgress(loadProgress()))
      try {
        sessionStorage.removeItem(VOID_SESSION_ENTERED)
        sessionStorage.removeItem(VOID_SESSION_ZERO)
      } catch {
        // ignore
      }
      window.location.reload()
      return
    }

    if (action === 'reset-all') {
      saveProgress(resetAllProgress())
      try {
        sessionStorage.removeItem(VOID_SESSION_ENTERED)
        sessionStorage.removeItem(VOID_SESSION_ZERO)
      } catch {
        // ignore
      }
      window.location.reload()
      return
    }

    if (action === 'show-state') {
      const pre = panel.querySelector('.cl-debug-state')
      pre.hidden = false
      pre.textContent = JSON.stringify(loadProgress(), null, 2)
    }
  })

  document.body.appendChild(panel)
}
