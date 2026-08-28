import { loadProgress, isLevelUnlocked, saveProgress } from '/clue-less/lib/state.js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabasePublic'

export function getHuntProgress() {
  return loadProgress()
}

export function isEchoUnlocked() {
  return isLevelUnlocked(loadProgress(), 'echo')
}

export function isEchoComplete() {
  return loadProgress().completed.includes('echo')
}

export function markEchoComplete() {
  const progress = loadProgress()
  if (!progress.completed.includes('echo')) {
    progress.completed.push('echo')
    saveProgress(progress)
  }
  return progress
}

export async function submitEchoAnswer(answer, validationId) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, error: 'Submission service unavailable.' }
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/hunt-submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      levelId: 'echo',
      validationId,
      answer,
    }),
  })

  if (!response.ok) {
    return { ok: false, error: 'Could not verify answer.' }
  }

  const data = await response.json()
  if (data.correct) {
    markEchoComplete()
  }
  return { ok: true, ...data }
}
