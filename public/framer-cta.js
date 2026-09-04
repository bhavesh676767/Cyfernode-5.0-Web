(function () {

  if (window.__cyfernodeFramerCtaEnabled) return

  window.__cyfernodeFramerCtaEnabled = true



  var REGISTER_PATH = '/register'
  var PROMPTS_PATH = '/prompts'
  var TEAM_PATH = '/team'
  var REGISTER_CONTAINER = '.framer-1umqj66-container'
  var INVITE_CONTAINER = '.framer-13hwuku-container'
  var PROMPTS_SELECTORS = ['.framer-le5629', '[data-framer-appear-id="le5629"]']
  var SOCIALS_SELECTORS = ['.framer-5q2vr0', '[data-framer-appear-id="5q2vr0"]']
  var TEAM_SELECTORS = ['.framer-1o95l5b', '[data-framer-appear-id="1o95l5b"]']
  var BROCHURE_PATH = '/CyferNode_5.0_Official_Event_Brochure_2026.pdf'



  function normalizeLabel(value) {

    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()

  }



  function getMenuItemTitle(menuItem) {

    if (!(menuItem instanceof Element)) return ''



    var pageName = menuItem.querySelector('[data-framer-name="Page Name"]')

    if (!pageName) return ''



    var letters = []

    pageName.querySelectorAll('span').forEach(function (span) {

      if (span.children.length) return

      var text = span.textContent.trim()

      if (text) letters.push(text)

    })



    return letters.join('').toLowerCase()

  }



  function isHomeMenuItem(el) {

    if (!(el instanceof Element)) return false

    var title = getMenuItemTitle(el)

    if (title === 'home' || title.indexOf('home') !== -1) return true

    var text = normalizeLabel(el.textContent)

    return text.indexOf('home') === 0 || text.indexOf('home 01') === 0 || text.indexOf('01 home') !== -1

  }



  function isPromptsMenuItem(el) {
    if (!(el instanceof Element)) return false
    if (el.matches('.framer-le5629') || el.matches('[data-framer-appear-id="le5629"]')) return true
    var title = getMenuItemTitle(el)
    if (title === 'prompts' || title.indexOf('prompts') !== -1) return true
    var text = normalizeLabel(el.textContent)
    return text.indexOf('prompts') === 0 || text.indexOf('prompts 02') === 0 || text.indexOf('02 prompts') !== -1
  }

  function isSocialsMenuItem(el) {
    if (!(el instanceof Element)) return false
    if (el.matches('.framer-5q2vr0') || el.matches('[data-framer-appear-id="5q2vr0"]')) return true
    var title = getMenuItemTitle(el)
    if (title === 'socials' || title.indexOf('socials') !== -1) return true
    var text = normalizeLabel(el.textContent)
    return text.indexOf('socials') === 0 || text.indexOf('socials 03') === 0 || text.indexOf('03 socials') !== -1
  }



  function isTeamMenuItem(el) {

    if (!(el instanceof Element)) return false

    if (el.matches('.framer-1o95l5b') || el.matches('[data-framer-appear-id="1o95l5b"]')) return true

    var title = getMenuItemTitle(el)

    if (title === 'team' || title.indexOf('team') !== -1) return true

    var text = normalizeLabel(el.textContent)

    return text.indexOf('team') === 0 || text.indexOf('team 04') === 0 || text.indexOf('04 team') !== -1

  }



  function homeTrigger(el) {

    if (!(el instanceof Element)) return null

    var menuItem = el.closest('[data-framer-name="Menu Item"]')

    if (menuItem && isHomeMenuItem(menuItem)) return menuItem

    if (isHomeMenuItem(el)) return el

    var button = framerButton(el)

    if (button) {

      var label = normalizeLabel(button.textContent)

      if (label === 'home' || label === 'home home') return button

    }

    return null

  }



  function socialsTrigger(el) {

    if (!(el instanceof Element)) return null

    var menuItem = el.closest('[data-framer-name="Menu Item"]')

    if (menuItem && isSocialsMenuItem(menuItem)) return menuItem



    for (var i = 0; i < SOCIALS_SELECTORS.length; i += 1) {

      var match = el.closest(SOCIALS_SELECTORS[i])

      if (match) return match

    }



    return null

  }



  function teamTrigger(el) {

    if (!(el instanceof Element)) return null

    var menuItem = el.closest('[data-framer-name="Menu Item"]')

    if (menuItem && isTeamMenuItem(menuItem)) return menuItem



    for (var i = 0; i < TEAM_SELECTORS.length; i += 1) {

      var match = el.closest(TEAM_SELECTORS[i])

      if (match) return match

    }



    if (isTeamMenuItem(el)) return el

    var container = el.closest('.framer-vwn2k8-container')

    if (container) return container.querySelector('a, button') || container

    var button = framerButton(el)

    if (button) {

      var label = normalizeLabel(button.textContent)

      if (label === 'our team' || label === 'our team our team' || label === 'team' || label === 'team team' || label.indexOf('our team') !== -1) {

        return button

      }

    }

    var link = el.closest('a')

    if (link) {

      var href = link.getAttribute('href') || ''

      if (href === '/team' || href === './team' || href === '/team/' || href === './team/') {

        return link

      }

      var linkText = normalizeLabel(link.textContent)

      if (linkText === 'team' || linkText === 'our team' || linkText === 'our team our team') {

        return link

      }

    }

    return null

  }



  function framerButton(el) {

    return el instanceof Element

      ? el.closest('[data-framer-name="Scaling Button"], [data-framer-name="Fluid Button"]')

      : null

  }



  function registerTrigger(el) {

    if (!(el instanceof Element)) return null



    var container = el.closest(REGISTER_CONTAINER)

    if (container) return container.querySelector('a, button') || container



    var button = framerButton(el)

    if (!button) return null



    var label = normalizeLabel(button.textContent)

    if (label === 'register' || label === 'register register') return button

    return null

  }



  function inviteTrigger(el) {

    if (!(el instanceof Element)) return null



    var container = el.closest(INVITE_CONTAINER)

    if (container) return container.querySelector('a, button') || container



    var button = framerButton(el)

    if (!button) return null



    var label = normalizeLabel(button.textContent)

    if (label === 'request invite' || label === 'request invite request invite') return button



    return null

  }



  function brochureTrigger(el) {

    if (!(el instanceof Element)) return null

    var button = el.closest('[data-framer-name="Scaling Button"], [data-framer-name="Fluid Button"], a, button') || el

    var label = normalizeLabel(button.textContent)

    if (label.indexOf('brochure') !== -1) return button

    return null

  }



  function promptsTrigger(el) {

    if (!(el instanceof Element)) return null



    var menuItem = el.closest('[data-framer-name="Menu Item"]')

    if (menuItem && isPromptsMenuItem(menuItem)) return menuItem



    for (var i = 0; i < PROMPTS_SELECTORS.length; i += 1) {

      var match = el.closest(PROMPTS_SELECTORS[i])

      if (match) return match

    }



    return null

  }



  function navigateToHome() {

    if (window.location.pathname === '/' || window.location.pathname === '') {

      window.scrollTo({ top: 0, behavior: 'smooth' })

    } else {

      window.location.assign('/')

    }

  }



  var prefetched = new Set()

  function prefetchUrl(url) {
    if (!url || typeof url !== 'string') return
    var cleanUrl = url.split('#')[0].split('?')[0]
    if (!cleanUrl || prefetched.has(cleanUrl)) return
    if (cleanUrl === window.location.pathname) return

    prefetched.add(cleanUrl)

    try {
      var link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = cleanUrl
      link.as = 'document'
      document.head.appendChild(link)
    } catch (e) {}

    if (window.fetch) {
      try {
        window.fetch(cleanUrl, { priority: 'low', mode: 'no-cors' }).catch(function () {})
      } catch (e) {}
    }
  }

  function idlePrefetchRoutes() {
    var routes = [REGISTER_PATH, PROMPTS_PATH, TEAM_PATH, '/']
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(function () {
        routes.forEach(prefetchUrl)
      }, { timeout: 1500 })
    } else {
      setTimeout(function () {
        routes.forEach(prefetchUrl)
      }, 600)
    }
  }

  function smoothNavigate(targetPath) {
    if (!targetPath) return
    var current = window.location.pathname
    if (current === targetPath || (targetPath === '/' && current === '')) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (document.startViewTransition) {
      try {
        document.startViewTransition(function () {
          window.location.assign(targetPath)
        })
        return
      } catch (e) {}
    }

    window.location.assign(targetPath)
  }

  function navigateToHome() {
    smoothNavigate('/')
  }

  function navigateToRegister() {
    smoothNavigate(REGISTER_PATH)
  }

  function navigateToPrompts() {
    smoothNavigate(PROMPTS_PATH)
  }

  function navigateToTeam() {
    smoothNavigate(TEAM_PATH)
  }



  function wireHomeLinks() {

    document.querySelectorAll('[data-framer-name="Menu Item"]').forEach(function (link) {

      if (!isHomeMenuItem(link)) return

      link.setAttribute('href', '/')

    })

    document.querySelectorAll('[data-framer-name="Scaling Button"], [data-framer-name="Fluid Button"]').forEach(function (link) {

      var label = normalizeLabel(link.textContent)

      if (label === 'home' || label === 'home home') {

        link.setAttribute('href', '/')

      }

    })

  }



  function wireTeamLinks() {

    document.querySelectorAll('[data-framer-name="Menu Item"]').forEach(function (link) {

      if (!isTeamMenuItem(link)) return

      link.setAttribute('href', TEAM_PATH)

    })



    TEAM_SELECTORS.forEach(function (selector) {

      document.querySelectorAll(selector).forEach(function (link) {

        link.setAttribute('href', TEAM_PATH)

      })

    })



    document.querySelectorAll('.framer-vwn2k8-container a, .framer-5qc1o0').forEach(function (link) {

      link.setAttribute('href', TEAM_PATH)

    })



    document.querySelectorAll('[data-framer-name="Scaling Button"], [data-framer-name="Fluid Button"]').forEach(function (link) {

      var label = normalizeLabel(link.textContent)

      if (label === 'our team' || label === 'our team our team' || label === 'team' || label === 'team team' || label.indexOf('our team') !== -1) {

        link.setAttribute('href', TEAM_PATH)

      }

    })

  }



  function wireRegisterLinks() {
    document.querySelectorAll(REGISTER_CONTAINER + ' a, ' + REGISTER_CONTAINER + ' [data-framer-name="Scaling Button"]').forEach(function (link) {
      link.setAttribute('href', REGISTER_PATH)
    })

    document.querySelectorAll('[data-framer-name="Scaling Button"], [data-framer-name="Fluid Button"]').forEach(function (link) {
      var label = normalizeLabel(link.textContent)
      if (label === 'register' || label === 'register register') {
        link.setAttribute('href', REGISTER_PATH)
      }
    })
  }

  function wirePromptsLinks() {
    document.querySelectorAll('[data-framer-name="Menu Item"]').forEach(function (link) {
      if (!isPromptsMenuItem(link)) return
      link.setAttribute('href', PROMPTS_PATH)
    })

    PROMPTS_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (link) {
        link.setAttribute('href', PROMPTS_PATH)
      })
    })
  }

  function wireSocialsLinks() {
    document.querySelectorAll('[data-framer-name="Menu Item"]').forEach(function (link) {
      if (!isSocialsMenuItem(link)) return
      link.setAttribute('href', '/#socials')
    })

    SOCIALS_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (link) {
        link.setAttribute('href', '/#socials')
      })
    })
  }

  function wireInviteLinks() {
    document.querySelectorAll(INVITE_CONTAINER + ' a, ' + INVITE_CONTAINER + ' [data-framer-name="Scaling Button"]').forEach(function (link) {
      link.setAttribute('href', '#invite')
    })

    document.querySelectorAll('[data-framer-name="Scaling Button"], [data-framer-name="Fluid Button"]').forEach(function (link) {
      var label = normalizeLabel(link.textContent)
      if (label === 'request invite' || label === 'request invite request invite') {
        link.setAttribute('href', '#invite')
      }
    })
  }

  function wireLinks() {
    wireHomeLinks()
    wireTeamLinks()
    wireRegisterLinks()
    wirePromptsLinks()
    wireSocialsLinks()
    wireInviteLinks()
  }

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!(event.target instanceof Element)) return

    if (brochureTrigger(event.target)) {
      event.preventDefault()
      event.stopPropagation()
      window.open(BROCHURE_PATH, '_blank', 'noopener,noreferrer')
      return
    }

    if (inviteTrigger(event.target)) {
      event.preventDefault()
      event.stopPropagation()
      window.dispatchEvent(new CustomEvent('cyfernode:open-invite-modal'))
      return
    }

    if (socialsTrigger(event.target)) {
      event.preventDefault()
      event.stopPropagation()
      if (window.location.pathname === '/' || window.location.pathname === '') {
        window.dispatchEvent(new CustomEvent('cyfernode:open-socials-modal'))
      } else {
        window.location.assign('/#socials')
      }
      return
    }

    if (homeTrigger(event.target)) {
      event.preventDefault()
      event.stopPropagation()
      navigateToHome()
      return
    }

    if (teamTrigger(event.target)) {
      event.preventDefault()
      event.stopPropagation()
      navigateToTeam()
      return
    }

    if (promptsTrigger(event.target)) {
      event.preventDefault()
      event.stopPropagation()
      navigateToPrompts()
      return
    }

    if (registerTrigger(event.target)) {
      event.preventDefault()
      event.stopPropagation()
      navigateToRegister()
      return
    }
  }, true)

  function prefetchTarget(target) {
    if (!(target instanceof Element)) return
    if (homeTrigger(target)) {
      prefetchUrl('/')
    } else if (teamTrigger(target)) {
      prefetchUrl(TEAM_PATH)
    } else if (promptsTrigger(target)) {
      prefetchUrl(PROMPTS_PATH)
    } else if (registerTrigger(target)) {
      prefetchUrl(REGISTER_PATH)
    } else {
      var a = target.closest('a')
      if (a && a.href && a.origin === window.location.origin) {
        prefetchUrl(a.pathname)
      }
    }
  }

  document.addEventListener('pointerenter', function (e) {
    prefetchTarget(e.target)
  }, { capture: true, passive: true })

  document.addEventListener('touchstart', function (e) {
    prefetchTarget(e.target)
  }, { capture: true, passive: true })

  document.addEventListener('focusin', function (e) {
    prefetchTarget(e.target)
  }, { capture: true, passive: true })

  function injectPerformanceStyles() {
    if (document.getElementById('cyfernode-perf-styles')) return
    var style = document.createElement('style')
    style.id = 'cyfernode-perf-styles'
    style.textContent = [
      '@view-transition { navigation: auto; }',
      'html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }',
      '::view-transition-old(root) { animation: 90ms cubic-bezier(0.4, 0, 1, 1) both fade-out; }',
      '::view-transition-new(root) { animation: 140ms cubic-bezier(0, 0, 0.2, 1) both fade-in; }',
      '@keyframes fade-out { to { opacity: 0; } }',
      '@keyframes fade-in { from { opacity: 0; } }'
    ].join('\n')
    document.head.appendChild(style)
  }

  function blockBadge() {
    var selectors = [
      '#__framer-badge-container',
      '.__framer-badge',
      'a[href*="framer.com"][data-framer-name]',
      'div[data-framer-name="Light"][data-nosnippet="true"]',
    ]
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        node.remove()
      })
    })
  }

  function init() {
    injectPerformanceStyles()
    wireLinks()
    blockBadge()
    idlePrefetchRoutes()

    new MutationObserver(function () {
      wireLinks()
      blockBadge()
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  }



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', init)

  } else {

    init()

  }

})()

