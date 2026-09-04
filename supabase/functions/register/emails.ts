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

export const DISCORD_INVITE_URL = 'https://discord.gg/bkqrUAAnvc'
export const OFFICIAL_BROCHURE_FILENAME = 'CyferNode_5.0_Official_Event_Brochure_2026.pdf'

export const EVENT_WHATSAPP_LINKS: Record<string, { name: string; url: string }> = {
  'fontastic': {
    name: 'Fontastic',
    url: 'https://chat.whatsapp.com/Fsx8KiX5adXELmodOr0foU',
  },
  'blendered': {
    name: 'Blendered',
    url: 'https://chat.whatsapp.com/KoCEixQYMf7Ij9D1A8FCYJ',
  },
  'unscripted': {
    name: 'Unscripted',
    url: 'https://chat.whatsapp.com/J9K23ikzIhKIQBhI6aWM7Z',
  },
  'clue-less': {
    name: 'Clue-Less',
    url: 'https://chat.whatsapp.com/HmqJuxHyRlO7zyXL1RYVRY',
  },
  'runtime-terror': {
    name: 'Runtime Terror',
    url: 'https://chat.whatsapp.com/DaFoM1EpDcM57b7k5wrZe8',
  },
  'buildout': {
    name: 'Buildout',
    url: 'https://chat.whatsapp.com/JoubWCLFmtdJXl68NhUvip',
  },
  'breadboard': {
    name: 'Breadboard',
    url: 'https://chat.whatsapp.com/KzxquJQFDycJVBxh7cktUN',
  },
  'wireframe': {
    name: 'Wireframe',
    url: 'https://chat.whatsapp.com/LkgUdFRaOF9IdcjXBHGDf',
  },
  'entrepreneur-exe': {
    name: 'Entrepreneur.exe',
    url: 'https://chat.whatsapp.com/DHQWNZerWPYJQ8vOnqDEAg',
  },
  'unbranded': {
    name: 'Unbranded',
    url: 'https://chat.whatsapp.com/JrbpEbfEKlB8UvTRfgxmtM',
  },
}

