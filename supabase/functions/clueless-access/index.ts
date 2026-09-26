import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'
import { schoolPasskey } from '../_shared/schoolPasskeys.ts'
import { logAndSendEmail } from '../submission-access/mailer.ts'

const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type, x-clueless-session'
const MAX_FAILURES = 5
const LOCK_MINUTES = 15
const RESEND_SECONDS = 60
const BANNER_IMAGE_URL = 'https://i.ibb.co/Lzsh2Rth/banner-email-cyfernode.jpg'
const DISCORD_INVITE_URL = 'https://discord.gg/bkqrUAAnvc'
const SITE_URL = 'https://cyfernode.com'

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

function escapeHtml(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildCluelessPasskeyEmail({
  participantName,
  schoolName,
  schoolCode,
  passkey,
}: {
  participantName: string
  schoolName: string
  schoolCode: string
  passkey: string
}) {
  const subject = `CyferNode 5.0 — Clue-Less Passkey (${schoolCode})`
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#111114;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(17,17,20,0.06);border:1px solid rgba(17,17,20,0.08);">
          <tr>
            <td style="padding:0;background-color:#111114;text-align:center;">
              <img src="${BANNER_IMAGE_URL}" alt="Cyfernode 5.0" width="600" style="width:100%;max-width:600px;height:auto;display:block;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 28px 32px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d24500;margin-bottom:8px;">
                CyferNode 5.0 · Clue-Less Cryptic Hunt
              </div>
              <h1 style="font-size:22px;font-weight:800;color:#111114;margin:0 0 20px 0;line-height:1.25;letter-spacing:-0.02em;">
                Your Clue-Less Access Passkey
              </h1>
              <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 16px 0;">
                Dear <strong>${escapeHtml(participantName)}</strong>,
              </p>
              <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 20px 0;">
                You requested access to the <strong>Clue-Less Cryptic Hunt</strong> for <strong>${escapeHtml(schoolName)}</strong> (${escapeHtml(schoolCode)}).
              </p>
              
              <div style="background-color:#fff5ee;border:2px dashed #d24500;border-radius:12px;padding:24px 16px;text-align:center;margin:0 0 24px 0;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d24500;margin-bottom:8px;">
                  4-Digit Verification Passkey
                </div>
                <div style="font-size:40px;font-weight:800;letter-spacing:0.35em;color:#111114;font-family:Consolas, Monaco, monospace;padding-left:0.35em;">
                  ${escapeHtml(passkey)}
                </div>
                <div style="font-size:13px;color:rgba(17,17,20,0.65);margin-top:8px;">
                  School Code: <strong>${escapeHtml(schoolCode)}</strong>
                </div>
              </div>

              <div style="background-color:#fafafa;border:1px solid rgba(17,17,20,0.08);border-radius:10px;padding:16px 20px;margin:0 0 20px 0;">
                <h3 style="font-size:14px;font-weight:700;color:#111114;margin:0 0 10px 0;text-transform:uppercase;letter-spacing:0.04em;">
                  Next Steps
                </h3>
                <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.65;color:rgba(17,17,20,0.85);">
                  <li>Enter this <strong>4-digit passkey</strong> in the Clue-Less login prompt.</li>
                  <li>Your team will be logged in and registered on the live leaderboard.</li>
                  <li>Solve puzzles in linear sequence. No hints will be provided.</li>
                </ol>
              </div>

              <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(17,17,20,0.08);font-size:13px;color:rgba(17,17,20,0.65);line-height:1.6;">
                <p style="margin:0;">
                  Need help? Join the <a href="${DISCORD_INVITE_URL}" style="color:#d24500;text-decoration:none;font-weight:600;">CyferNode Discord Server</a>.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid rgba(17,17,20,0.06);text-align:center;font-size:12px;color:rgba(17,17,20,0.5);line-height:1.5;">
              <div style="font-weight:600;color:rgba(17,17,20,0.7);margin-bottom:4px;">CYFERNODE 5.0 · SFS GURUGRAM</div>
              <div>Official Annual Interschool Tech Symposium</div>
              <div style="margin-top:8px;">
                <a href="${SITE_URL}" style="color:rgba(17,17,20,0.6);text-decoration:underline;">cyfernode.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  return { subject, html }
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

/**
 * Specifically loads registrations for Clue-Less only
 */
async function loadCluelessRegistrations(admin: ReturnType<typeof adminClient>, schoolCode: string) {
  const { data, error } = await admin
    .from('event_registrations')
    .select('id, event_id, event_name, team_name, team_number, teacher_name, teacher_email, school_name, school_code, is_active')
    .eq('school_code', schoolCode)
    .eq('event_id', 'clue-less')
    .eq('is_active', true)
  if (error) throw error
  return data || []
}

async function resolveCluelessIdentity(
  admin: ReturnType<typeof adminClient>,
  school: { id: string; school_code: string; school_name: string },
  email: string,
) {
  const registrations = await loadCluelessRegistrations(admin, school.school_code)
  if (!registrations.length) {
    return { error: `School ${school.school_code} is not registered for Clue-Less.` }
  }

  // Check if teacher
  const teacherRow = registrations.find((row) => String(row.teacher_email || '').trim().toLowerCase() === email)
  if (teacherRow) {
    return {
      identity: {
        role: 'teacher_in_charge' as Role,
        name: String(teacherRow.teacher_name || 'Teacher In-Charge').trim() || 'Teacher In-Charge',
        email,
        school,
        registration: teacherRow,
      },
    }
  }

  // Check if participant
  const regIds = registrations.map((r) => r.id)
  const { data: participants, error } = await admin
    .from('participants')
    .select('id, name, email, event_registration_id')
    .in('event_registration_id', regIds)
    .ilike('email', email)

  if (error) throw error
  const mine = (participants || []).filter((p) => String(p.email || '').trim().toLowerCase() === email)
  if (!mine.length) {
    return { error: `Email ${email} is not registered for Clue-Less under ${school.school_code}.` }
  }

  const matchingReg = registrations.find((r) => r.id === mine[0].event_registration_id) || registrations[0]
  return {
    identity: {
      role: 'student' as Role,
      name: String(mine[0].name || 'Participant').trim() || 'Participant',
      email,
      school,
      registration: matchingReg,
    },
  }
}

async function attemptRow(admin: ReturnType<typeof adminClient>, schoolCode: string, email: string) {
  const { data, error } = await admin
    .from('clue_less_verification_attempts')
    .select('id, failed_attempts, locked_until, last_sent_at')
    .eq('school_code', schoolCode)
    .eq('email', email)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') {
    // If table doesn't exist yet or query fails, return null
    return null
  }
  return data
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req, ALLOW_HEADERS), status: 204 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const action = String(body.action || '').trim()
  const admin = adminClient()

  try {
    if (action === 'check-school') {
      const code = normalizeSchoolCode(body.schoolCode)
      if (!code) return fail(req, 'Invalid school code. Format: CYN00 to CYN100.')
      const school = await loadSchool(admin, code)
      if (!school) return fail(req, 'School code not found.')
      const cluelessRegs = await loadCluelessRegistrations(admin, code)
      return json(req, {
        ok: true,
        schoolCode: school.school_code,
        schoolName: school.school_name,
        isRegisteredForClueless: cluelessRegs.length > 0,
      })
    }

    if (action === 'verify-identity') {
      const code = normalizeSchoolCode(body.schoolCode)
      const email = normalizeEmail(body.email)
      if (!code || !email) return fail(req, 'Please enter a valid school code and registered email.')
      const school = await loadSchool(admin, code)
      if (!school) return fail(req, 'School code not found.')

      const resolved = await resolveCluelessIdentity(admin, school, email)
      if (resolved.error || !resolved.identity) {
        return fail(req, resolved.error || 'Identity could not be verified.')
      }

      return json(req, {
        ok: true,
        schoolCode: school.school_code,
        schoolName: school.school_name,
        name: resolved.identity.name,
        role: resolved.identity.role,
      })
    }

    if (action === 'request-passkey') {
      const code = normalizeSchoolCode(body.schoolCode)
      const email = normalizeEmail(body.email)
      if (!code || !email) return fail(req, 'Please enter a valid school code and email.')
      const school = await loadSchool(admin, code)
      if (!school) return fail(req, 'School code not found.')

      const resolved = await resolveCluelessIdentity(admin, school, email)
      if (resolved.error || !resolved.identity) {
        return fail(req, resolved.error || 'Only registered Clue-Less participants can request a passkey.')
      }

      const row = await attemptRow(admin, code, email)
      if (row?.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
        return fail(req, 'Too many incorrect attempts. Try again in 15 minutes.')
      }

      if (row?.last_sent_at) {
        const elapsed = (Date.now() - new Date(row.last_sent_at).getTime()) / 1000
        if (elapsed < RESEND_SECONDS) {
          const wait = Math.ceil(RESEND_SECONDS - elapsed)
          return fail(req, `Please wait ${wait}s before requesting a new passkey.`)
        }
      }

      const passkey = schoolPasskey(code)
      if (!passkey) return fail(req, 'No passkey configured for this school code.')

      const emailData = buildCluelessPasskeyEmail({
        participantName: resolved.identity.name,
        schoolName: school.school_name,
        schoolCode: code,
        passkey,
      })

      const sendRes = await logAndSendEmail(admin, {
        schoolCode: code,
        recipientEmail: email,
        recipientName: resolved.identity.name,
        recipientRole: resolved.identity.role,
        notificationType: 'verification_passkey',
        subject: emailData.subject,
        htmlContent: emailData.html,
      })

      // Update attempt row
      try {
        await admin.from('clue_less_verification_attempts').upsert({
          school_code: code,
          email,
          last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'school_code,email' })
      } catch (err) {
        console.warn('Could not update clue_less_verification_attempts:', err)
      }

      return json(req, {
        ok: true,
        message: 'Passkey sent to your registered email.',
        emailDelivery: sendRes.ok,
      })
    }

    if (action === 'verify-passkey') {
      const code = normalizeSchoolCode(body.schoolCode)
      const email = normalizeEmail(body.email)
      const enteredPasskey = String(body.passkey ?? '').trim()

      if (!code || !email || !enteredPasskey) {
        return fail(req, 'School code, email, and 4-digit passkey are required.')
      }

      const school = await loadSchool(admin, code)
      if (!school) return fail(req, 'School code not found.')

      const resolved = await resolveCluelessIdentity(admin, school, email)
      if (resolved.error || !resolved.identity) {
        return fail(req, resolved.error || 'Only registered Clue-Less participants can access this event.')
      }

      const expected = schoolPasskey(code)
      if (!expected || enteredPasskey !== expected) {
        // Record failed attempt
        try {
          const row = await attemptRow(admin, code, email)
          const failures = (row?.failed_attempts || 0) + 1
          const lock = failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null
          await admin.from('clue_less_verification_attempts').upsert({
            school_code: code,
            email,
            failed_attempts: failures,
            locked_until: lock,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'school_code,email' })
        } catch {
          // ignore
        }
        return fail(req, 'Invalid passkey. Please check the 4-digit code sent to your email.')
      }

      // Passkey verified! Reset attempts
      try {
        await admin.from('clue_less_verification_attempts').upsert({
          school_code: code,
          email,
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'school_code,email' })
      } catch {
        // ignore
      }

      // Upsert into clue_less_teams (Realtime table)
      const nowIso = new Date().toISOString()
      try {
        await admin.from('clue_less_teams').upsert({
          school_code: code,
          school_name: school.school_name,
          email,
          user_name: resolved.identity.name,
          role: resolved.identity.role,
          logged_in: true,
          last_active_at: nowIso,
          updated_at: nowIso,
        }, { onConflict: 'school_code' })
      } catch (err) {
        console.error('clue_less_teams upsert error:', err)
      }

      // Create session
      const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID()
      const tokenHash = await sha256(rawToken)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      try {
        await admin.from('clue_less_sessions').insert({
          school_code: code,
          email,
          token_hash: tokenHash,
          expires_at: expiresAt,
        })
      } catch (err) {
        console.warn('clue_less_sessions insert warning:', err)
      }

      return json(req, {
        ok: true,
        token: rawToken,
        profile: {
          schoolCode: code,
          schoolName: school.school_name,
          email,
          name: resolved.identity.name,
          role: resolved.identity.role,
        },
      })
    }

    if (action === 'list-teams') {
      const { data, error } = await admin
        .from('clue_less_teams')
        .select('school_code, school_name, user_name, logged_in, score, current_level, levels_completed, last_active_at')
        .order('score', { ascending: false })
        .order('last_active_at', { ascending: false })

      if (error) {
        return json(req, { ok: true, teams: [] })
      }
      return json(req, { ok: true, teams: data || [] })
    }

    return fail(req, 'Unknown action.', 404)
  } catch (err) {
    console.error('clueless-access exception:', err)
    return fail(req, err instanceof Error ? err.message : 'An unexpected error occurred.', 500)
  }
})
