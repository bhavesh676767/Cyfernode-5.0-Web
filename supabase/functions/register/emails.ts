type TeacherIncharge = { name: string; phone: string; email: string }

export type EmailParticipant = {
  no: number
  name: string
  email: string
  phone: string
  grade: string
}

export type EmailEvent = {
  eventId: string
  eventName: string
  eventCategory: string | null
  eventMode: string | null
  schoolName: string
  schoolCode: string
  teacherIncharge: TeacherIncharge
  participants: EmailParticipant[]
}

export type RegistrationEmailContext = {
  registrationId: string
  registrationMode: 'single' | 'multi'
  schoolCode: string
  schoolName: string
  teacher: TeacherIncharge
  events: EmailEvent[]
  isReturningSchool: boolean
  priorEventNames: string[]
  siteUrl: string
}

const ORANGE = '#d24500'
const INK = '#111114'
const MUTED = 'rgba(17,17,20,0.55)'
const SOFT = 'rgba(17,17,20,0.08)'
const SURFACE = '#fafafa'
const TINT = '#fff4ec'
const FONT = "'Satoshi','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

function esc(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function firstName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  const honorifics = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'madam'])
  while (parts.length > 1 && honorifics.has(parts[0].replace(/\./g, '').toLowerCase())) {
    parts.shift()
  }
  return parts[0] || fullName.trim()
}

function bannerUrl(siteUrl: string) {
  return `${siteUrl.replace(/\/$/, '')}/assets/emailbanner.jpg`
}

function emailHead(title: string) {
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@500,600,700,800,900&display=swap" rel="stylesheet">
  <style>
    body, table, td, div, p, h1, a, span {
      font-family: ${FONT} !important;
      -webkit-font-smoothing: antialiased;
    }
  </style>`
}

function emailShell(title: string, bodyHtml: string, siteUrl: string) {
  const host = esc(siteUrl.replace(/^https?:\/\//, ''))
  const banner = esc(bannerUrl(siteUrl))

  return `<!DOCTYPE html>
<html lang="en">
<head>${emailHead(title)}</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${FONT};color:${INK};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <a href="${esc(siteUrl)}" style="display:block;text-decoration:none;">
                <img src="${banner}" width="560" alt="Cyfernode 5.0" style="display:block;width:100%;max-width:560px;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 40px;">
              <div style="height:1px;background:${SOFT};margin-bottom:20px;"></div>
              <div style="font-size:13px;line-height:1.5;color:${MUTED};text-align:center;font-weight:500;">
                Questions? <a href="${esc(siteUrl)}" style="color:${ORANGE};text-decoration:none;font-weight:700;">${host}</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function schoolCodeBlock(code: string, note: string) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
      <tr>
        <td style="padding:24px 20px;border-radius:14px;text-align:center;background:${TINT};">
          <div style="font-size:12px;font-weight:600;letter-spacing:0.04em;color:${MUTED};margin-bottom:12px;">School code</div>
          <div style="font-size:36px;font-weight:800;letter-spacing:0.08em;color:${ORANGE};line-height:1;">${esc(code)}</div>
          <div style="font-size:13px;font-weight:500;color:${MUTED};margin-top:10px;line-height:1.5;">${esc(note)}</div>
        </td>
      </tr>
    </table>`
}

function sectionLabel(label: string) {
  return `<div style="font-size:13px;font-weight:700;color:${INK};margin:32px 0 14px;letter-spacing:-0.01em;">${esc(label)}</div>`
}

function detailList(rows: Array<{ label: string; value: string }>) {
  const inner = rows.map((row, i) => {
    const border = i < rows.length - 1 ? `border-bottom:1px solid ${SOFT};` : ''
    return `
      <tr>
        <td style="padding:14px 0;${border}vertical-align:top;">
          <div style="font-size:12px;font-weight:600;color:${MUTED};margin-bottom:4px;">${esc(row.label)}</div>
          <div style="font-size:15px;font-weight:600;color:${INK};line-height:1.45;">${esc(row.value)}</div>
        </td>
      </tr>`
  }).join('')

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${inner}
    </table>`
}

