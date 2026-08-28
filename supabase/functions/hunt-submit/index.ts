import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, recordRateLimitAttempt } from '../_shared/rateLimit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type'
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 20

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req, ALLOW_HEADERS), 'Content-Type': 'application/json' },
  })
}

function normalizeAnswer(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
}

function getExpectedAnswer(validationId: string) {
  if (validationId === 'echo-final') {
    return Deno.env.get('HUNT_ECHO_ANSWER')?.trim().toUpperCase() ?? ''
  }
  return ''
}

async function hashIp(ip: string) {
  const salt = Deno.env.get('RATE_LIMIT_SALT')
  if (!salt) throw new Error('RATE_LIMIT_SALT is not configured')
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? req.headers.get('cf-connecting-ip') ?? 'unknown'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req, ALLOW_HEADERS) })
  }

  if (req.method !== 'POST') {
    return json(req, { correct: false, error: 'Method not allowed' }, 405)
  }

  try {
    const body = await req.json()
    const levelId = String(body.levelId ?? '').toLowerCase()
    const validationId = String(body.validationId ?? '')
    const answer = normalizeAnswer(body.answer)

    if (!levelId || !validationId || !answer) {
      return json(req, { correct: false, error: 'Invalid submission' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { correct: false, error: 'Server configuration error' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const ipHash = await hashIp(getClientIp(req))
    const rate = await checkRateLimit(supabase, 'hunt-submit', ipHash, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)
    if (!rate.allowed) {
      return json(req, { correct: false, error: 'Too many attempts' }, 429)
    }

    await recordRateLimitAttempt(supabase, 'hunt-submit', ipHash)

    const expected = getExpectedAnswer(validationId)
    if (!expected) {
      return json(req, { correct: false, error: 'Validation unavailable' }, 503)
    }

    const correct = answer === expected
    if (!correct) {
      return json(req, { correct: false })
    }

    const nextLevel = levelId === 'echo' ? 'mirror' : null
    const completedAt = new Date().toISOString()

    return json(req, {
      correct: true,
      completed: true,
      levelId,
      completedAt,
      nextLevel,
    })
  } catch {
    return json(req, { correct: false, error: 'Invalid request' }, 400)
  }
})
