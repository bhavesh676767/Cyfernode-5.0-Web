import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, recordRateLimitAttempt } from '../_shared/rateLimit.ts'

const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type'

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 5
const MAX_BODY_BYTES = 2_000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req, ALLOW_HEADERS), 'Content-Type': 'application/json' },
  })
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')
    ?? req.headers.get('cf-connecting-ip')
    ?? 'unknown'
}

async function hashIp(ip: string) {
  const salt = Deno.env.get('RATE_LIMIT_SALT')
  if (!salt) throw new Error('RATE_LIMIT_SALT is not configured')
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? '').trim().toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req, ALLOW_HEADERS) })
  }

  if (req.method !== 'POST') {
    return json(req, { ok: false, error: 'Method not allowed' }, 405)
  }

  try {
    const rawBody = await req.text()
    if (rawBody.length > MAX_BODY_BYTES) {
      return json(req, { ok: false, error: 'Request too large' }, 413)
    }

    const body = rawBody ? JSON.parse(rawBody) : {}
    const email = normalizeEmail(body.email ?? body.schoolEmail)
    if (!email) {
      return json(req, { ok: false, error: 'Enter a valid school email address' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { ok: false, error: 'Server configuration error' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const ipHash = await hashIp(getClientIp(req))
    const rate = await checkRateLimit(
      supabase,
      'invite',
      ipHash,
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX,
    )

    if (!rate.allowed) {
      const status = rate.failedClosed ? 503 : 429
      const message = rate.failedClosed
        ? 'Rate limiting unavailable. Try again later.'
        : 'Too many requests. Try again later.'
      return json(req, { ok: false, error: message }, status)
    }

    await recordRateLimitAttempt(supabase, 'invite', ipHash)

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent, error: recentError } = await supabase
      .from('invite_requests')
      .select('id')
      .eq('school_email', email)
      .gte('submitted_at', oneDayAgo)
      .limit(1)

    if (recentError) {
      console.error('request-invite recent check:', recentError)
      return json(req, { ok: false, error: 'Could not submit request' }, 500)
    }

    if (recent?.length) {
      return json(req, { ok: true, duplicate: true, message: 'We already received a request from this email recently.' })
    }

    const { error: insertError } = await supabase
      .from('invite_requests')
      .insert({ school_email: email })

    if (insertError) {
      console.error('request-invite insert:', insertError)
      return json(req, { ok: false, error: 'Could not submit request' }, 500)
    }

    return json(req, { ok: true, message: 'Invite request received. We will contact your school soon.' })
  } catch (err) {
    console.error('request-invite error:', err)
    return json(req, { ok: false, error: 'Unexpected server error' }, 500)
  }
})
