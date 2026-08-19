const FRAMER_SELECTORS = ['#main']

export function isHomePath(pathname) {
  return pathname === '/' || pathname === ''
}

export function syncFramerHost(pathname) {
  const showFramer = isHomePath(pathname)

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