function eventChip(name: string, meta: string) {
  return `
    <span style="display:inline-block;margin:0 8px 8px 0;padding:7px 12px;border-radius:999px;background:${SURFACE};font-size:13px;font-weight:600;color:${INK};">
      ${esc(name)}<span style="color:${MUTED};font-weight:500;"> · ${esc(meta)}</span>
    </span>`
}

function renderEventBlock(ev: EmailEvent) {
  const meta = `${ev.eventCategory || 'Event'}${ev.eventMode ? ` · ${ev.eventMode}` : ''}`
  const participants = ev.participants.map((p) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${SOFT};">
        <div style="font-size:15px;font-weight:700;color:${INK};margin-bottom:4px;">
          ${esc(p.name)}
          <span style="display:inline-block;font-size:11px;font-weight:700;color:${ORANGE};background:${TINT};padding:3px 9px;border-radius:999px;margin-left:8px;vertical-align:middle;">${esc(p.grade)}</span>
        </div>
        <div style="font-size:13px;font-weight:500;color:${MUTED};line-height:1.5;">${esc(p.email)} · ${esc(p.phone)}</div>
      </td>
    </tr>
  `).join('')

  return `
    <div style="margin-bottom:24px;">
      ${eventChip(ev.eventName, meta)}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:4px;">
        ${participants}
      </table>
    </div>`
}

export function buildTeacherEmail(ctx: RegistrationEmailContext) {
  const name = firstName(ctx.teacher.name)
  const newEventNames = ctx.events.map((e) => e.eventName)
  const isReturning = ctx.isReturningSchool

  const headline = isReturning
    ? `Welcome back, ${esc(name)}`
    : `You're all set, ${esc(name)}`

  const intro = isReturning
    ? `Your new registration for ${esc(ctx.schoolName)} is confirmed. Your school code stays the same.`
    : `${esc(ctx.schoolName)} is registered for Cyfernode 5.0. Save your school code below.`

  const codeNote = isReturning
    ? 'Same code for your school across all events.'
    : 'Unique to your school. Keep it safe.'

  const priorBlock = isReturning && ctx.priorEventNames.length
    ? `<div style="margin:20px 0 0;padding:16px 18px;border-radius:12px;background:${SURFACE};font-size:14px;line-height:1.55;color:${MUTED};font-weight:500;">
        <span style="color:${INK};font-weight:700;">Previously:</span> ${esc(ctx.priorEventNames.join(', '))}<br>
        <span style="color:${INK};font-weight:700;">New now:</span> ${esc(newEventNames.join(', '))}
      </div>`
    : ''

  const eventChips = ctx.events.map((ev) => eventChip(
    ev.eventName,
    `${ev.eventCategory || 'Event'}${ev.eventMode ? ` · ${ev.eventMode}` : ''}`,
  )).join('')

  const body = `
    <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;letter-spacing:-0.04em;line-height:1.15;color:${INK};">${headline}</h1>
    <p style="margin:0;font-size:16px;line-height:1.6;color:${MUTED};font-weight:500;">${intro}</p>
    ${priorBlock}
    ${schoolCodeBlock(ctx.schoolCode, codeNote)}
    ${sectionLabel('Events')}
    <div style="margin-bottom:8px;">${eventChips}</div>
    ${sectionLabel('Registration details')}
    ${detailList([
      { label: 'School', value: ctx.schoolName },
      { label: 'Teacher in charge', value: ctx.teacher.name },
      { label: 'Phone', value: ctx.teacher.phone },
      { label: 'Email', value: ctx.teacher.email },
      { label: 'Registration ID', value: ctx.registrationId },
    ])}
    ${sectionLabel('Participants')}
    ${ctx.events.map(renderEventBlock).join('')}
    <p style="margin:36px 0 0;font-size:15px;line-height:1.6;color:${MUTED};font-weight:500;">
      Warm regards,<br><span style="color:${INK};font-weight:700;">Team Cyfernode</span>
    </p>`

  const subject = isReturning
    ? `Cyfernode 5.0 | New registration for ${ctx.schoolName} (${ctx.schoolCode})`
    : `Cyfernode 5.0 | Registration confirmed for ${ctx.schoolName} (${ctx.schoolCode})`

  return {
    subject,
    html: emailShell(subject, body, ctx.siteUrl),
  }
}

export function buildParticipantEmail(
  ctx: RegistrationEmailContext,
  ev: EmailEvent,
  participant: EmailParticipant,
) {
  const name = firstName(participant.name)
  const meta = `${ev.eventCategory || 'Event'}${ev.eventMode ? ` · ${ev.eventMode}` : ''}`

  const body = `
    <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;letter-spacing:-0.04em;line-height:1.15;color:${INK};">You're in, ${esc(name)}</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${MUTED};font-weight:500;">
      Your spot at Cyfernode 5.0 is confirmed.
    </p>
    ${eventChip(ev.eventName, meta)}
    ${schoolCodeBlock(ctx.schoolCode, ctx.schoolName)}
    ${sectionLabel('Your details')}
    ${detailList([
      { label: 'Name', value: participant.name },
      { label: 'Class', value: participant.grade },
      { label: 'School', value: ctx.schoolName },
      { label: 'Event', value: ev.eventName },
    ])}
    ${sectionLabel('Teacher contact')}
    ${detailList([
      { label: 'Name', value: ev.teacherIncharge.name },
      { label: 'Phone', value: ev.teacherIncharge.phone },
      { label: 'Email', value: ev.teacherIncharge.email },
    ])}
    <div style="margin-top:28px;font-size:12px;font-weight:600;color:${MUTED};text-align:center;letter-spacing:0.02em;">
      ${esc(ctx.registrationId)}
    </div>
    <p style="margin:28px 0 0;font-size:15px;line-height:1.6;color:${MUTED};font-weight:500;">
      See you at Cyfernode 5.0.<br><span style="color:${INK};font-weight:700;">Team Cyfernode</span>
    </p>`

  const subject = `Cyfernode 5.0 | You're registered for ${ev.eventName}`

  return {
    subject,
    html: emailShell(subject, body, ctx.siteUrl),
  }
}

async function sendViaBrevoApi(
  to: { email: string; name: string },
  subject: string,
  htmlContent: string,
  apiKey: string,
  senderEmail: string,
  senderName: string,
) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to.email, name: to.name }],
      subject,
      htmlContent,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('Brevo API email failed:', res.status, errText)
    return { ok: false, error: errText }
  }

  return { ok: true }
}

