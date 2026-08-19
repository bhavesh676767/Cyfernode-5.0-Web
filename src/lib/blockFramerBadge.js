const BADGE_SELECTORS = [
  '#__framer-badge-container',
  '.__framer-badge',
  'a[href="https://www.framer.com"][data-framer-name]',
]

function hideBadgeNodes(root = document) {
  for (const selector of BADGE_SELECTORS) {
    root.querySelectorAll?.(selector).forEach((node) => {
      node.setAttribute('hidden', '')
      node.setAttribute('aria-hidden', 'true')
      node.style.setProperty('display', 'none', 'important')
      node.style.setProperty('visibility', 'hidden', 'important')
      node.style.setProperty('opacity', '0', 'important')
      node.style.setProperty('pointer-events', 'none', 'important')
    })
  }
}

export function blockFramerBadge() {
  hideBadgeNodes()

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue
        hideBadgeNodes(node)
        if (
          node.id === '__framer-badge-container' ||
          node.classList?.contains('__framer-badge')
        ) {
          hideBadgeNodes(node.parentElement ?? document)
        }
      }
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  return observer
}
