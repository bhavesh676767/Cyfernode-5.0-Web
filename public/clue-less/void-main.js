import {
  loadProgress,
  saveProgress,
  markVoidStarted,
  markVoid0Discovered,
  markVoidEnteredSession,
  markVoidZeroSession,
} from './lib/state.js'
import { mountDebugPanel } from './lib/debug.js'

const landing = document.getElementById('landing')
const empty = document.getElementById('empty')
const footer = document.getElementById('footer')
const enterBtn = document.getElementById('enter-btn')
const zeroLink = document.getElementById('zero-link')

function showEmptyState() {
  let progress = markVoidStarted(loadProgress())
  markVoidEnteredSession()
  saveProgress(progress)

  landing.classList.add('is-fading')
  window.setTimeout(() => {
    landing.hidden = true
    landing.classList.remove('is-fading')
    empty.hidden = false
    footer.hidden = false
    document.title = '404'
  }, 420)
}

enterBtn.addEventListener('click', showEmptyState)

zeroLink.addEventListener('click', () => {
  markVoidZeroSession()
  let progress = markVoid0Discovered(loadProgress())
  saveProgress(progress)
})

mountDebugPanel()
