(function () {

  if (window.__cyfernodeFramerCtaEnabled) return

  window.__cyfernodeFramerCtaEnabled = true



  var REGISTER_PATH = '/register'

  var PROMPTS_PATH = '/prompts'

  var REGISTER_CONTAINER = '.framer-1umqj66-container'

  var INVITE_CONTAINER = '.framer-13hwuku-container'

  var PROMPTS_SELECTORS = ['.framer-le5629', '[data-framer-appear-id="le5629"]']

  var SOCIALS_SELECTORS = ['.framer-5q2vr0', '[data-framer-appear-id="5q2vr0"]']

  var TEAM_SELECTORS = ['.framer-1o95l5b', '[data-framer-appear-id="1o95l5b"]', 'a[href*="team"]']

  var BROCHURE_PATH = '/CyferNode_5.0_Official_Event_Brochure_2026.pdf'



  // Handle direct navigation to /team or /team/

  var pathname = window.location.pathname.replace(/\/$/, '')

  if (pathname === '/team') {

    try {

      sessionStorage.setItem('cyfernode_autoclick_team', 'true')

    } catch (e) {}

    window.location.replace('/?action=click-team')

    return

  }



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

    if (getMenuItemTitle(el) === 'prompts') return true



    for (var i = 0; i < PROMPTS_SELECTORS.length; i += 1) {

      if (el.matches(PROMPTS_SELECTORS[i])) return true

    }



    return false

  }



  function isSocialsMenuItem(el) {

    if (!(el instanceof Element)) return false

    if (getMenuItemTitle(el) === 'socials') return true



    for (var i = 0; i < SOCIALS_SELECTORS.length; i += 1) {

      if (el.matches(SOCIALS_SELECTORS[i])) return true

    }



    return false

  }



  function isTeamMenuItem(el) {

    if (!(el instanceof Element)) return false

    var title = getMenuItemTitle(el)

    if (title === 'team' || title.indexOf('team') !== -1) return true



    for (var i = 0; i < TEAM_SELECTORS.length; i += 1) {

      if (el.matches(TEAM_SELECTORS[i])) return true

    }



    var text = normalizeLabel(el.textContent)

    return text.indexOf('team') !== -1

  }



  function homeTrigger(el) {

    if (!(el instanceof Element)) return null

    var menuItem = el.closest('[data-framer-name="Menu Item"]')

    if (menuItem && isHomeMenuItem(menuItem)) return menuItem

    if (isHomeMenuItem(el)) return el

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



  function cleanupNavigationState() {

    document.documentElement.classList.remove('is-navigating-to-register')

  }



  window.addEventListener('pageshow', cleanupNavigationState)

  window.addEventListener('popstate', cleanupNavigationState)

  cleanupNavigationState()



  function navigateToRegister() {

    if (window.location.pathname === REGISTER_PATH) return

    document.documentElement.classList.add('is-navigating-to-register')

    window.setTimeout(function () {

      window.location.assign(REGISTER_PATH)

    }, 180)

    window.setTimeout(cleanupNavigationState, 1500)

  }



  function navigateToPrompts() {

    if (window.location.pathname === PROMPTS_PATH) return

    window.location.assign(PROMPTS_PATH)

  }



  function findTeamButtonOrSection() {

    var items = document.querySelectorAll('[data-framer-name="Menu Item"]')

    for (var i = 0; i < items.length; i += 1) {

      if (isTeamMenuItem(items[i])) return items[i]

    }

    for (var j = 0; j < TEAM_SELECTORS.length; j += 1) {

      var match = document.querySelector(TEAM_SELECTORS[j])

      if (match) return match

    }

    return document.querySelector('[data-framer-name="Team"], #team')

  }



  function triggerTeamAction() {

    if (window.location.pathname !== '/' && window.location.pathname !== '') {

      try {

        sessionStorage.setItem('cyfernode_autoclick_team', 'true')

      } catch (e) {}

      window.location.assign('/?action=click-team')

      return

    }



    var attempts = 0

    function attempt() {

      attempts += 1

      var target = findTeamButtonOrSection()

      if (target) {

        if (target.getAttribute('data-framer-name') === 'Menu Item' || target.matches('.framer-1o95l5b')) {

          target.click()

        } else if (typeof target.scrollIntoView === 'function') {

          target.scrollIntoView({ behavior: 'smooth', block: 'start' })

        }

      } else if (attempts < 25) {

        setTimeout(attempt, 150)

      }

    }

    attempt()

  }



  function checkAutoClickTeam() {

    var shouldClick = false

    if (window.location.search.indexOf('action=click-team') !== -1) {

      shouldClick = true

      try {

        history.replaceState(null, '', window.location.pathname)

      } catch (e) {}

    }

    try {

      if (sessionStorage.getItem('cyfernode_autoclick_team') === 'true') {

        shouldClick = true

        sessionStorage.removeItem('cyfernode_autoclick_team')

      }

    } catch (e) {}



    if (shouldClick) {

      triggerTeamAction()

    }

  }



  function wireRegisterLinks() {

    document.querySelectorAll(REGISTER_CONTAINER + ' a[data-framer-name="Scaling Button"]').forEach(function (link) {

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

      link.setAttribute('href', '#socials')

    })



    SOCIALS_SELECTORS.forEach(function (selector) {

      document.querySelectorAll(selector).forEach(function (link) {

        link.setAttribute('href', '#socials')

      })

    })

  }



  function wireInviteLinks() {

    document.querySelectorAll(INVITE_CONTAINER + ' a[data-framer-name="Scaling Button"]').forEach(function (link) {

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

      window.dispatchEvent(new CustomEvent('cyfernode:open-socials-modal'))

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

      triggerTeamAction()

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

    }

  }, true)



  function init() {

    wireLinks()

    checkAutoClickTeam()



    new MutationObserver(wireLinks).observe(document.documentElement, {

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

