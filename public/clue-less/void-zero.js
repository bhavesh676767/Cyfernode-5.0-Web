import { checkVoidAnswer } from './lib/puzzle.js'
import {
  loadProgress,
  saveProgress,
  completeVoidLevel,
  canSubmitVoidAnswer,
  syncVoid0Arrival,
} from './lib/state.js'
import { isDebugMode, mountDebugPanel } from './lib/debug.js'

const form = document.getElementById('answer-form')
const input = document.getElementById('answer')
const error = document.getElementById('submit-error')
const complete = document.getElementById('complete')

function syncAnswerForm(progress) {
  if (progress.void.completed) {
    complete.hidden = false
    form.hidden = true
    return
  }

  const canAnswer = canSubmitVoidAnswer(progress) || isDebugMode()
  form.hidden = !canAnswer

  if (!canAnswer) {
    input.disabled = true
    form.querySelector('button').disabled = true
    return
  }

  input.disabled = false
  form.querySelector('button').disabled = false
  input.focus({ preventScroll: true })
}

function init() {
  let progress = loadProgress()
  progress = syncVoid0Arrival(progress)
  saveProgress(progress)
  syncAnswerForm(progress)
}

init()

form.addEventListener('submit', (event) => {
  event.preventDefault()
  let progress = loadProgress()

  if (progress.void.completed) return

  if (!canSubmitVoidAnswer(progress) && !isDebugMode()) {
    error.textContent = ''
    return
  }

  const result = checkVoidAnswer(input.value)

  if (!result.ok) {
    if (result.reason === 'empty') {
      error.textContent = ''
      return
    }

    error.textContent = 'INCORRECT.\n\nThe void remains.'
    return
  }

  error.textContent = ''
  progress = completeVoidLevel(progress)
  saveProgress(progress)
  syncAnswerForm(progress)
})

mountDebugPanel()
