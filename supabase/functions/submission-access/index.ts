import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'
import { schoolPasskey } from '../_shared/schoolPasskeys.ts'
import {
  buildPasskeyEmail,
  buildTeacherSubmissionEmail,
  buildStudentSubmissionEmail,
  type EmailDeliverableItem,
} from './emailTemplates.ts'
import { logAndSendEmail } from './mailer.ts'

const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type, x-submission-session'
const BUCKET = 'submission-files'
const SESSION_HOURS = 12
const MAX_FAILURES = 5
const LOCK_MINUTES = 15
const RESEND_SECONDS = 60
const GENERIC = 'These details could not be verified. Please check your school code and registered email.'
const SCHOOL_MISSING = 'School code not found. Please check your code or contact your teacher in-charge.'
const ALREADY = 'This team has already submitted this event.'

type Role = 'student' | 'teacher_in_charge'

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req, ALLOW_HEADERS), 'Content-Type': 'application/json' },
  })
}

function fail(req: Request, error: string, status = 400) {
  return json(req, { ok: false, error }, status)
}

function normalizeSchoolCode(value: unknown) {
  const raw = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '')
  const match = /^CYN(\d{1,3})$/.exec(raw)
  if (!match) return null
  const num = Number(match[1])
  if (!Number.isInteger(num) || num < 0 || num > 100) return null
  return `CYN${String(num).padStart(2, '0')}`
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return null
  return email
}

