import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, recordRateLimitAttempt } from '../_shared/rateLimit.ts'

const ALLOW_HEADERS =
  'authorization, x-client-info, apikey, content-type, x-admin-password, x-admin-role'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 60
const AUTH_FAIL_WINDOW_MS = 15 * 60 * 1000
const AUTH_FAIL_MAX = 10

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GRADES = new Set(['9th', '10th', '11th', '12th'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const EVENTS: Record<string, { maxParticipants: number }> = {
  'fontastic': { maxParticipants: 2 },
  'blendered': { maxParticipants: 2 },
  'unscripted': { maxParticipants: 4 },
  'clue-less': { maxParticipants: 2 },
  'runtime-terror': { maxParticipants: 2 },
  'buildout': { maxParticipants: 4 },
  'breadboard': { maxParticipants: 2 },
  'wireframe': { maxParticipants: 2 },
  'entrepreneur-exe': { maxParticipants: 2 },
  'unbranded': { maxParticipants: 3 },
}

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

function verifyCoreAdmin(role: AdminRole, provided: string) {
  if (role !== 'core') {
    return { ok: false as const, error: 'Only core admin can change registrations', status: 403 }
  }

  const corePassword = Deno.env.get('ADMIN_PASSWORD_CORE')
  if (!corePassword) return { ok: false as const, error: 'Core admin access is not configured', status: 503 }
  if (provided !== corePassword) return { ok: false as const, error: 'Invalid password', status: 401 }
  return { ok: true as const }
}

function cleanPhone(value: unknown) {
  return String(value ?? '').replace(/^'/, '').trim()
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, '')
}

function trimStr(value: unknown, maxLen: number) {
  const s = String(value ?? '').trim()
  if (!s || s.length > maxLen) return null
  return s
}

function normalizeSchoolKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function formatSchoolCode(num: number) {
  return `CYN${String(num).padStart(2, '0')}`
}

async function getOrCreateSchoolCode(
  supabase: ReturnType<typeof createClient>,
  schoolName: string,
): Promise<string> {
  const trimmed = schoolName.trim()
  if (!trimmed) throw new Error('Missing school name')

  const schoolKey = normalizeSchoolKey(trimmed)

  const { data: existing, error: lookupError } = await supabase
    .from('schools')
    .select('school_code')
    .eq('school_name_key', schoolKey)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (existing?.school_code) return existing.school_code

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: maxRows, error: maxError } = await supabase
      .from('schools')
      .select('code_num')
      .order('code_num', { ascending: false })
      .limit(1)

    if (maxError) throw maxError

    const nextNum = (maxRows?.[0]?.code_num ?? 0) + 1
    const schoolCode = formatSchoolCode(nextNum)

    const { error: insertError } = await supabase.from('schools').insert({
      school_name: trimmed,
      school_name_key: schoolKey,
      school_code: schoolCode,
      code_num: nextNum,
    })

    if (!insertError) return schoolCode

    if (insertError.code === '23505') {
      const { data: retry, error: retryError } = await supabase
        .from('schools')
        .select('school_code')
        .eq('school_name_key', schoolKey)
        .maybeSingle()

      if (retryError) throw retryError
      if (retry?.school_code) return retry.school_code
      continue
    }

    throw insertError
  }

  throw new Error('Could not assign school code')
}

type ParticipantInput = {
  name: string
  email: string
  phone: string
  grade: string
}

function validateParticipants(
  eventId: string,
  raw: unknown,
): { ok: true; participants: ParticipantInput[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || !raw.length) {
    return { ok: false, error: 'At least one participant is required' }
  }

  const eventConfig = EVENTS[eventId]
  if (!eventConfig) return { ok: false, error: 'Unknown event' }

  if (raw.length > eventConfig.maxParticipants) {
    return {
      ok: false,
      error: `This event allows at most ${eventConfig.maxParticipants} participants`,
    }
  }

  const participants: ParticipantInput[] = []

  for (let i = 0; i < raw.length; i += 1) {
    const part = raw[i]
    if (!part || typeof part !== 'object') {
      return { ok: false, error: `Participant ${i + 1} is invalid` }
    }

    const row = part as Record<string, unknown>
    const name = trimStr(row.name, 120)
    const email = trimStr(row.email, 254)
    const phone = cleanPhone(row.phone)
    const grade = trimStr(row.grade, 16)

    if (!name || !email || !phone || !grade) {
      return { ok: false, error: `Participant ${i + 1} has missing fields` }
    }

    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: `Participant ${i + 1} has invalid email` }
    }

    if (phoneDigits(phone).length < 8) {
      return { ok: false, error: `Participant ${i + 1} has invalid phone` }
    }

    if (!GRADES.has(grade)) {
      return { ok: false, error: `Participant ${i + 1} has invalid grade` }
    }

    participants.push({ name, email, phone, grade })
  }

  return { ok: true, participants }
}

function requireUuid(value: unknown, label: string) {
  const id = typeof value === 'string' ? value.trim() : ''
  if (!UUID_RE.test(id)) return { ok: false as const, error: `Invalid ${label}` }
  return { ok: true as const, id }
}

