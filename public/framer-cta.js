(function () {

  if (window.__cyfernodeFramerCtaEnabled) return

  window.__cyfernodeFramerCtaEnabled = true



  var REGISTER_PATH = '/register'

  var PROMPTS_PATH = '/prompts'

  var REGISTER_CONTAINER = '.framer-1umqj66-container'

  var INVITE_CONTAINER = '.framer-13hwuku-container'

  var PROMPTS_SELECTORS = ['.framer-le5629', '[data-framer-appear-id="le5629"]']

  var SOCIALS_SELECTORS = ['.framer-5q2vr0', '[data-framer-appear-id="5q2vr0"]']



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

    return el.closest(INVITE_CONTAINER)

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



  function navigateToRegister() {

    if (window.location.pathname === REGISTER_PATH) return

    document.documentElement.classList.add('is-navigating-to-register')

    window.setTimeout(function () {

      window.location.assign(REGISTER_PATH)

    }, 180)

  }



  function navigateToPrompts() {

    if (window.location.pathname === PROMPTS_PATH) return

    window.location.assign(PROMPTS_PATH)

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



  function wireLinks() {

    wireRegisterLinks()

    wirePromptsLinks()

    wireSocialsLinks()

  }



  document.addEventListener('click', function (event) {

    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    if (!(event.target instanceof Element)) return



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