export function getEventWhatsApp(idOrName: string) {
  const key = String(idOrName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (EVENT_WHATSAPP_LINKS[key]) return EVENT_WHATSAPP_LINKS[key]

  for (const [k, v] of Object.entries(EVENT_WHATSAPP_LINKS)) {
    if (key.includes(k) || k.includes(key) || String(idOrName).toLowerCase().includes(v.name.toLowerCase())) {
      return v
    }
  }
  return null
}

const ORANGE = '#d24500'
const ORANGE_TINT = '#fff5ee'
const ORANGE_BORDER = 'rgba(210, 69, 0, 0.2)'
const INK = '#09090b'
const MUTED = '#52525b'
const LIGHT_MUTED = '#71717a'
const BORDER = '#e4e4e7'
const CARD_BG = '#fbfbfb'
const DISCORD_BLUE = '#5865F2'
const WHATSAPP_GREEN = '#16a34a'
const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

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

function brochureUrl(siteUrl: string) {
  return `${siteUrl.replace(/\/$/, '')}/${OFFICIAL_BROCHURE_FILENAME}`
}

function bannerUrl(siteUrl: string) {
  return `${siteUrl.replace(/\/$/, '')}/assets/emailbanner.jpg`
}

function emailHead(title: string) {
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://api.fontshare.com">
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,800,900&display=swap" rel="stylesheet">
  <style>
    body, table, td, div, p, h1, h2, h3, a, span {
      font-family: ${FONT} !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    a {
      color: inherit;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .email-content {
        padding: 28px 20px !important;
      }
      .email-footer {
        padding: 20px 20px 36px !important;
      }
    }
  </style>`
}

function emailShell(title: string, bodyHtml: string, siteUrl: string) {
  const host = esc(siteUrl.replace(/^https?:\/\//, ''))
  const banner = esc(bannerUrl(siteUrl))
  const brochure = esc(brochureUrl(siteUrl))

  return `<!DOCTYPE html>
<html lang="en">
<head>${emailHead(title)}</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${FONT};color:${INK};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table class="email-container" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;border:1px solid ${BORDER};box-shadow:0 4px 20px rgba(0, 0, 0, 0.04);overflow:hidden;">
          <!-- Banner Header -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;background-color:#000000;">
              <a href="${esc(siteUrl)}" target="_blank" style="display:block;text-decoration:none;">
                <img src="${banner}" width="580" alt="Cyfernode 5.0" style="display:block;width:100%;max-width:580px;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <!-- Main Body -->
          <tr>
            <td class="email-content" style="padding:40px 36px 20px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding:24px 36px 40px;background-color:#fafafa;border-top:1px solid ${BORDER};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="font-size:12px;line-height:1.6;color:${LIGHT_MUTED};font-weight:500;">
                    <div style="font-weight:700;color:${INK};font-size:13px;letter-spacing:-0.01em;margin-bottom:4px;">
                      Cyfernode 5.0 &bull; Summer Fields School, DLF Phase 1, Gurugram
                    </div>
                    <div>
                      Official Tech Symposium &bull; <a href="${esc(siteUrl)}" target="_blank" style="color:${ORANGE};text-decoration:none;font-weight:600;">${host}</a> &bull; <a href="${brochure}" target="_blank" style="color:${ORANGE};text-decoration:none;font-weight:600;">Event Brochure</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function schoolCodeBlock(code: string, note = 'Unique identifier for your school. Keep this code safe for event submissions and correspondence.') {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
      <tr>
        <td style="padding:24px 20px;border-radius:12px;text-align:center;background-color:${ORANGE_TINT};border:1px solid ${ORANGE_BORDER};">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${ORANGE};margin-bottom:8px;">Official School Code</div>
          <div style="font-size:36px;font-weight:800;letter-spacing:0.08em;color:${INK};line-height:1;">${esc(code)}</div>
          <div style="font-size:12px;font-weight:500;color:${MUTED};margin-top:10px;line-height:1.4;">${esc(note)}</div>
        </td>
      </tr>
    </table>`
}

function sectionTitle(title: string, subtitle?: string) {
  return `
    <div style="margin:32px 0 12px;border-bottom:1px solid ${BORDER};padding-bottom:8px;">
      <div style="font-size:14px;font-weight:800;letter-spacing:-0.02em;text-transform:uppercase;color:${INK};">${esc(title)}</div>
      ${subtitle ? `<div style="font-size:12px;font-weight:500;color:${MUTED};margin-top:2px;">${esc(subtitle)}</div>` : ''}
    </div>`
}

function detailTable(rows: Array<{ label: string; value: string }>) {
  const inner = rows.map((row, i) => {
    const border = i < rows.length - 1 ? `border-bottom:1px solid ${BORDER};` : ''
    return `
      <tr>
        <td style="padding:10px 0;width:38%;font-size:13px;font-weight:600;color:${MUTED};vertical-align:top;${border}">${esc(row.label)}</td>
        <td style="padding:10px 0;font-size:14px;font-weight:600;color:${INK};vertical-align:top;${border}">${esc(row.value)}</td>
      </tr>`
  }).join('')

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
      ${inner}
    </table>`
}

function brochureActionCard(siteUrl: string) {
  const url = brochureUrl(siteUrl)
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid ${BORDER};border-radius:12px;background-color:${CARD_BG};">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;">
                <div style="font-size:14px;font-weight:700;color:${INK};margin-bottom:3px;">Official Event Brochure & Guidelines</div>
                <div style="font-size:12px;line-height:1.45;color:${MUTED};font-weight:500;">Please refer to the brochure for complete event schedules, problem statement formats, rules, and judging criteria.</div>
              </td>
              <td align="right" style="vertical-align:middle;padding-left:16px;white-space:nowrap;">
                <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:10px 16px;background-color:${INK};color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;border-radius:8px;letter-spacing:0.01em;">Download PDF &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

function discordActionCard() {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border:1px solid ${BORDER};border-radius:12px;background-color:${CARD_BG};">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;">
                <div style="font-size:14px;font-weight:700;color:${INK};margin-bottom:3px;">Official Cyfernode Discord Server</div>
                <div style="font-size:12px;line-height:1.45;color:${MUTED};font-weight:500;">Mandatory for all participants. Live announcements, challenge prompt releases, clarifications, and tech discussions will take place here.</div>
              </td>
              <td align="right" style="vertical-align:middle;padding-left:16px;white-space:nowrap;">
                <a href="${DISCORD_INVITE_URL}" target="_blank" style="display:inline-block;padding:10px 16px;background-color:${DISCORD_BLUE};color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;border-radius:8px;letter-spacing:0.01em;">Join Discord &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

function renderTeacherWhatsAppCard(ev: EmailEvent) {
  const wa = getEventWhatsApp(ev.eventId) || getEventWhatsApp(ev.eventName)
  const groupUrl = wa ? wa.url : null
  const groupName = wa ? wa.name : ev.eventName

  if (!groupUrl) return ''

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:10px;border:1px solid ${BORDER};border-radius:10px;background-color:#ffffff;">
      <tr>
        <td style="padding:14px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;">
                <div style="font-size:14px;font-weight:700;color:${INK};">${esc(groupName)}</div>
                <div style="font-size:12px;color:${MUTED};font-weight:500;margin-top:2px;">${esc(ev.eventCategory || 'Event')}${ev.eventMode ? ` &bull; ${esc(ev.eventMode)}` : ''}</div>
              </td>
              <td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;">
                <a href="${esc(groupUrl)}" target="_blank" style="display:inline-block;padding:8px 14px;background-color:#f0fdf4;border:1px solid rgba(22,163,74,0.3);color:${WHATSAPP_GREEN};text-decoration:none;font-size:12px;font-weight:700;border-radius:6px;">Join WhatsApp &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

function renderEventParticipantsBlock(ev: EmailEvent) {
  const meta = `${ev.eventCategory || 'Event'}${ev.eventMode ? ` &bull; ${ev.eventMode}` : ''}`
  const participants = ev.participants.map((p) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER};">
        <div style="font-size:14px;font-weight:700;color:${INK};">
          ${esc(p.name)}
          <span style="display:inline-block;font-size:11px;font-weight:700;color:${ORANGE};background:${ORANGE_TINT};border:1px solid ${ORANGE_BORDER};padding:2px 8px;border-radius:999px;margin-left:6px;vertical-align:middle;">${esc(p.grade)}</span>
        </div>
        <div style="font-size:12px;color:${MUTED};margin-top:3px;font-weight:500;">
          Email: <a href="mailto:${esc(p.email)}" style="color:${INK};text-decoration:none;">${esc(p.email)}</a> &bull; Phone: ${esc(p.phone)}
        </div>
      </td>
    </tr>
  `).join('')

  return `
    <div style="margin-bottom:20px;border:1px solid ${BORDER};border-radius:12px;padding:16px 18px;background-color:${CARD_BG};">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:15px;font-weight:800;color:${INK};">${esc(ev.eventName)}</span>
        <span style="font-size:11px;font-weight:600;color:${MUTED};background:#ffffff;border:1px solid ${BORDER};padding:3px 8px;border-radius:6px;">${esc(meta)}</span>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${participants}
      </table>
    </div>`
}

export function buildTeacherEmail(ctx: RegistrationEmailContext) {
  const teacherFirstName = firstName(ctx.teacher.name)
  const isReturning = ctx.isReturningSchool

  const headline = isReturning
    ? `Registration Update: ${esc(ctx.schoolName)}`
    : `Official Registration Confirmation`

  const introText = isReturning
    ? `Dear ${esc(ctx.teacher.name)},<br><br>We are pleased to confirm that the new event registration for <strong>${esc(ctx.schoolName)}</strong> has been recorded for <strong>Cyfernode 5.0</strong>. Your institutional school code remains unchanged.`
    : `Dear ${esc(ctx.teacher.name)},<br><br>We are pleased to confirm that <strong>${esc(ctx.schoolName)}</strong> has successfully registered for <strong>Cyfernode 5.0</strong>, the annual inter-school technology symposium organized by Summer Fields School, DLF Phase 1, Gurugram.`

  const whatsAppCards = ctx.events
    .map(renderTeacherWhatsAppCard)
    .filter(Boolean)
    .join('')

  const body = `
    <!-- Header Greeting -->
    <div style="margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:${ORANGE};letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;">
        Teacher In-charge Intimation
      </div>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.2;color:${INK};">
        ${headline}
      </h1>
      <p style="margin:0;font-size:14px;line-height:1.65;color:${MUTED};font-weight:500;">
        ${introText}
      </p>
    </div>

    <!-- School Code -->
    ${schoolCodeBlock(ctx.schoolCode, 'This code uniquely identifies your institution across all event submissions, scores, and official communications.')}

    <!-- Official Brochure Section -->
    ${sectionTitle('1. Official Event Brochure & Schedule')}
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${MUTED};font-weight:500;">
      Please download and review the official brochure for comprehensive event guidelines, competition schedules, eligibility criteria, and submission requirements:
    </p>
    ${brochureActionCard(ctx.siteUrl)}

    <!-- Communication & Coordination Section -->
    ${sectionTitle('2. Important Communication Channels')}
    <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${MUTED};font-weight:500;">
      <strong>Action Required:</strong> Please ensure that all participating students from your school join the official Cyfernode Discord server and their respective event WhatsApp groups:
    </p>
    
    <!-- Discord Server -->
    ${discordActionCard()}

    <!-- Event WhatsApp Groups -->
    <div style="margin-top:16px;">
      <div style="font-size:13px;font-weight:700;color:${INK};margin-bottom:6px;">
        Dedicated Event WhatsApp Groups (for your registered events):
      </div>
      <p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:${MUTED};font-weight:500;">
        Please ensure participating students join their respective group below. As the Teacher In-charge, you are also welcome to join these groups for real-time coordinator updates:
      </p>
      ${whatsAppCards || '<p style="font-size:12px;color:' + MUTED + ';">WhatsApp groups will be communicated shortly.</p>'}
    </div>

    <!-- Registration Overview -->
    ${sectionTitle('3. Institution & Teacher Details')}
    ${detailTable([
      { label: 'School Name', value: ctx.schoolName },
      { label: 'School Code', value: ctx.schoolCode },
      { label: 'Teacher In-charge', value: ctx.teacher.name },
      { label: 'Contact Phone', value: ctx.teacher.phone },
      { label: 'Official Email', value: ctx.teacher.email },
      { label: 'Registration ID', value: ctx.registrationId },
    ])}

    <!-- Participant Breakdown -->
    ${sectionTitle('4. Registered Events & Student Contingent')}
    ${ctx.events.map(renderEventParticipantsBlock).join('')}

    <!-- Signoff -->
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid ${BORDER};">
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};font-weight:500;">
        Should you have any queries or require further information, please feel free to reach out to us at our official portal.
      </p>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${INK};font-weight:700;">
        Warm regards,<br>
        <span style="font-size:15px;color:${ORANGE};">Organizing Committee &bull; Cyfernode 5.0</span><br>
        <span style="font-size:12px;color:${MUTED};font-weight:500;">Tech Club, Summer Fields School, DLF Phase 1, Gurugram</span>
      </p>
    </div>`

  const subject = isReturning
    ? `Cyfernode 5.0 | Registration Update for ${ctx.schoolName} [${ctx.schoolCode}]`
    : `Cyfernode 5.0 | Official Registration Confirmation – ${ctx.schoolName} [${ctx.schoolCode}]`

  return {
    subject,
    html: emailShell(subject, body, ctx.siteUrl),
  }
}

function renderParticipantWhatsAppCard(ev: EmailEvent) {
  const wa = getEventWhatsApp(ev.eventId) || getEventWhatsApp(ev.eventName)
  const groupUrl = wa ? wa.url : null
  const groupName = wa ? wa.name : ev.eventName

  if (!groupUrl) return ''

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border:1px solid ${BORDER};border-radius:12px;background-color:${CARD_BG};">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;">
                <div style="font-size:14px;font-weight:700;color:${INK};margin-bottom:3px;">Official ${esc(groupName)} WhatsApp Group</div>
                <div style="font-size:12px;line-height:1.45;color:${MUTED};font-weight:500;">Connect with fellow participants in <strong>${esc(groupName)}</strong> and receive real-time updates and announcements for your event.</div>
              </td>
              <td align="right" style="vertical-align:middle;padding-left:16px;white-space:nowrap;">
                <a href="${esc(groupUrl)}" target="_blank" style="display:inline-block;padding:10px 16px;background-color:#f0fdf4;border:1px solid rgba(22,163,74,0.3);color:${WHATSAPP_GREEN};text-decoration:none;font-size:12px;font-weight:700;border-radius:8px;letter-spacing:0.01em;">Join WhatsApp &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

export function buildParticipantEmail(
  ctx: RegistrationEmailContext,
  ev: EmailEvent,
  participant: EmailParticipant,
) {
  const meta = `${ev.eventCategory || 'Event'}${ev.eventMode ? ` &bull; ${ev.eventMode}` : ''}`

  const body = `
    <!-- Header Greeting -->
    <div style="margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:${ORANGE};letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;">
        Participant Registration Confirmation
      </div>
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.2;color:${INK};">
        Welcome to Cyfernode 5.0, ${esc(participant.name)}!
      </h1>
      <p style="margin:0;font-size:14px;line-height:1.65;color:${MUTED};font-weight:500;">
        Your participation for <strong>${esc(ev.eventName)}</strong> at <strong>Cyfernode 5.0</strong> has been officially confirmed, representing <strong>${esc(ctx.schoolName)}</strong>.
      </p>
    </div>

    <!-- School Code -->
    ${schoolCodeBlock(ctx.schoolCode, 'Your institutional School Code. Quote this in challenge submissions and official queries.')}

    <!-- Next Step: Discord & WhatsApp Communication Channels -->
    ${sectionTitle('1. Important Communication Channels (Action Required)')}
    <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:${MUTED};font-weight:500;">
      All prompt releases, event announcements, submission links, clarifications, and live competition updates take place on our official Discord server and your event WhatsApp group. <strong>Please join both immediately:</strong>
    </p>
    ${discordActionCard()}
    ${renderParticipantWhatsAppCard(ev)}

    <!-- Event Brochure & Rulebook -->
    ${sectionTitle('2. Event Guidelines & Rulebook')}
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${MUTED};font-weight:500;">
      Please review the official event brochure for detailed competition rules, time limits, judging criteria, and deliverable specifications for <strong>${esc(ev.eventName)}</strong>:
    </p>
    ${brochureActionCard(ctx.siteUrl)}

    <!-- Registration Summary -->
    ${sectionTitle('3. Your Registration Details')}
    ${detailTable([
      { label: 'Participant Name', value: participant.name },
      { label: 'Class / Grade', value: participant.grade },
      { label: 'Registered Event', value: `${ev.eventName} (${meta})` },
      { label: 'School Name', value: ctx.schoolName },
      { label: 'School Code', value: ctx.schoolCode },
      { label: 'Teacher In-charge', value: ev.teacherIncharge.name },
      { label: 'Registration ID', value: ctx.registrationId },
    ])}

    <!-- Signoff -->
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid ${BORDER};">
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};font-weight:500;">
        We look forward to seeing your innovation and creativity in action. Best of luck for the competition!
      </p>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${INK};font-weight:700;">
        Warm regards,<br>
        <span style="font-size:15px;color:${ORANGE};">Team Cyfernode</span><br>
        <span style="font-size:12px;color:${MUTED};font-weight:500;">Tech Club, Summer Fields School, DLF Phase 1, Gurugram</span>
      </p>
    </div>`

  const subject = `Cyfernode 5.0 | Registration Confirmed for ${ev.eventName} – ${participant.name}`

  return {
    subject,
    html: emailShell(subject, body, ctx.siteUrl),
  }
}

function getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno?.env?.get) {
    return Deno.env.get(key)
  }
  if (typeof process !== 'undefined' && process?.env) {
    return process.env[key]
  }
  return undefined
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
  const senderEmail = getEnv('BREVO_SENDER_EMAIL')
  const senderName = getEnv('BREVO_SENDER_NAME') ?? 'Cyfernode'
  const apiKey = getEnv('BREVO_API_KEY')

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
