let lockCount = 0
let savedStyles = null

function getScrollbarWidth() {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth)
}

function supportsScrollbarGutter() {
  return typeof CSS !== 'undefined' && CSS.supports('scrollbar-gutter', 'stable')
}

/**
 * Prevents background scroll without shifting layout when the scrollbar hides.
 * Ref-counted so overlapping overlays (menu + modal) unlock cleanly.
 */
export function lockPageScroll(lockClass) {
  if (lockCount === 0) {
    savedStyles = {
      lockClass,
      htmlOverflow: document.documentElement.style.overflow,
      htmlPaddingRight: document.documentElement.style.paddingRight,
      bodyOverflow: document.body.style.overflow,
      bodyPaddingRight: document.body.style.paddingRight,
    }

    if (lockClass) {
      document.documentElement.classList.add(lockClass)
    }

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    if (!supportsScrollbarGutter()) {
      const scrollbarWidth = getScrollbarWidth()
      if (scrollbarWidth > 0) {
        const padding = `${scrollbarWidth}px`
        document.documentElement.style.paddingRight = padding
        document.body.style.paddingRight = padding
      }
    }
  }

  lockCount += 1

  return () => {
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount !== 0 || !savedStyles) return

    if (savedStyles.lockClass) {
      document.documentElement.classList.remove(savedStyles.lockClass)
    }

    document.documentElement.style.overflow = savedStyles.htmlOverflow
    document.documentElement.style.paddingRight = savedStyles.htmlPaddingRight
    document.body.style.overflow = savedStyles.bodyOverflow
    document.body.style.paddingRight = savedStyles.bodyPaddingRight
    savedStyles = null
  }
}