function formatSubmissionDate(dateStr: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  try {
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST'
  } catch {
    return d.toUTCString()
  }
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase service role is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function loadSchool(admin: ReturnType<typeof adminClient>, schoolCode: string) {
  const { data, error } = await admin
    .from('schools')
    .select('id, school_code, school_name, is_active')
    .eq('school_code', schoolCode)
    .maybeSingle()
  if (error) throw error
  if (!data || data.is_active === false) return null
  return data
}

async function loadSchoolRegistrations(admin: ReturnType<typeof adminClient>, schoolCode: string) {
  const { data, error } = await admin
    .from('event_registrations')
    .select('id, event_id, event_name, team_name, team_number, teacher_name, teacher_email, school_name, school_code, is_active')
    .eq('school_code', schoolCode)
    .eq('is_active', true)
  if (error) throw error
  return data || []
}

async function resolveIdentity(
  admin: ReturnType<typeof adminClient>,
  school: { id: string; school_code: string; school_name: string },
  email: string,
) {
  const registrations = await loadSchoolRegistrations(admin, school.school_code)
  const teacherRow = registrations.find((row) => String(row.teacher_email || '').trim().toLowerCase() === email)
  if (teacherRow) {
    return {
      role: 'teacher_in_charge' as Role,
      name: String(teacherRow.teacher_name || 'Teacher In-Charge').trim() || 'Teacher In-Charge',
      email,
      school,
      registrations,
    }
  }

  const ids = registrations.map((row) => row.id)
  if (!ids.length) return null
  const { data: participants, error } = await admin
    .from('participants')
    .select('id, name, email, event_registration_id')
    .in('event_registration_id', ids)
    .ilike('email', email)
  if (error) throw error
  const mine = (participants || []).filter((row) => String(row.email || '').trim().toLowerCase() === email)
  if (!mine.length) return null
  const allowed = new Set(mine.map((row) => row.event_registration_id))
  return {
    role: 'student' as Role,
    name: String(mine[0].name || 'Student').trim() || 'Student',
    email,
    school,
    registrations: registrations.filter((row) => allowed.has(row.id)),
  }
}

async function attemptRow(admin: ReturnType<typeof adminClient>, schoolCode: string, email: string) {
  const { data, error } = await admin
    .from('submission_verification_attempts')
    .select('id, failed_attempts, locked_until, last_sent_at')
    .eq('school_code', schoolCode)
    .eq('email', email)
    .maybeSingle()
  if (error) throw error
  return data
}

function lockMessage(lockedUntil: string | null) {
  if (!lockedUntil) return null
  if (new Date(lockedUntil).getTime() > Date.now()) {
    return 'Too many incorrect attempts. Try again in 15 minutes.'
  }
  return null
}

async function sessionFromRequest(admin: ReturnType<typeof adminClient>, req: Request) {
  const token = req.headers.get('x-submission-session') || ''
  if (!token || token.length < 32) return null
  const tokenHash = await sha256(token)
  const { data, error } = await admin
    .from('submission_sessions')
    .select('id, school_id, school_code, email, display_name, role, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (error) throw error
  if (!data || data.revoked_at) return null
  if (new Date(data.expires_at).getTime() <= Date.now()) return null
  return data
}

async function freshIdentity(admin: ReturnType<typeof adminClient>, session: { school_code: string; email: string; role: Role }) {
  const school = await loadSchool(admin, session.school_code)
  if (!school) return null
  const identity = await resolveIdentity(admin, school, session.email)
  if (!identity || identity.role !== session.role) return null
  return identity
}

function safeFileName(name: string) {
  const base = String(name || 'file').split(/[/\\]/).pop() || 'file'
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return (cleaned || 'file').slice(0, 120)
}

function countWords(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

async function catalogForSlug(admin: ReturnType<typeof adminClient>, slug: string) {
  const { data, error } = await admin
    .from('events')
    .select(`
      id, slug, name, description, is_active,
      event_deliverables (
        id, key, name, description, type, required, accepted_file_types,
        max_file_size_mb, max_words, accepted_link_types, sort_order, helper_text, placeholder
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const deliverables = [...(data.event_deliverables || [])].sort((a, b) => a.sort_order - b.sort_order)
  return { ...data, event_deliverables: deliverables }
}

async function submissionForRegistration(admin: ReturnType<typeof adminClient>, registrationId: string) {
  const { data, error } = await admin
    .from('submissions')
    .select(`
      id, status, reference_code, submitted_at, submitted_by_name, submitted_by_email, submitted_by_role,
      school_name_snapshot, school_code, event_name_snapshot, event_slug, team_name_snapshot, team_number,
      event_registration_id,
      submission_deliverables (
        id, deliverable_id, deliverable_key, deliverable_name, value, file_path, file_name, file_size, mime_type
      )
    `)
    .eq('event_registration_id', registrationId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function ensureDraft(
  admin: ReturnType<typeof adminClient>,
  identity: Awaited<ReturnType<typeof resolveIdentity>>,
  registration: { id: string; event_id: string; event_name: string; team_name: string | null; team_number: number | null },
  event: { id: string; slug: string; name: string },
) {
  if (!identity) throw new Error('Verification expired. Please verify again.')
  const existing = await submissionForRegistration(admin, registration.id)
  if (existing) return existing
  const { data, error } = await admin
    .from('submissions')
    .insert({
      school_id: identity.school.id,
      event_id: event.id,
      event_registration_id: registration.id,
      school_code: identity.school.school_code,
      school_name_snapshot: identity.school.school_name,
      event_slug: event.slug,
      event_name_snapshot: event.name,
      team_name_snapshot: registration.team_name || `Team ${registration.team_number || 1}`,
      team_number: registration.team_number,
      submitted_by_email: identity.email,
      submitted_by_name: identity.name,
      submitted_by_role: identity.role,
      status: 'draft',
    })
    .select('id, status, reference_code, submitted_at, submitted_by_name, submitted_by_email, submitted_by_role, event_registration_id, school_name_snapshot, school_code, event_name_snapshot, event_slug, team_name_snapshot, team_number')
    .single()
  if (error?.code === '23505') return submissionForRegistration(admin, registration.id)
  if (error) throw error
  return { ...data, submission_deliverables: [] }
}

function registrationAllowed(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  registrationId: string,
) {
  return identity.registrations.find((row) => row.id === registrationId) || null
}

async function buildDashboard(admin: ReturnType<typeof adminClient>, identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>) {
  const slugs = [...new Set(identity.registrations.map((row) => row.event_id))]
  const { data: events, error } = slugs.length
    ? await admin.from('events').select('id, slug, name, is_active, event_deliverables(id)').in('slug', slugs)
    : { data: [], error: null }
  if (error) throw error
  const bySlug = new Map((events || []).map((event) => [event.slug, event]))
  const ids = identity.registrations.map((row) => row.id)
  const { data: submissions, error: submissionError } = ids.length
    ? await admin
      .from('submissions')
      .select('event_registration_id, status, submitted_by_name, submitted_at, reference_code')
      .in('event_registration_id', ids)
    : { data: [], error: null }
  if (submissionError) throw submissionError
  const byRegistration = new Map((submissions || []).map((row) => [row.event_registration_id, row]))

  const groups = new Map<string, {
    slug: string
    name: string
    open: boolean
    teams: Array<Record<string, unknown>>
  }>()

  for (const registration of identity.registrations) {
    const event = bySlug.get(registration.event_id)
    const key = registration.event_id
    if (!groups.has(key)) {
      groups.set(key, {
        slug: key,
        name: event?.name || registration.event_name,
        open: Boolean(event?.is_active && (event?.event_deliverables || []).length),
        teams: [],
      })
    }
    const submission = byRegistration.get(registration.id)
    groups.get(key)?.teams.push({
      registrationId: registration.id,
      teamName: registration.team_name || `Team ${registration.team_number || 1}`,
      teamNumber: registration.team_number,
      status: submission?.status || 'not_submitted',
      submittedByName: submission?.submitted_by_name || '',
      submittedAt: submission?.submitted_at || null,
      referenceCode: submission?.reference_code || '',
    })
  }

  const list = [...groups.values()].map((group) => ({
    ...group,
    teamCount: group.teams.length,
    teams: group.teams.sort((a, b) => Number(a.teamNumber || 0) - Number(b.teamNumber || 0)),
  })).sort((a, b) => a.name.localeCompare(b.name))

  return {
    profile: {
      name: identity.name,
      email: identity.email,
      role: identity.role,
      schoolName: identity.school.school_name,
      schoolCode: identity.school.school_code,
    },
    groups: list,
  }
}

/**
 * Dispatch final submission notification emails:
 * 1. To the Teacher In-Charge of that school/registration
 * 2. To all student participants strictly belonging to this specific team (registration.id)
 * Logs every attempt to public.email_notifications table.
 * Never throws an error that would rollback the submission.
 */
async function notifySubmission(
  admin: ReturnType<typeof adminClient>,
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  registration: {
    id: string
    event_id?: string
    event_name?: string
    school_name?: string
    school_code?: string
    team_name?: string | null
    team_number?: number | null
    teacher_email?: string | null
    teacher_name?: string | null
  },
  submission: {
    id: string
    reference_code: string | null
    submitted_at: string | null
    submitted_by_name: string
    submitted_by_email: string
    school_name_snapshot: string
    school_code: string
    event_name_snapshot: string
    team_name_snapshot: string
    submission_deliverables: Array<{
      deliverable_name: string
      file_name: string | null
      file_path: string | null
      file_size?: number | null
      value: string | null
    }>
  },
) {
  try {
    // 1. Prepare deliverables list with secure signed URLs for files (valid 7 days)
    const deliverableItems: EmailDeliverableItem[] = []
    for (const item of submission.submission_deliverables || []) {
      let downloadUrl: string | null = null
      if (item.file_path) {
        try {
          const signed = await admin.storage.from(BUCKET).createSignedUrl(item.file_path, 60 * 60 * 24 * 7)
          if (signed.data?.signedUrl) downloadUrl = signed.data.signedUrl
        } catch (signedErr) {
          console.warn('Could not generate signed url for deliverable:', signedErr)
        }
      }

      const itemType = item.file_path ? 'file' : (item.value?.startsWith('http') ? 'url' : 'text')
      deliverableItems.push({
        name: item.deliverable_name || 'Deliverable',
        type: itemType,
        fileName: item.file_name,
        fileSize: item.file_size,
        filePath: item.file_path,
        downloadUrl,
        value: item.value,
      })
    }

    const formattedDate = formatSubmissionDate(submission.submitted_at)
    const refCode = submission.reference_code || submission.id

    // 2. Identify Teacher In-Charge for this team
    let teacherEmail = String(registration.teacher_email || '').trim().toLowerCase()
    let teacherName = String(registration.teacher_name || '').trim()

    // If missing on this row, find an active teacher for this school
    if (!teacherEmail) {
      const { data: teacherRows } = await admin
        .from('event_registrations')
        .select('teacher_email, teacher_name')
        .eq('school_code', identity.school.school_code)
        .eq('is_active', true)
        .limit(1)
      if (teacherRows?.[0]?.teacher_email) {
        teacherEmail = String(teacherRows[0].teacher_email).trim().toLowerCase()
        teacherName = String(teacherRows[0].teacher_name || 'Teacher In-Charge').trim()
      }
    }

    const sentEmails = new Set<string>()

    // 3. Send Teacher Submission Email
    if (teacherEmail) {
      sentEmails.add(teacherEmail)
      const teacherMail = buildTeacherSubmissionEmail({
        teacherName: teacherName || 'Teacher In-Charge',
        schoolName: submission.school_name_snapshot,
        schoolCode: submission.school_code,
        eventName: submission.event_name_snapshot,
        teamName: submission.team_name_snapshot,
        submittedByName: submission.submitted_by_name,
        submittedByEmail: submission.submitted_by_email,
        submittedAt: formattedDate,
        deliverables: deliverableItems,
        referenceCode: refCode,
      })

      await logAndSendEmail({
        admin,
        emailType: 'submission_teacher',
        recipient: teacherEmail,
        recipientName: teacherName || 'Teacher In-Charge',
        recipientType: 'teacher_in_charge',
        submissionId: submission.id,
        eventRegistrationId: registration.id,
        subject: teacherMail.subject,
        htmlContent: teacherMail.html,
        metadata: {
          school_code: submission.school_code,
          event_slug: registration.event_id,
          team_name: submission.team_name_snapshot,
        },
      })
    }

    // 4. Send Team Student Email strictly to students of this team (registration.id)
    const { data: members, error: membersError } = await admin
      .from('participants')
      .select('email, name')
      .eq('event_registration_id', registration.id)

    if (membersError) {
      console.error('Failed to load team members for email notification:', membersError)
    }

    for (const member of members || []) {
      const email = String(member.email || '').trim().toLowerCase()
      if (!email || sentEmails.has(email)) continue
      sentEmails.add(email)

      const studentName = String(member.name || 'Participant').trim()
      const studentMail = buildStudentSubmissionEmail({
        studentName,
        schoolName: submission.school_name_snapshot,
        schoolCode: submission.school_code,
        eventName: submission.event_name_snapshot,
        teamName: submission.team_name_snapshot,
        submittedByName: submission.submitted_by_name,
        submittedAt: formattedDate,
        deliverables: deliverableItems,
        referenceCode: refCode,
      })

      await logAndSendEmail({
        admin,
        emailType: 'submission_student',
        recipient: email,
        recipientName: studentName,
        recipientType: 'team_student',
        submissionId: submission.id,
        eventRegistrationId: registration.id,
        subject: studentMail.subject,
        htmlContent: studentMail.html,
        metadata: {
          school_code: submission.school_code,
          event_slug: registration.event_id,
          team_name: submission.team_name_snapshot,
        },
      })
    }
  } catch (err) {
    console.error('Unhandled exception in notifySubmission (submission preserved):', err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req, ALLOW_HEADERS) })
  }
  if (req.method !== 'POST') return fail(req, 'Method not allowed', 405)

  try {
    const body = await req.json()
    const action = String(body?.action || '')
    const admin = adminClient()

    if (action === 'check-school') {
      const schoolCode = normalizeSchoolCode(body.schoolCode)
      if (!schoolCode) return fail(req, 'Enter a school code from CYN00 to CYN100.')
      const school = await loadSchool(admin, schoolCode)
      if (!school) return fail(req, SCHOOL_MISSING, 404)
      return json(req, { ok: true, schoolCode: school.school_code, schoolName: school.school_name })
    }

    // Pre-verify school code and email before sending passkey
    if (action === 'verify-identity' || action === 'check-identity') {
      const schoolCode = normalizeSchoolCode(body.schoolCode)
      const email = normalizeEmail(body.email)
      if (!schoolCode || !email) return fail(req, GENERIC)
      const school = await loadSchool(admin, schoolCode)
      if (!school) return fail(req, SCHOOL_MISSING, 404)
      const identity = await resolveIdentity(admin, school, email)
      if (!identity) return fail(req, GENERIC)
      return json(req, {
        ok: true,
        verified: true,
        schoolCode: school.school_code,
        schoolName: school.school_name,
        participantName: identity.name,
        role: identity.role,
      })
    }

    // Send 4-digit passkey to registered email
    if (action === 'request-passkey') {
      const schoolCode = normalizeSchoolCode(body.schoolCode)
      const email = normalizeEmail(body.email)
      if (!schoolCode || !email) return fail(req, GENERIC)
      const school = await loadSchool(admin, schoolCode)
      if (!school) return fail(req, SCHOOL_MISSING, 404)
      const identity = await resolveIdentity(admin, school, email)
      if (!identity) return fail(req, GENERIC)

      const attempt = await attemptRow(admin, schoolCode, email)
      const locked = lockMessage(attempt?.locked_until || null)
      if (locked) return fail(req, locked, 429)

      if (attempt?.last_sent_at) {
        const elapsed = Math.floor((Date.now() - new Date(attempt.last_sent_at).getTime()) / 1000)
        if (elapsed < RESEND_SECONDS) {
          const remaining = RESEND_SECONDS - elapsed
          return json(req, {
            ok: false,
            error: `A passkey was just sent. Please wait ${remaining} seconds before requesting another.`,
            cooldownRemaining: remaining,
          }, 429)
        }
      }

      // Fetch passkey from table or fallback to shared passkey registry
      let passkeyVal: string | null = null
      const { data: secret } = await admin
        .from('school_passkeys')
        .select('passkey')
        .eq('school_code', schoolCode)
        .maybeSingle()

      if (secret?.passkey) {
        passkeyVal = secret.passkey
      } else {
        passkeyVal = schoolPasskey(schoolCode)
      }

      if (!passkeyVal) {
        return fail(req, 'Passkey email could not be sent. Contact your teacher in-charge.', 500)
      }

      // Build Passkey Email HTML using reusable template
      const passkeyMail = buildPasskeyEmail({
        participantName: identity.name,
        schoolName: school.school_name,
        schoolCode: school.school_code,
        passkey: passkeyVal,
      })

      // Send and record in email_notifications
      const sendRes = await logAndSendEmail({
        admin,
        emailType: 'passkey',
        recipient: email,
        recipientName: identity.name,
        recipientType: identity.role,
        subject: passkeyMail.subject,
        htmlContent: passkeyMail.html,
        metadata: { school_code: schoolCode },
      })

      if (!sendRes.ok) {
        console.error('Failed to send passkey email:', sendRes.error)
        return fail(req, 'Passkey email could not be sent. Please verify email configuration or try again.', 502)
      }

      await admin.from('submission_verification_attempts').upsert({
        school_code: schoolCode,
        email,
        failed_attempts: attempt?.failed_attempts || 0,
        locked_until: attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now() ? attempt.locked_until : null,
        last_sent_at: new Date().toISOString(),
      }, { onConflict: 'school_code,email' })

      return json(req, { ok: true, sent: true, cooldownSeconds: RESEND_SECONDS })
    }

    // Verify 4-digit passkey
    if (action === 'verify-passkey') {
      const schoolCode = normalizeSchoolCode(body.schoolCode)
      const email = normalizeEmail(body.email)
      const passkey = String(body.passkey ?? '').trim()
      if (!schoolCode || !email || !/^\d{4}$/.test(passkey)) return fail(req, GENERIC)
      const school = await loadSchool(admin, schoolCode)
      if (!school) return fail(req, SCHOOL_MISSING, 404)
      const identity = await resolveIdentity(admin, school, email)
      if (!identity) return fail(req, GENERIC)

      const attempt = await attemptRow(admin, schoolCode, email)
      const locked = lockMessage(attempt?.locked_until || null)
      if (locked) return fail(req, locked, 429)

      let secretPasskey: string | null = null
      const { data: secret } = await admin.from('school_passkeys').select('passkey').eq('school_code', schoolCode).maybeSingle()
      if (secret?.passkey) {
        secretPasskey = secret.passkey
      } else {
        secretPasskey = schoolPasskey(schoolCode)
      }

      const expected = await sha256(String(secretPasskey || 'missing'))
      const given = await sha256(passkey)

      if (!secretPasskey || expected !== given) {
        const failed = (attempt?.failed_attempts || 0) + 1
        const lock = failed >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null
        await admin.from('submission_verification_attempts').upsert({
          school_code: schoolCode,
          email,
          failed_attempts: lock ? 0 : failed,
          locked_until: lock,
          last_sent_at: attempt?.last_sent_at || null,
        }, { onConflict: 'school_code,email' })

        return fail(
          req,
          lock ? 'Too many incorrect attempts. Try again in 15 minutes.' : 'Invalid passkey. Please try again.',
          lock ? 429 : 401,
        )
      }

      // Reset attempts on successful verification
      await admin.from('submission_verification_attempts').upsert({
        school_code: schoolCode,
        email,
        failed_attempts: 0,
        locked_until: null,
        last_sent_at: attempt?.last_sent_at || null,
      }, { onConflict: 'school_code,email' })

      const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
      const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString()
      const { error } = await admin.from('submission_sessions').insert({
        token_hash: await sha256(token),
        school_id: school.id,
        school_code: school.school_code,
        email,
        display_name: identity.name,
        role: identity.role,
        expires_at: expires,
      })
      if (error) throw error
      const dashboard = await buildDashboard(admin, identity)
      return json(req, { ok: true, token, expiresAt: expires, ...dashboard })
    }

    const session = await sessionFromRequest(admin, req)
    if (!session) return fail(req, 'Verification expired. Please verify again.', 401)
    const identity = await freshIdentity(admin, session)
    if (!identity) return fail(req, 'Verification expired. Please verify again.', 401)

    if (action === 'session') {
      const dashboard = await buildDashboard(admin, identity)
      return json(req, { ok: true, expiresAt: session.expires_at, ...dashboard })
    }

    if (action === 'sign-out') {
      await admin.from('submission_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', session.id)
      return json(req, { ok: true })
    }

    if (action === 'open-team') {
      const registration = registrationAllowed(identity, String(body.registrationId || ''))
      if (!registration) return fail(req, 'You do not have access to this team.', 403)
      const event = await catalogForSlug(admin, registration.event_id)
      if (!event || !event.event_deliverables.length) {
        return json(req, {
          ok: true,
          closed: true,
          message: 'Submission is not open for this event yet.',
          team: {
            registrationId: registration.id,
            teamName: registration.team_name,
            teamNumber: registration.team_number,
            eventName: registration.event_name,
            slug: registration.event_id,
          },
        })
      }
      const submission = await ensureDraft(admin, identity, registration, event)
      return json(req, {
        ok: true,
        closed: false,
        event,
        team: {
          registrationId: registration.id,
          teamName: registration.team_name || `Team ${registration.team_number || 1}`,
          teamNumber: registration.team_number,
        },
        submission,
      })
    }

    const registration = registrationAllowed(identity, String(body.registrationId || ''))
    if (!registration && action !== 'session') {
      if (['save-values', 'sign-upload', 'record-file', 'remove-file', 'finalize', 'sign-download'].includes(action)) {
        return fail(req, 'You do not have access to this team.', 403)
      }
    }

    if (action === 'save-values' && registration) {
      const event = await catalogForSlug(admin, registration.event_id)
      if (!event) return fail(req, 'This event is not open for submissions.', 403)
      const submission = await ensureDraft(admin, identity, registration, event)
      if (!submission || submission.status !== 'draft') return fail(req, ALREADY, 409)
      const allowed = new Map(event.event_deliverables.map((item) => [item.id, item]))
      const saved = []
      for (const entry of body.values || []) {
        const deliverable = allowed.get(entry.deliverableId)
        if (!deliverable || deliverable.type === 'file') continue
        const value = String(entry.value || '').trim()
        if (!value) {
          await admin.from('submission_deliverables').delete().eq('submission_id', submission.id).eq('deliverable_id', deliverable.id)
          continue
        }
        if (deliverable.type === 'url') {
          try {
            const url = new URL(value)
            if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad')
          } catch {
            return fail(req, 'Enter a valid http or https link.')
          }
        }
        const { data, error } = await admin.from('submission_deliverables').upsert({
          submission_id: submission.id,
          deliverable_id: deliverable.id,
          deliverable_key: deliverable.key,
          deliverable_name: deliverable.name,
          value,
          file_path: null,
          file_name: null,
          file_size: null,
          mime_type: null,
        }, { onConflict: 'submission_id,deliverable_id' }).select('id, deliverable_id, deliverable_key, deliverable_name, value, file_path, file_name, file_size, mime_type').single()
        if (error) throw error
        saved.push(data)
      }
      return json(req, { ok: true, submissionId: submission.id, deliverables: saved })
    }

    if (action === 'sign-upload' && registration) {
      const event = await catalogForSlug(admin, registration.event_id)
      if (!event) return fail(req, 'This event is not open for submissions.', 403)
      const deliverable = event.event_deliverables.find((item) => item.id === body.deliverableId)
      if (!deliverable || deliverable.type !== 'file') return fail(req, 'That file is not part of this submission.', 400)
      const submission = await ensureDraft(admin, identity, registration, event)
      if (!submission || submission.status !== 'draft') return fail(req, ALREADY, 409)
      const extension = safeFileName(String(body.fileName || '')).split('.').pop()?.toLowerCase() || ''
      const allowed = (deliverable.accepted_file_types || []).map((item: string) => item.toLowerCase())
      if (allowed.length && !allowed.includes(extension)) return fail(req, 'That file type is not accepted.')
      const size = Number(body.fileSize || 0)
      if (deliverable.max_file_size_mb && size > deliverable.max_file_size_mb * 1024 * 1024) {
        return fail(req, 'That file is larger than the allowed size.')
      }
      const path = `${identity.school.school_code}/${registration.id}/${deliverable.key}/${safeFileName(String(body.fileName || 'file'))}`
      const signed = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
      if (signed.error || !signed.data?.token) return fail(req, 'The file could not be uploaded.', 500)
      return json(req, { ok: true, path, token: signed.data.token, submissionId: submission.id })
    }

    if (action === 'record-file' && registration) {
      const event = await catalogForSlug(admin, registration.event_id)
      const deliverable = event?.event_deliverables.find((item) => item.id === body.deliverableId)
      const submission = await submissionForRegistration(admin, registration.id)
      if (!event || !deliverable || !submission || submission.status !== 'draft') return fail(req, ALREADY, 409)
      const path = String(body.filePath || '')
      const prefix = `${identity.school.school_code}/${registration.id}/${deliverable.key}/`
      if (!path.startsWith(prefix)) return fail(req, 'That file is not part of this submission.', 400)
      if (deliverable.max_words && path.toLowerCase().endsWith('.txt')) {
        const downloaded = await admin.storage.from(BUCKET).download(path)
        if (downloaded.error || !downloaded.data) return fail(req, 'The file could not be checked.', 400)
        const words = countWords(await downloaded.data.text())
        if (words > deliverable.max_words) return fail(req, `This text file is ${words} words. The maximum is ${deliverable.max_words}.`)
      }
      const { data, error } = await admin.from('submission_deliverables').upsert({
        submission_id: submission.id,
        deliverable_id: deliverable.id,
        deliverable_key: deliverable.key,
        deliverable_name: deliverable.name,
        value: null,
        file_path: path,
        file_name: String(body.fileName || '').slice(0, 240),
        file_size: Number(body.fileSize || 0),
        mime_type: String(body.mimeType || 'application/octet-stream').slice(0, 120),
      }, { onConflict: 'submission_id,deliverable_id' }).select('id, deliverable_id, value, file_path, file_name, file_size, mime_type').single()
      if (error) throw error
      return json(req, { ok: true, deliverable: data })
    }

    if (action === 'remove-file' && registration) {
      const submission = await submissionForRegistration(admin, registration.id)
      if (!submission || submission.status !== 'draft') return fail(req, ALREADY, 409)
      const row = (submission.submission_deliverables || []).find((item) => item.deliverable_id === body.deliverableId)
      if (row?.file_path) await admin.storage.from(BUCKET).remove([row.file_path])
      await admin.from('submission_deliverables').delete().eq('submission_id', submission.id).eq('deliverable_id', body.deliverableId)
      return json(req, { ok: true })
    }

    if (action === 'sign-download' && registration) {
      const submission = await submissionForRegistration(admin, registration.id)
      const row = (submission?.submission_deliverables || []).find((item) => item.deliverable_id === body.deliverableId)
      if (!row?.file_path) return fail(req, 'That file could not be found.', 404)
      const signed = await admin.storage.from(BUCKET).createSignedUrl(row.file_path, 60 * 10)
      if (signed.error || !signed.data?.signedUrl) return fail(req, 'That file could not be opened.', 500)
      return json(req, { ok: true, url: signed.data.signedUrl })
    }

    if (action === 'finalize' && registration) {
      const event = await catalogForSlug(admin, registration.event_id)
      const submission = await submissionForRegistration(admin, registration.id)
      if (!event || !submission) return fail(req, 'That submission could not be found.', 404)
      if (submission.status !== 'draft') return fail(req, ALREADY, 409)
      const byId = new Map((submission.submission_deliverables || []).map((item) => [item.deliverable_id, item]))
      for (const deliverable of event.event_deliverables) {
        const entry = byId.get(deliverable.id)
        const present = deliverable.type === 'file' ? Boolean(entry?.file_path) : Boolean(String(entry?.value || '').trim())
        if (deliverable.required && !present) return fail(req, 'Required deliverables are missing.')
        if (deliverable.type === 'url' && present) {
          try {
            const url = new URL(String(entry?.value))
            if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad')
          } catch {
            return fail(req, 'Enter a valid http or https link.')
          }
        }
        if (deliverable.max_words && entry?.file_path && String(entry.file_path).toLowerCase().endsWith('.txt')) {
          const downloaded = await admin.storage.from(BUCKET).download(entry.file_path)
          if (downloaded.data) {
            const words = countWords(await downloaded.data.text())
            if (words > deliverable.max_words) return fail(req, `This text file is ${words} words. The maximum is ${deliverable.max_words}.`)
          }
        }
      }
      const submittedAt = new Date().toISOString()
      const { data: updated, error } = await admin
        .from('submissions')
        .update({
          status: 'submitted',
          submitted_at: submittedAt,
          submitted_by_email: identity.email,
          submitted_by_name: identity.name,
          submitted_by_role: identity.role,
          school_name_snapshot: identity.school.school_name,
          event_name_snapshot: event.name,
          team_name_snapshot: registration.team_name || `Team ${registration.team_number || 1}`,
          team_number: registration.team_number,
        })
        .eq('id', submission.id)
        .eq('status', 'draft')
        .select('id, status, reference_code, submitted_at, submitted_by_name, submitted_by_email, submitted_by_role, school_name_snapshot, school_code, event_name_snapshot, team_name_snapshot')
        .maybeSingle()
      if (error) throw error
      if (!updated) return fail(req, ALREADY, 409)

      const snapshot = {
        ...updated,
        submission_deliverables: (submission.submission_deliverables || []).map((item) => ({
          ...item,
          deliverable_name: item.deliverable_name || event.event_deliverables.find((deliverable) => deliverable.id === item.deliverable_id)?.name || '',
        })),
      }

      // Send emails asynchronously / safe non-blocking
      try {
        await notifySubmission(admin, identity, registration, snapshot)
      } catch (notifyError) {
        console.error('submission notification failed (submission preserved):', notifyError)
      }

      return json(req, { ok: true, submission: updated })
    }

    return fail(req, 'Unknown action', 404)
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Something went wrong'
    if (/relation|schema cache|does not exist/i.test(message)) {
      return fail(req, 'Submissions are not available yet. Run SUPABASE_SETUP.sql in the Supabase SQL Editor, then refresh.', 503)
    }
    return fail(req, 'Something went wrong. Please try again.', 500)
  }
})
