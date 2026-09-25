/**
 * Send prompt links to all registered teachers and students.
 * - Teachers get a formal email with ALL event prompt links their school is registered in.
 * - Students get a friendly casual email with THEIR event prompt link.
 * - Emails are sent with a delay between each to avoid rate-limiting.
 * 
 * Run: BREVO_API_KEY="..." node scripts/send-prompt-links.mjs
 */

import { readFileSync } from 'fs'
import { setTimeout as sleep } from 'timers/promises'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const SENDER_EMAIL = 'hello@cyfernode.com'
const SENDER_NAME = 'Cyfernode Team'
const DELAY_MS = 800 // delay between emails to be nice to Brevo rate limits
const DRY_RUN = !BREVO_API_KEY

const BANNER_IMAGE_URL = 'https://i.ibb.co/Lzsh2Rth/banner-email-cyfernode.jpg'
const SITE_URL = 'https://cyfernode.com'
const DISCORD_INVITE_URL = 'https://discord.gg/bkqrUAAnvc'

const PROMPTS_PAGE = 'https://cyfernode.com/prompts'

const data = JSON.parse(readFileSync('scripts/email-recipients.json', 'utf8'))

// ─── EMAIL BUILDERS ───────────────────────────────────────────────────────────

function header() {
  return `
    <tr>
      <td style="padding:0;background-color:#111114;text-align:center;">
        <img src="${BANNER_IMAGE_URL}" alt="Cyfernode 5.0" width="600" style="width:100%;max-width:600px;height:auto;display:block;border:0;">
      </td>
    </tr>`
}

function footer() {
  return `
    <tr>
      <td style="padding:20px 32px 28px;background:#f8f9fa;border-top:1px solid rgba(17,17,20,0.08);">
        <p style="margin:0;font-size:12px;color:rgba(17,17,20,0.5);line-height:1.6;">
          Team Cyfernode &bull; Summer Fields School, DLF Phase 1, Gurugram &bull;
          <a href="${SITE_URL}" style="color:#d24500;text-decoration:none;">cyfernode.com</a>
        </p>
        <p style="margin:6px 0 0;font-size:12px;color:rgba(17,17,20,0.4);">
          Questions? Reply to this email or reach us at
          <a href="mailto:bhavesh.rout50@gmail.com" style="color:#d24500;text-decoration:none;">bhavesh.rout50@gmail.com</a>
        </p>
      </td>
    </tr>`
}

