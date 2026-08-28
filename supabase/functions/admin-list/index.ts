import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, recordRateLimitAttempt } from '../_shared/rateLimit.ts'

const ALLOW_HEADERS =
  'authorization, x-client-info, apikey, content-type, x-admin-password, x-admin-role'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 30
const AUTH_FAIL_WINDOW_MS = 15 * 60 * 1000
const AUTH_FAIL_MAX = 10

const EVENT_IDS = new Set([
  'fontastic',
  'blendered',
  'unscripted',
  'clue-less',
  'runtime-terror',
  'buildout',
  'breadboard',
  'wireframe',
  'entrepreneur-exe',
  'unbranded',
])

type AdminRole = 'core' | 'team'

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req, ALLOW_HEADERS), 'Content-Type': 'application/json' },
  })
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? req.headers.get('x-connecting-ip') ?? 'unknown'
}

async function hashIp(ip: string) {
  const salt = Deno.env.get('RATE_LIMIT_SALT')
  if (!salt) throw new Error('RATE_LIMIT_SALT is not configured')
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function parseRole(req: Request, body: Record<string, unknown>): AdminRole {
  const header = req.headers.get('x-admin-role')?.trim().toLowerCase()
  if (header === 'team') return 'team'
  if (header === 'core') return 'core'
  return body.role === 'team' ? 'team' : 'core'
}

function getAdminPassword(req: Request) {
  return req.headers.get('x-admin-password')?.trim() ?? ''
}

function parseTeamEventId(body: Record<string, unknown>) {
  const id = typeof body.eventId === 'string' ? body.eventId.trim() : ''
  if (!id || !EVENT_IDS.has(id)) {
    return { ok: false as const, error: 'Invalid or missing eventId for team access' }
  }
  return { ok: true as const, eventId: id }
}

function verifyAdmin(role: AdminRole, provided: string) {
  const corePassword = Deno.env.get('ADMIN_PASSWORD_CORE')
  const teamPassword = Deno.env.get('ADMIN_PASSWORD_TEAM')

  if (role === 'team') {
    if (!teamPassword) return { ok: false as const, error: 'Team admin access is not configured' }
    if (provided !== teamPassword) return { ok: false as const, error: 'Invalid password' }
    return { ok: true as const, role: 'team' as const }
  }

  if (!corePassword) return { ok: false as const, error: 'Core admin access is not configured' }
  if (provided !== corePassword) return { ok: false as const, error: 'Invalid password' }
  return { ok: true as const, role: 'core' as const }
}

type ParticipantRow = {
  event_registration_id: string
  participant_no: number
  name: string
  email: string
  phone: string
  grade: string
}

type EventRegistrationRow = {
  id: string
  registration_id: string
  event_id: string
  event_name: string
  event_category: string | null
  event_mode: string | null
  school_name: string
  school_code: string | null
  teacher_name: string
  teacher_phone: string
  teacher_email: string
  created_at: string
  participants: ParticipantRow[]
}

type RegistrationRow = {
  id: string
  registration_id: string
  mode: string
  submitted_at: string
  event_registrations: EventRegistrationRow[]
}

async function loadRegistrations(supabase: ReturnType<typeof createClient>) {
  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select('id, registration_id, mode, submitted_at')
    .order('submitted_at', { ascending: false })

  if (regError) throw regError

  const { data: eventRegs, error: evError } = await supabase
    .from('event_registrations')
    .select(`
      id,
      registration_id,
      event_id,
      event_name,
      event_category,
      event_mode,
      school_name,
      school_code,
      teacher_name,
      teacher_phone,
      teacher_email,
      created_at
    `)

  if (evError) throw evError

  const { data: participants, error: pError } = await supabase
    .from('participants')
    .select('event_registration_id, participant_no, name, email, phone, grade')

  if (pError) throw pError

  const participantsByEvent = new Map<string, ParticipantRow[]>()
  for (const participant of participants ?? []) {
    const list = participantsByEvent.get(participant.event_registration_id) ?? []
    list.push(participant)
    participantsByEvent.set(participant.event_registration_id, list)
  }

  const eventsByRegistration = new Map<string, EventRegistrationRow[]>()
  for (const eventReg of eventRegs ?? []) {
    const list = eventsByRegistration.get(eventReg.registration_id) ?? []
    list.push({
      ...eventReg,
      participants: [...(participantsByEvent.get(eventReg.id) ?? [])].sort(
        (a, b) => a.participant_no - b.participant_no,
      ),
    })
    eventsByRegistration.set(eventReg.registration_id, list)
  }

  return (registrations ?? []).map((registration) => ({
    ...registration,
    event_registrations: eventsByRegistration.get(registration.id) ?? [],
  })) as RegistrationRow[]
}

function filterRegistrationsForTeam(rows: RegistrationRow[], eventId: string) {
  return rows
    .map((registration) => ({
      ...registration,
      event_registrations: registration.event_registrations.filter(
        (eventReg) => eventReg.event_id === eventId,
      ),
    }))
    .filter((registration) => registration.event_registrations.length > 0)
}

function buildEventCounts(rows: RegistrationRow[]) {
  const counts: Record<string, number> = {}
  for (const eventId of EVENT_IDS) counts[eventId] = 0

  rows.forEach((registration) => {
    registration.event_registrations.forEach((eventReg) => {
      if (EVENT_IDS.has(eventReg.event_id)) {
        counts[eventReg.event_id] = (counts[eventReg.event_id] ?? 0) + 1
      }
    })
  })

  return counts
}

type InviteRequestRow = {
  id: string
  school_email: string
  submitted_at: string
}

async function loadInviteRequests(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('invite_requests')
    .select('id, school_email, submitted_at')
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as InviteRequestRow[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req, ALLOW_HEADERS) })
  }

  if (req.method !== 'POST') {
    return json(req, { ok: false, error: 'Method not allowed' }, 405)
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const role = parseRole(req, body)
    const provided = getAdminPassword(req)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { ok: false, error: 'Server configuration error' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const ipHash = await hashIp(getClientIp(req))

    const authFailRate = await checkRateLimit(
      supabase,
      'admin-auth-fail',
      ipHash,
      AUTH_FAIL_WINDOW_MS,
      AUTH_FAIL_MAX,
    )
    if (!authFailRate.allowed) {
      return json(req, { ok: false, error: 'Too many failed login attempts. Try again later.' }, 429)
    }

    if (!provided) {
      await recordRateLimitAttempt(supabase, 'admin-auth-fail', ipHash)
      return json(req, { ok: false, error: 'Invalid password' }, 401)
    }

    const auth = verifyAdmin(role, provided)
    if (!auth.ok) {
      if (auth.error === 'Invalid password') {
        await recordRateLimitAttempt(supabase, 'admin-auth-fail', ipHash)
      }
      const status = auth.error === 'Invalid password' ? 401 : 503
      return json(req, { ok: false, error: auth.error }, status)
    }

    const rate = await checkRateLimit(supabase, 'admin', ipHash, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)
    if (!rate.allowed) {
      const status = rate.failedClosed ? 503 : 429
      const message = rate.failedClosed
        ? 'Rate limiting unavailable. Try again later.'
        : 'Too many requests. Try again later.'
      return json(req, { ok: false, error: message }, status)
    }

    await recordRateLimitAttempt(supabase, 'admin', ipHash)

    let teamEventId: string | null = null
    if (auth.role === 'team') {
      const parsedEvent = parseTeamEventId(body)
      if (!parsedEvent.ok) {
        return json(req, { ok: false, error: parsedEvent.error }, 400)
      }
      teamEventId = parsedEvent.eventId
    }

    let rows: RegistrationRow[]
    let inviteRequests: InviteRequestRow[] = []
    try {
      rows = await loadRegistrations(supabase)
    } catch (queryError) {
      console.error('admin-list registrations query:', queryError)
      return json(req, { ok: false, error: 'Could not load registrations' }, 500)
    }

    const eventCounts = auth.role === 'team' ? buildEventCounts(rows) : undefined
    if (auth.role === 'team' && teamEventId) {
      rows = filterRegistrationsForTeam(rows, teamEventId)
    }

    if (auth.role === 'core') {
      try {
        inviteRequests = await loadInviteRequests(supabase)
      } catch (inviteError) {
        console.error('admin-list invite query:', inviteError)
        return json(req, { ok: false, error: 'Could not load invite requests' }, 500)
      }
    }

    return json(req, {
      ok: true,
      role: auth.role,
      registrations: rows,
      count: rows.length,
      event_counts: eventCounts,
      invite_requests: inviteRequests,
      invite_count: inviteRequests.length,
    })
  } catch (err) {
    console.error('admin-list error:', err)
    return json(req, { ok: false, error: 'Unexpected server error' }, 500)
  }
})