async function deleteRegistration(
  supabase: ReturnType<typeof createClient>,
  registrationId: string,
) {
  const { data, error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', registrationId)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) return { ok: false as const, error: 'Registration not found' }
  return { ok: true as const }
}

async function deleteEventRegistration(
  supabase: ReturnType<typeof createClient>,
  eventRegistrationId: string,
) {
  const { data: existing, error: fetchError } = await supabase
    .from('event_registrations')
    .select('id, registration_id')
    .eq('id', eventRegistrationId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) return { ok: false as const, error: 'Event registration not found' }

  const { error: deleteError } = await supabase
    .from('event_registrations')
    .delete()
    .eq('id', eventRegistrationId)

  if (deleteError) throw deleteError

  const { count, error: countError } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('registration_id', existing.registration_id)

  if (countError) throw countError

  if ((count ?? 0) === 0) {
    await supabase.from('registrations').delete().eq('id', existing.registration_id)
  }

  return { ok: true as const, removedRegistration: (count ?? 0) === 0 }
}

async function updateEventRegistration(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const idResult = requireUuid(body.eventRegistrationId, 'event registration ID')
  if (!idResult.ok) return idResult

  const { data: existing, error: fetchError } = await supabase
    .from('event_registrations')
    .select('id, registration_id, event_id, event_name')
    .eq('id', idResult.id)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) return { ok: false as const, error: 'Event registration not found' }

  const schoolName = trimStr(body.schoolName, 200)
  const teacherName = trimStr(body.teacherName, 120)
  const teacherEmail = trimStr(body.teacherEmail, 254)
  const teacherPhone = cleanPhone(body.teacherPhone)

  if (!schoolName || !teacherName || !teacherEmail || !teacherPhone) {
    return { ok: false as const, error: 'Missing school or teacher details' }
  }

  if (!EMAIL_RE.test(teacherEmail)) {
    return { ok: false as const, error: 'Invalid teacher email' }
  }

  if (phoneDigits(teacherPhone).length < 8) {
    return { ok: false as const, error: 'Invalid teacher phone' }
  }

  const validatedParts = validateParticipants(existing.event_id, body.participants)
  if (!validatedParts.ok) return validatedParts

  const schoolCode = await getOrCreateSchoolCode(supabase, schoolName)

  const { error: updateError } = await supabase
    .from('event_registrations')
    .update({
      school_name: schoolName,
      school_code: schoolCode,
      teacher_name: teacherName,
      teacher_phone: teacherPhone,
      teacher_email: teacherEmail,
    })
    .eq('id', idResult.id)

  if (updateError) throw updateError

  const { error: deletePartsError } = await supabase
    .from('participants')
    .delete()
    .eq('event_registration_id', idResult.id)

  if (deletePartsError) throw deletePartsError

  const participantRows = validatedParts.participants.map((p, index) => ({
    event_registration_id: idResult.id,
    participant_no: index + 1,
    name: p.name,
    email: p.email,
    phone: p.phone,
    grade: p.grade,
  }))

  const { error: insertPartsError } = await supabase
    .from('participants')
    .insert(participantRows)

  if (insertPartsError) throw insertPartsError

  return {
    ok: true as const,
    schoolCode,
    eventName: existing.event_name,
  }
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

    const auth = verifyCoreAdmin(role, provided)
    if (!auth.ok) {
      if (auth.error === 'Invalid password') {
        await recordRateLimitAttempt(supabase, 'admin-auth-fail', ipHash)
      }
      return json(req, { ok: false, error: auth.error }, auth.status)
    }

    const rate = await checkRateLimit(
      supabase,
      'admin-mutate',
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

    await recordRateLimitAttempt(supabase, 'admin-mutate', ipHash)

    const action = typeof body.action === 'string' ? body.action.trim() : ''

    if (action === 'delete_registration') {
      const idResult = requireUuid(body.registrationId, 'registration ID')
      if (!idResult.ok) return json(req, { ok: false, error: idResult.error }, 400)

      const result = await deleteRegistration(supabase, idResult.id)
      if (!result.ok) return json(req, { ok: false, error: result.error }, 404)
      return json(req, { ok: true, action, registrationId: idResult.id })
    }

    if (action === 'delete_event') {
      const idResult = requireUuid(body.eventRegistrationId, 'event registration ID')
      if (!idResult.ok) return json(req, { ok: false, error: idResult.error }, 400)

      const result = await deleteEventRegistration(supabase, idResult.id)
      if (!result.ok) return json(req, { ok: false, error: result.error }, 404)
      return json(req, {
        ok: true,
        action,
        eventRegistrationId: idResult.id,
        removedRegistration: result.removedRegistration,
      })
    }

    if (action === 'update_event') {
      const result = await updateEventRegistration(supabase, body)
      if (!result.ok) return json(req, { ok: false, error: result.error }, 400)
      return json(req, {
        ok: true,
        action,
        eventRegistrationId: body.eventRegistrationId,
        schoolCode: result.schoolCode,
        eventName: result.eventName,
      })
    }

    return json(req, { ok: false, error: 'Unknown action' }, 400)
  } catch (err) {
    console.error('admin-mutate error:', err)
    return json(req, { ok: false, error: 'Unexpected server error' }, 500)
  }
})
