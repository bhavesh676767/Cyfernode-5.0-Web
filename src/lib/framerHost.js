const FRAMER_SELECTORS = ['#main']

/**
 * Paths React renders itself. The rest of the landing experience belongs to
 * the Framer document, so the Framer DOM has to stay visible.
 * Add a path here when you add a React route for it.
 *
 * "/register" is not one of them: it is a standalone document served from
 * public/register/index.html and never reached through this app.
 */
const REACT_PATHS = []
const REGISTER_PATH = '/register'
const REGISTER_TRIGGER_SELECTOR = '.framer-1umqj66-container'
const INVITE_TRIGGER_SELECTOR = '.framer-13hwuku-container'

export function isReactPath(pathname) {
  return REACT_PATHS.includes(pathname)
}

export function syncFramerHost(pathname) {
  const showFramer = !isReactPath(pathname)

  for (const selector of FRAMER_SELECTORS) {
    const node = document.querySelector(selector)
    if (node) {
      node.hidden = !showFramer
    }
  }

  const root = document.getElementById('cyfernode-react-root')
  if (root) {
    root.dataset.host = showFramer ? 'framer' : 'react'
  }

  document.body.style.background = showFramer ? '' : 'var(--color-surface)'
}

export function ensureReactRoot() {
  let root = document.getElementById('cyfernode-react-root')

  if (!root) {
    root = document.createElement('div')
    root.id = 'cyfernode-react-root'
    document.body.appendChild(root)
  }

  return root
}

export function canonicalizeIndexHtmlUrl() {
  const { pathname, search, hash } = window.location
  if (!pathname.endsWith('/index.html')) return

  const nextPath = pathname.replace(/index\.html$/, '') || '/'
  window.history.replaceState(null, '', `${nextPath}${search}${hash}`)
}

/**
 * The registration CTA is rendered by Framer, including its responsive
 * variants. Delegating the click from the document keeps every variant wired
 * without modifying the exported markup.
 *
 * `/register` is its own document, so this is a real navigation rather than a
 * client-side route change; the short delay lets the fade-out play first.
 */
export function enableRegistrationTrigger() {
  if (window.__cyfernodeFramerCtaEnabled || window.__cyfernodeRegisterTriggerEnabled) return
  window.__cyfernodeRegisterTriggerEnabled = true

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!(event.target instanceof Element)) return

    const trigger = event.target.closest(REGISTER_TRIGGER_SELECTOR)
    if (!trigger || window.location.pathname === REGISTER_PATH) return

    event.preventDefault()
    event.stopPropagation()
    document.documentElement.classList.add('is-navigating-to-register')

    window.setTimeout(() => {
      window.location.assign(REGISTER_PATH)
    }, 180)
  }, true)
}

/**
 * The invite request CTA is rendered by Framer. Open the React modal instead
 * of navigating away.
 */
export function enableInviteRequestTrigger() {
  if (window.__cyfernodeFramerCtaEnabled || window.__cyfernodeInviteTriggerEnabled) return
  window.__cyfernodeInviteTriggerEnabled = true

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!(event.target instanceof Element)) return

    const trigger = event.target.closest(INVITE_TRIGGER_SELECTOR)
    if (!trigger) return

    event.preventDefault()
    event.stopPropagation()
    window.dispatchEvent(new CustomEvent('cyfernode:open-invite-modal'))
  }, true)
}