async function sendBrevoEmail(to: { email: string; name: string }, subject: string, htmlContent: string) {
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'Cyfernode'
  const apiKey = Deno.env.get('BREVO_API_KEY')

  if (!senderEmail) {
    console.warn('Brevo email skipped: missing BREVO_SENDER_EMAIL')
    return { ok: false, skipped: true as const }
  }

  if (!apiKey) {
    console.warn('Brevo email skipped: missing BREVO_API_KEY')
    return { ok: false, skipped: true as const }
  }

  if (apiKey.startsWith('xsmtpsib-')) {
    console.error('Brevo email skipped: BREVO_API_KEY must be xkeysib-..., not SMTP key')
    return { ok: false, error: 'Invalid BREVO_API_KEY type' }
  }

  return sendViaBrevoApi(to, subject, htmlContent, apiKey, senderEmail, senderName)
}

export async function sendRegistrationEmails(ctx: RegistrationEmailContext) {
  const results: Array<{ kind: string; email: string; ok: boolean; skipped?: boolean }> = []

  const teacherMail = buildTeacherEmail(ctx)
  const teacherResult = await sendBrevoEmail(
    { email: ctx.teacher.email, name: ctx.teacher.name },
    teacherMail.subject,
    teacherMail.html,
  )
  results.push({
    kind: 'teacher',
    email: ctx.teacher.email,
    ok: teacherResult.ok,
    skipped: 'skipped' in teacherResult ? teacherResult.skipped : undefined,
  })

  for (const ev of ctx.events) {
    for (const participant of ev.participants) {
      const mail = buildParticipantEmail(ctx, ev, participant)
      const result = await sendBrevoEmail(
        { email: participant.email, name: participant.name },
        mail.subject,
        mail.html,
      )
      results.push({
        kind: 'participant',
        email: participant.email,
        ok: result.ok,
        skipped: 'skipped' in result ? result.skipped : undefined,
      })
    }
  }

  const sent = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok && !r.skipped).length
  console.log(`Registration emails: ${sent} sent, ${failed} failed, ${results.length} total`)

  return { sent, failed, results }
}
