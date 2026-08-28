import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, recordRateLimitAttempt } from '../_shared/rateLimit.ts'
import { sendRegistrationEmails, type EmailEvent, type RegistrationEmailContext } from './emails.ts'

const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type'

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 6
const MAX_BODY_BYTES = 48_000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REGISTRATION_ID_RE = /^CYFRN5_\d{10,20}$/
const GRADES = new Set(['9th', '10th', '11th', '12th'])

/** Allowed events and exact participant counts (must match the register form). */
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

function json(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req, ALLOW_HEADERS), 'Content-Type': 'application/json', ...extraHeaders },
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

function validatePayload(payload: unknown): { ok: true; data: RegistrationPayload } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid payload' }
  }

  const p = payload as Record<string, unknown>

  if (!REGISTRATION_ID_RE.test(String(p.registrationId ?? ''))) {
    return { ok: false, error: 'Invalid registration ID' }
  }

  if (p.registrationMode !== 'single' && p.registrationMode !== 'multi') {
    return { ok: false, error: 'Invalid registration mode' }
  }

  if (!Array.isArray(p.events) || !p.events.length || p.events.length > 10) {
    return { ok: false, error: 'Invalid events list' }
  }

  if (p.registrationMode === 'single' && p.events.length !== 1) {
    return { ok: false, error: 'Single mode requires exactly one event' }
  }

  const seenEventIds = new Set<string>()
  const validatedEvents: RegistrationEvent[] = []

  for (const raw of p.events) {
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: 'Invalid event entry' }
    }

    const ev = raw as Record<string, unknown>
    const eventId = trimStr(ev.eventId, 64)
    const eventConfig = eventId ? EVENTS[eventId] : null

    if (!eventId || !eventConfig) {
      return { ok: false, error: `Unknown event: ${ev.eventId}` }
    }

    if (seenEventIds.has(eventId)) {
      return { ok: false, error: 'Duplicate event in submission' }
    }
    seenEventIds.add(eventId)

    const eventName = trimStr(ev.eventName, 120)
    const schoolName = trimStr(ev.schoolName, 200)
    if (!eventName || !schoolName) {
      return { ok: false, error: 'Missing or invalid event name / school name' }
    }

    const teacherRaw = ev.teacherIncharge
    if (!teacherRaw || typeof teacherRaw !== 'object') {
      return { ok: false, error: 'Missing teacher details' }
    }

    const teacher = teacherRaw as Record<string, unknown>
    const teacherName = trimStr(teacher.name, 120)
    const teacherEmail = trimStr(teacher.email, 254)
    const teacherPhone = cleanPhone(teacher.phone)

    if (!teacherName || !teacherEmail || !teacherPhone) {
      return { ok: false, error: 'Missing teacher details' }
    }

    if (!EMAIL_RE.test(teacherEmail)) {
      return { ok: false, error: 'Invalid teacher email' }
    }

    if (phoneDigits(teacherPhone).length < 8) {
      return { ok: false, error: 'Invalid teacher phone' }
    }

    if (!Array.isArray(ev.participants)) {
      return { ok: false, error: 'Missing participants' }
    }

    const requiredCount = eventConfig.maxParticipants
    if (ev.participants.length !== requiredCount) {
      return {
        ok: false,
        error: `${eventName} requires exactly ${requiredCount} participants`,
      }
    }

    const participants: RegistrationParticipant[] = []

    for (let i = 0; i < ev.participants.length; i++) {
      const part = ev.participants[i]
      if (!part || typeof part !== 'object') {
        return { ok: false, error: 'Invalid participant entry' }
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

      participants.push({
        no: i + 1,
        name,
        email,
        phone,
        grade,
      })
    }

    validatedEvents.push({
      eventId,
      eventName,
      eventCategory: trimStr(ev.eventCategory, 120),
      eventMode: trimStr(ev.eventMode, 32),
      schoolName,
      teacherIncharge: {
        name: teacherName,
        phone: teacherPhone,
        email: teacherEmail,
      },
      participants,
    })
  }

  return {
    ok: true,
    data: {
      registrationId: String(p.registrationId),
      registrationMode: p.registrationMode as 'single' | 'multi',
      events: validatedEvents,
      confirmMerge: p.confirmMerge === true,
    },
  }
}

function normalizeSchoolKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizePersonName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeParticipantKey(name: string, schoolName: string, grade: string) {
  return `${normalizePersonName(name)}|${normalizeSchoolKey(schoolName)}|${grade.trim().toLowerCase()}`
}

function normalizeTeacherEmail(email: string) {
  return email.trim().toLowerCase()
}

type ParticipantConflict = {
  participantName: string
  grade: string
  schoolName: string
  existingEventId: string
  existingEventName: string
  newEventId: string
  newEventName: string
  existingSchoolCode?: string | null
  source: 'database' | 'submission'
}

type SchoolMatch = {
  schoolCode: string
  schoolName: string
  existingEvents: Array<{ eventId: string; eventName: string }>
}

type TeacherMatch = {
  teacherName: string
  teacherEmail: string
  schoolName: string
  schoolCode: string | null
  existingEvents: Array<{ eventId: string; eventName: string }>
}

type DuplicateAnalysis = {
  participantConflicts: ParticipantConflict[]
  schoolMatch: SchoolMatch | null
  teacherMatch: TeacherMatch | null
}

async function analyzeDuplicates(
  supabase: ReturnType<typeof createClient>,
  data: RegistrationPayload,
): Promise<DuplicateAnalysis> {
  const participantConflicts: ParticipantConflict[] = []
  const submissionEntries: Array<{
    eventId: string
    eventName: string
    schoolName: string
    name: string
    grade: string
    key: string
  }> = []

  for (const ev of data.events) {
    for (const p of ev.participants) {
      submissionEntries.push({
        eventId: ev.eventId,
        eventName: ev.eventName,
        schoolName: ev.schoolName,
        name: p.name,
        grade: p.grade,
        key: normalizeParticipantKey(p.name, ev.schoolName, p.grade),
      })
    }
  }

  const seenInSubmission = new Map<string, { eventId: string; eventName: string }>()
  for (const entry of submissionEntries) {
    const prev = seenInSubmission.get(entry.key)
    if (prev && prev.eventId !== entry.eventId) {
      participantConflicts.push({
        participantName: entry.name,
        grade: entry.grade,
        schoolName: entry.schoolName,
        existingEventId: prev.eventId,
        existingEventName: prev.eventName,
        newEventId: entry.eventId,
        newEventName: entry.eventName,
        source: 'submission',
      })
    } else if (!prev) {
      seenInSubmission.set(entry.key, { eventId: entry.eventId, eventName: entry.eventName })
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('event_registrations')
    .select(`
      event_id,
      event_name,
      school_name,
      school_code,
      teacher_name,
      teacher_phone,
      teacher_email,
      participants ( name, grade )
    `)

  if (existingError) throw existingError

  const conflictKeys = new Set<string>()
  for (const row of existingRows ?? []) {
    for (const p of row.participants ?? []) {
      const key = normalizeParticipantKey(p.name, row.school_name, p.grade)
      for (const entry of submissionEntries) {
        if (entry.key !== key || entry.eventId === row.event_id) continue
        const dedupeKey = `${key}|${row.event_id}|${entry.eventId}`
        if (conflictKeys.has(dedupeKey)) continue
        conflictKeys.add(dedupeKey)
        participantConflicts.push({
          participantName: entry.name,
          grade: entry.grade,
          schoolName: entry.schoolName,
          existingEventId: row.event_id,
          existingEventName: row.event_name,
          existingSchoolCode: row.school_code,
          newEventId: entry.eventId,
          newEventName: entry.eventName,
          source: 'database',
        })
      }
    }
  }

  const primarySchoolName = data.events[0]?.schoolName?.trim() ?? ''
  const primarySchoolKey = normalizeSchoolKey(primarySchoolName)
  let schoolMatch: SchoolMatch | null = null

  if (primarySchoolKey) {
    const { data: schoolRow, error: schoolError } = await supabase
      .from('schools')
      .select('school_code, school_name')
      .eq('school_name_key', primarySchoolKey)
      .maybeSingle()

    if (schoolError) throw schoolError

    if (schoolRow?.school_code) {
      const existingForSchool = (existingRows ?? [])
        .filter((row) => row.school_code === schoolRow.school_code)
        .map((row) => ({ eventId: row.event_id, eventName: row.event_name }))

      const uniqueEvents = [...new Map(existingForSchool.map((e) => [e.eventId, e])).values()]
      if (uniqueEvents.length) {
        schoolMatch = {
          schoolCode: schoolRow.school_code,
          schoolName: schoolRow.school_name,
          existingEvents: uniqueEvents,
        }
      }
    }
  }

  const primaryTeacher = data.events[0]?.teacherIncharge
  let teacherMatch: TeacherMatch | null = null

  if (primaryTeacher && primarySchoolKey) {
    const teacherEmail = normalizeTeacherEmail(primaryTeacher.email)
    const teacherPhone = phoneDigits(primaryTeacher.phone)
    const teacherName = normalizePersonName(primaryTeacher.name)

    const teacherRows = (existingRows ?? []).filter((row) => {
      if (normalizeSchoolKey(row.school_name) !== primarySchoolKey) return false
      const rowEmail = normalizeTeacherEmail(row.teacher_email ?? '')
      if (rowEmail && rowEmail === teacherEmail) return true
      const rowName = normalizePersonName(row.teacher_name ?? '')
      const rowPhone = phoneDigits(row.teacher_phone ?? '')
      return rowName === teacherName && rowPhone === teacherPhone && teacherPhone.length >= 8
    })

    if (teacherRows.length) {
      const uniqueEvents = [...new Map(
        teacherRows.map((row) => [row.event_id, { eventId: row.event_id, eventName: row.event_name }]),
      ).values()]

      teacherMatch = {
        teacherName: primaryTeacher.name,
        teacherEmail: primaryTeacher.email,
        schoolName: primarySchoolName,
        schoolCode: schoolMatch?.schoolCode ?? teacherRows[0]?.school_code ?? null,
        existingEvents: uniqueEvents,
      }
    }
  }

  return { participantConflicts, schoolMatch, teacherMatch }
}

function participantConflictMessage(conflicts: ParticipantConflict[]) {
  const first = conflicts[0]
  const extra = conflicts.length > 1 ? ` (+${conflicts.length - 1} more)` : ''
  if (first.source === 'submission') {
    return `${first.participantName} (${first.grade}, ${first.schoolName}) cannot register for both ${first.existingEventName} and ${first.newEventName}. Each student may only enter one event.${extra}`
  }
  const code = first.existingSchoolCode ? ` (${first.existingSchoolCode})` : ''
  return `${first.participantName} (${first.grade}, ${first.schoolName}) is already registered for ${first.existingEventName}${code}. Each student may only compete in one event.${extra}`
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

type RegistrationParticipant = {
  no: number
  name: string
  email: string
  phone: string
  grade: string
}

type RegistrationEvent = {
  eventId: string
  eventName: string
  eventCategory: string | null
  eventMode: string | null
  schoolName: string
  teacherIncharge: { name: string; phone: string; email: string }
  participants: RegistrationParticipant[]
}

type RegistrationPayload = {
  registrationId: string
  registrationMode: 'single' | 'multi'
  events: RegistrationEvent[]
  confirmMerge?: boolean
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
      return json(req, { ok: false, error: 'Payload too large' }, 413)
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return json(req, { ok: false, error: 'Invalid JSON' }, 400)
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
      'reg',
      ipHash,
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX,
    )

    if (!rate.allowed) {
      const status = rate.failedClosed ? 503 : 429
      const message = rate.failedClosed
        ? 'Rate limiting unavailable. Try again later.'
        : 'Too many registration attempts. Please try again later.'
      return json(
        req,
        { ok: false, error: message },
        status,
        status === 429 ? { 'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) } : {},
      )
    }

    await recordRateLimitAttempt(supabase, 'reg', ipHash)

    const validated = validatePayload(payload)
    if (!validated.ok) {
      return json(req, { ok: false, error: validated.error }, 400)
    }

    const data = validated.data

    const duplicateAnalysis = await analyzeDuplicates(supabase, data)

    if (duplicateAnalysis.participantConflicts.length) {
      return json(req, {
        ok: false,
        code: 'PARTICIPANT_DUPLICATE',
        error: participantConflictMessage(duplicateAnalysis.participantConflicts),
        conflicts: duplicateAnalysis.participantConflicts,
      }, 409)
    }

    const needsConfirmation = duplicateAnalysis.schoolMatch || duplicateAnalysis.teacherMatch
    if (needsConfirmation && !data.confirmMerge) {
      return json(req, {
        ok: false,
        code: 'NEEDS_CONFIRMATION',
        error: 'We found an existing school or teacher profile for this registration.',
        schoolMatch: duplicateAnalysis.schoolMatch,
        teacherMatch: duplicateAnalysis.teacherMatch,
      }, 409)
    }

    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .insert({
        registration_id: data.registrationId,
        mode: data.registrationMode,
      })
      .select('id')
      .single()

    if (regErr) {
      if (regErr.code === '23505') {
        return json(req, { ok: false, error: 'This registration was already submitted' }, 409)
      }
      console.error('registrations insert:', regErr)
      return json(req, { ok: false, error: 'Could not save registration' }, 500)
    }

    let assignedSchoolCode: string | null = null
    const emailEvents: EmailEvent[] = []

    for (const ev of data.events) {
      const teacher = ev.teacherIncharge
      const schoolCode = await getOrCreateSchoolCode(supabase, ev.schoolName)
      if (!assignedSchoolCode) assignedSchoolCode = schoolCode

      emailEvents.push({
        eventId: ev.eventId,
        eventName: ev.eventName,
        eventCategory: ev.eventCategory,
        eventMode: ev.eventMode,
        schoolName: ev.schoolName,
        schoolCode,
        teacherIncharge: teacher,
        participants: ev.participants,
      })

      const { data: evRow, error: evErr } = await supabase
        .from('event_registrations')
        .insert({
          registration_id: reg.id,
          event_id: ev.eventId,
          event_name: ev.eventName,
          event_category: ev.eventCategory,
          event_mode: ev.eventMode,
          school_name: ev.schoolName,
          school_code: schoolCode,
          teacher_name: teacher.name,
          teacher_phone: teacher.phone,
          teacher_email: teacher.email,
        })
        .select('id')
        .single()

      if (evErr) {
        console.error('event_registrations insert:', evErr)
        return json(req, { ok: false, error: 'Could not save registration' }, 500)
      }

      const rows = ev.participants.map((p) => ({
        event_registration_id: evRow.id,
        participant_no: p.no,
        name: p.name,
        email: p.email,
        phone: p.phone,
        grade: p.grade,
      }))

      const { error: pErr } = await supabase.from('participants').insert(rows)
      if (pErr) {
        console.error('participants insert:', pErr)
        return json(req, { ok: false, error: 'Could not save registration' }, 500)
      }
    }

    const primaryEvent = data.events[0]
    const priorEventNames = duplicateAnalysis.schoolMatch?.existingEvents?.map((e) => e.eventName) ?? []
    const emailCtx: RegistrationEmailContext = {
      registrationId: data.registrationId,
      registrationMode: data.registrationMode,
      schoolCode: assignedSchoolCode ?? emailEvents[0]?.schoolCode ?? '',
      schoolName: primaryEvent?.schoolName ?? '',
      teacher: primaryEvent?.teacherIncharge ?? emailEvents[0]?.teacherIncharge ?? {
        name: '',
        phone: '',
        email: '',
      },
      events: emailEvents,
      isReturningSchool: Boolean(duplicateAnalysis.schoolMatch),
      priorEventNames,
      siteUrl: Deno.env.get('SITE_URL') ?? 'https://cyfernode.com',
    }

    let emailSummary = { sent: 0, failed: 0 }
    try {
      emailSummary = await sendRegistrationEmails(emailCtx)
    } catch (err) {
      console.error('registration emails error:', err)
    }

    return json(req, {
      ok: true,
      registrationId: data.registrationId,
      schoolCode: assignedSchoolCode,
      linkedSchool: Boolean(duplicateAnalysis.schoolMatch),
      emailsSent: emailSummary.sent,
      emailsFailed: emailSummary.failed,
    })
  } catch (err) {
    console.error('register function error:', err)
    return json(req, { ok: false, error: 'Unexpected server error' }, 500)
  }
})
