import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-password, x-admin-role',
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 30

type AdminRole = 'core' | 'team'

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? req.headers.get('x-connecting-ip') ?? 'unknown'
}

async function hashIp(ip: string) {
  const salt = Deno.env.get('RATE_LIMIT_SALT') ?? 'cyfernode-admin-v1'
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function checkRateLimit(supabase: ReturnType<typeof createClient>, ipHash: string) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count, error } = await supabase
    .from('registration_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', `admin:${ipHash}`)
    .gte('attempted_at', windowStart)

  if (error) return { allowed: true }
  return { allowed: (count ?? 0) < RATE_LIMIT_MAX }
}

async function recordAttempt(supabase: ReturnType<typeof createClient>, ipHash: string) {
  await supabase.from('registration_rate_limits').insert({ ip_hash: `admin:${ipHash}` })
}

function parseRole(req: Request, body: Record<string, unknown>): AdminRole {
  const header = req.headers.get('x-admin-role')?.trim().toLowerCase()
  if (header === 'team') return 'team'
  if (header === 'core') return 'core'
  return body.role === 'team' ? 'team' : 'core'
}

function getAdminPassword(req: Request, body: Record<string, unknown>) {
  const header = req.headers.get('x-admin-password')?.trim()
  if (header) return header
  return typeof body.password === 'string' ? body.password.trim() : ''
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
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const role = parseRole(req, body as Record<string, unknown>)
    const provided = getAdminPassword(req, body as Record<string, unknown>)

    if (!provided) {
      return json({ ok: false, error: 'Invalid password' }, 401)
    }

    const auth = verifyAdmin(role, provided)
    if (!auth.ok) {
      const status = auth.error === 'Invalid password' ? 401 : 503
      return json({ ok: false, error: auth.error }, status)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: 'Server configuration error' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const ipHash = await hashIp(getClientIp(req))
    const rate = await checkRateLimit(supabase, ipHash)

    if (!rate.allowed) {
      return json({ ok: false, error: 'Too many requests. Try again later.' }, 429)
    }

    await recordAttempt(supabase, ipHash)

    let rows: RegistrationRow[]
    let inviteRequests: InviteRequestRow[] = []
    try {
      rows = await loadRegistrations(supabase)
      if (auth.role === 'core') {
        inviteRequests = await loadInviteRequests(supabase)
      }
    } catch (queryError) {
      console.error('admin-list query:', queryError)
      return json({ ok: false, error: 'Could not load registrations' }, 500)
    }

    return json({
      ok: true,
      role: auth.role,
      registrations: rows,
      count: rows.length,
      invite_requests: inviteRequests,
      invite_count: inviteRequests.length,
    })
  } catch (err) {
    console.error('admin-list error:', err)
    return json({ ok: false, error: 'Unexpected server error' }, 500)
  }
})