function discordBanner() {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="margin:20px 0;background-color:#f8f9ff;border:1px solid rgba(88,101,242,0.25);border-radius:10px;">
      <tr>
        <td style="padding:12px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;">
                <div style="font-size:13px;font-weight:700;color:#5865F2;margin-bottom:2px;">Official Discord Server</div>
                <div style="font-size:12px;color:rgba(17,17,20,0.55);">Live updates, announcements, and event info — all on Discord.</div>
              </td>
              <td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;">
                <a href="${DISCORD_INVITE_URL}" target="_blank"
                  style="display:inline-block;padding:7px 13px;background-color:#5865F2;color:#fff;text-decoration:none;font-size:12px;font-weight:700;border-radius:7px;">
                  Join Discord &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

function eventLinkRow(event) {
  return `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid rgba(17,17,20,0.07);">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(17,17,20,0.45);margin-bottom:2px;">
          ${event.name}
        </div>
        <a href="${event.link}" style="font-size:14px;font-weight:700;color:#d24500;text-decoration:none;">${event.link}</a>
      </td>
    </tr>`
}

function wrapEmail(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#111114;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f6;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(17,17,20,0.07);border:1px solid rgba(17,17,20,0.08);">
          ${bodyHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// TEACHER EMAIL — formal, all events listed
function buildTeacherEmail(teacher) {
  const eventRows = teacher.events.map(eventLinkRow).join('')
  const html = wrapEmail(`
    ${header()}
    <tr>
      <td style="padding:28px 32px 8px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d24500;margin-bottom:8px;">
          Prompt Pages Now Live &bull; Cyfernode 5.0
        </div>
        <h1 style="font-size:20px;font-weight:800;color:#111114;margin:0 0 16px;line-height:1.25;letter-spacing:-0.02em;">
          Event Prompts are now accessible
        </h1>
        <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.8);margin:0 0 12px;">
          Dear ${teacher.name},
        </p>
        <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.8);margin:0 0 16px;">
          The prompt pages for the events your school is registered in are now live.
          Please find the links below and share them with your respective student teams at the earliest.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="border:1px solid rgba(17,17,20,0.1);border-radius:10px;overflow:hidden;margin-bottom:18px;">
          ${eventRows}
        </table>
        <p style="font-size:14px;line-height:1.6;color:rgba(17,17,20,0.7);margin:0 0 8px;">
          Each prompt page contains the complete event brief, rules, and deliverable requirements.
          Students should go through their respective prompt carefully before the event day.
        </p>
        ${discordBanner()}
        <p style="font-size:14px;line-height:1.6;color:rgba(17,17,20,0.8);margin:16px 0 0;">
          Thank you for participating in Cyfernode 5.0. We look forward to welcoming your school.
        </p>
        <p style="font-size:14px;line-height:1.6;color:rgba(17,17,20,0.8);margin:6px 0 0;">
          Warm regards,<br>
          <strong>Team Cyfernode</strong><br>
          Summer Fields School, Gurugram
        </p>
      </td>
    </tr>
    ${footer()}
  `)
  return {
    subject: 'Cyfernode 5.0 — Event Prompt Pages are now Live',
    html,
  }
}

// STUDENT EMAIL — friendly casual, their event
function buildStudentEmail(student) {
  const eventRows = student.events.map(eventLinkRow).join('')
  const multiEvent = student.events.length > 1
  const html = wrapEmail(`
    ${header()}
    <tr>
      <td style="padding:28px 32px 8px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d24500;margin-bottom:8px;">
          Prompts are Live &bull; Cyfernode 5.0
        </div>
        <h1 style="font-size:20px;font-weight:800;color:#111114;margin:0 0 16px;line-height:1.25;letter-spacing:-0.02em;">
          Your event prompt is now live 🎉
        </h1>
        <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.8);margin:0 0 12px;">
          Hey ${student.name.trim().split(' ')[0]}!
        </p>
        <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.8);margin:0 0 16px;">
          The prompt${multiEvent ? 's' : ''} for your ${multiEvent ? 'events are' : 'event is'} now live on cyfernode.com.
          Check ${multiEvent ? 'them' : 'it'} out below and start building your idea — you've got this!
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="border:1px solid rgba(17,17,20,0.1);border-radius:10px;overflow:hidden;margin-bottom:18px;">
          ${eventRows}
        </table>
        <p style="font-size:14px;line-height:1.6;color:rgba(17,17,20,0.7);margin:0 0 8px;">
          Read the full prompt carefully — it covers everything you need to know about deliverables, judging criteria, and what the judges are looking for. Good luck! 🔥
        </p>
        ${discordBanner()}
        <p style="font-size:14px;line-height:1.6;color:rgba(17,17,20,0.8);margin:16px 0 0;">
          See you at Cyfernode 5.0!<br>
          <strong>Team Cyfernode</strong>
        </p>
      </td>
    </tr>
    ${footer()}
  `)
  return {
    subject: `Cyfernode 5.0 — Your ${student.events.map(e => e.name).join(' & ')} Prompt is Live`,
    html,
  }
}

// ─── BREVO SENDER ─────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] → ${to.email} (${to.name}) | ${subject}`)
    return true
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to.email, name: to.name }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`  ✗ Failed ${to.email}: ${res.status} ${err}`)
    return false
  }
  console.log(`  ✓ Sent → ${to.email} (${to.name})`)
  return true
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no emails sent)' : 'LIVE'}`)
  console.log(`Teachers: ${data.teachers.length}, Students: ${data.students.length}`)
  console.log(`Delay between emails: ${DELAY_MS}ms\n`)

  let sent = 0, failed = 0

  // 1. Teachers
  console.log('=== TEACHER EMAILS ===')
  for (const teacher of data.teachers) {
    const { subject, html } = buildTeacherEmail(teacher)
    const ok = await sendEmail({ to: { email: teacher.email, name: teacher.name }, subject, html })
    ok ? sent++ : failed++
    await sleep(DELAY_MS)
  }

  console.log('\n=== STUDENT EMAILS ===')
  for (const student of data.students) {
    const { subject, html } = buildStudentEmail(student)
    const ok = await sendEmail({ to: { email: student.email, name: student.name }, subject, html })
    ok ? sent++ : failed++
    await sleep(DELAY_MS)
  }

  console.log(`\n✅ Done. Sent: ${sent}, Failed: ${failed}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
