const BANNER_IMAGE_URL = 'https://i.ibb.co/Lzsh2Rth/banner-email-cyfernode.jpg'
const DISCORD_INVITE_URL = 'https://discord.gg/bkqrUAAnvc'
const SITE_URL = 'https://cyfernode.com'

export function escapeHtml(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ''
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export type EmailDeliverableItem = {
  name: string
  type: 'file' | 'url' | 'text'
  fileName?: string | null
  fileSize?: number | null
  filePath?: string | null
  downloadUrl?: string | null
  value?: string | null
}

function emailLayout({
  title,
  kicker,
  contentHtml,
  footerExtraHtml = '',
}: {
  title: string
  kicker: string
  contentHtml: string
  footerExtraHtml?: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#111114;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(17,17,20,0.06);border:1px solid rgba(17,17,20,0.08);">
          <!-- Header Banner -->
          <tr>
            <td style="padding:0;background-color:#111114;text-align:center;">
              <img src="${BANNER_IMAGE_URL}" alt="Cyfernode 5.0" width="600" style="width:100%;max-width:600px;height:auto;display:block;border:0;">
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding:32px 32px 28px 32px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d24500;margin-bottom:8px;">
                ${escapeHtml(kicker)}
              </div>
              <h1 style="font-size:22px;font-weight:800;color:#111114;margin:0 0 20px 0;line-height:1.25;letter-spacing:-0.02em;">
                ${escapeHtml(title)}
              </h1>
              
              ${contentHtml}

              <!-- Support and Links -->
              <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(17,17,20,0.08);font-size:13px;color:rgba(17,17,20,0.65);line-height:1.6;">
                <p style="margin:0 0 8px 0;">
                  Questions or technical difficulties? Join the <a href="${DISCORD_INVITE_URL}" style="color:#d24500;text-decoration:none;font-weight:600;">CyferNode Discord Server</a> or reply to this email.
                </p>
                ${footerExtraHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
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
}

function renderDeliverablesSection(items: EmailDeliverableItem[]): string {
  if (!items.length) {
    return '<p style="font-size:14px;color:rgba(17,17,20,0.7);font-style:italic;">No deliverables were recorded.</p>'
  }

  const rows = items.map((item) => {
    let detailHtml = ''
    if (item.type === 'file') {
      const sizeStr = item.fileSize ? ` <span style="color:rgba(17,17,20,0.5);font-size:12px;">(${formatBytes(item.fileSize)})</span>` : ''
      const fileBadge = `<span style="font-weight:600;color:#111114;">${escapeHtml(item.fileName || 'Uploaded file')}</span>${sizeStr}`
      const downloadBtn = item.downloadUrl
        ? `<div style="margin-top:6px;"><a href="${escapeHtml(item.downloadUrl)}" style="display:inline-block;background-color:#111114;color:#ffffff;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">View / Download File &rarr;</a> <span style="font-size:11px;color:rgba(17,17,20,0.45);margin-left:6px;">Link active for 7 days</span></div>`
        : ''
      detailHtml = `${fileBadge}${downloadBtn}`
    } else if (item.type === 'url') {
      const url = String(item.value || '').trim()
      detailHtml = url
        ? `<a href="${escapeHtml(url)}" style="color:#d24500;word-break:break-all;text-decoration:none;font-weight:600;">${escapeHtml(url)} &nearr;</a>`
        : '<span style="color:rgba(17,17,20,0.45);font-style:italic;">No link provided</span>'
    } else {
      detailHtml = `<div style="background-color:#fafafa;padding:8px 12px;border-radius:6px;border:1px solid rgba(17,17,20,0.06);font-size:13px;line-height:1.5;white-space:pre-wrap;color:rgba(17,17,20,0.85);">${escapeHtml(item.value || 'None')}</div>`
    }

    return `
      <tr style="border-bottom:1px solid rgba(17,17,20,0.06);">
        <td style="padding:12px 8px 12px 0;vertical-align:top;width:35%;font-size:13px;font-weight:600;color:#111114;">
          ${escapeHtml(item.name)}
          <div style="font-size:11px;font-weight:500;color:rgba(17,17,20,0.5);text-transform:uppercase;margin-top:2px;">${escapeHtml(item.type)}</div>
        </td>
        <td style="padding:12px 0;vertical-align:top;font-size:13px;color:rgba(17,17,20,0.85);">
          ${detailHtml}
        </td>
      </tr>
    `
  }).join('')

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-collapse:collapse;">
      ${rows}
    </table>
  `
}

/**
 * 1. Passkey Email Template
 */
export function buildPasskeyEmail({
  participantName,
  schoolName,
  schoolCode,
  passkey,
}: {
  participantName: string
  schoolName: string
  schoolCode: string
  passkey: string
}): { subject: string; html: string } {
  const subject = `CyferNode 5.0 — Your Submission Passkey (${schoolCode})`
  const kicker = 'CyferNode 5.0 · Submission Verification'
  const title = 'Your School Submission Passkey'

  const contentHtml = `
    <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 16px 0;">
      Dear <strong>${escapeHtml(participantName)}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 20px 0;">
      You requested access to the <strong>CyferNode 5.0 Submission Portal</strong> for <strong>${escapeHtml(schoolName)}</strong> (${escapeHtml(schoolCode)}).
    </p>

    <!-- Passkey Box -->
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

    <!-- Instructions -->
    <div style="background-color:#fafafa;border:1px solid rgba(17,17,20,0.08);border-radius:10px;padding:16px 20px;margin:0 0 20px 0;">
      <h3 style="font-size:14px;font-weight:700;color:#111114;margin:0 0 10px 0;text-transform:uppercase;letter-spacing:0.04em;">
        Instructions
      </h3>
      <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.65;color:rgba(17,17,20,0.85);">
        <li>Return to the CyferNode Submission tab in your browser.</li>
        <li>Enter this <strong>4-digit passkey</strong> to authenticate your session.</li>
        <li>View your registered events, upload deliverables, and submit when ready.</li>
      </ol>
    </div>

    <!-- Security Warning -->
    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;font-size:13px;line-height:1.55;color:#991b1b;margin:0 0 16px 0;">
      <strong>Security Notice:</strong> Do not share this passkey. Anyone with this 4-digit code and your school email can access and submit entries on behalf of your school teams.
    </div>
  `

  const html = emailLayout({
    title,
    kicker,
    contentHtml,
  })

  return { subject, html }
}

/**
 * 2. Teacher Submission Email Template
 */
export function buildTeacherSubmissionEmail({
  teacherName,
  schoolName,
  schoolCode,
  eventName,
  teamName,
  submittedByName,
  submittedByEmail,
  submittedAt,
  deliverables,
  referenceCode,
}: {
  teacherName: string
  schoolName: string
  schoolCode: string
  eventName: string
  teamName: string
  submittedByName: string
  submittedByEmail: string
  submittedAt: string
  deliverables: EmailDeliverableItem[]
  referenceCode: string
}): { subject: string; html: string } {
  const subject = `CyferNode Submission Received — ${eventName} — ${teamName}`
  const kicker = 'CyferNode 5.0 · Teacher Notification'
  const title = `Submission Received: ${eventName}`

  const contentHtml = `
    <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 16px 0;">
      Dear <strong>${escapeHtml(teacherName || 'Teacher In-Charge')}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 20px 0;">
      A team from your school has successfully submitted their entry for <strong>${escapeHtml(eventName)}</strong> at CyferNode 5.0.
    </p>

    <!-- Submission Summary Card -->
    <div style="background-color:#fafafa;border:1px solid rgba(17,17,20,0.08);border-radius:12px;padding:18px 20px;margin:0 0 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;">
        <tr>
          <td style="padding:4px 0;width:35%;color:rgba(17,17,20,0.6);font-weight:500;">School:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(schoolName)} (${escapeHtml(schoolCode)})</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Event:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(eventName)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Team:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(teamName)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Submitted By:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(submittedByName)} &lt;${escapeHtml(submittedByEmail)}&gt;</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Submission Date:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(submittedAt)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Reference Code:</td>
          <td style="padding:4px 0;color:#d24500;font-weight:700;font-family:Consolas, monospace;">${escapeHtml(referenceCode)}</td>
        </tr>
      </table>
    </div>

    <!-- Deliverables -->
    <h3 style="font-size:15px;font-weight:700;color:#111114;margin:0 0 8px 0;letter-spacing:-0.01em;">
      Submitted Deliverables
    </h3>
    ${renderDeliverablesSection(deliverables)}

    <!-- Lock notice -->
    <div style="background-color:#fff5ee;border:1px solid rgba(210,69,0,0.25);border-radius:10px;padding:12px 16px;margin:24px 0 0 0;font-size:13px;line-height:1.5;color:#9a3412;">
      <strong>Note:</strong> This entry is now officially locked and recorded for evaluation. Students cannot make further changes.
    </div>
  `

  const html = emailLayout({
    title,
    kicker,
    contentHtml,
  })

  return { subject, html }
}

/**
 * 3. Student Team Submission Email Template
 */
export function buildStudentSubmissionEmail({
  studentName,
  schoolName,
  schoolCode,
  eventName,
  teamName,
  submittedByName,
  submittedAt,
  deliverables,
  referenceCode,
}: {
  studentName: string
  schoolName: string
  schoolCode: string
  eventName: string
  teamName: string
  submittedByName: string
  submittedAt: string
  deliverables: EmailDeliverableItem[]
  referenceCode: string
}): { subject: string; html: string } {
  const subject = 'Your CyferNode Team Submission Has Been Submitted'
  const kicker = 'CyferNode 5.0 · Team Submission Confirmation'
  const title = `Your Team Entry for ${eventName} Has Been Submitted`

  const contentHtml = `
    <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 16px 0;">
      Hello <strong>${escapeHtml(studentName)}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 20px 0;">
      Great job! Your team has finalized and submitted your entry for <strong>${escapeHtml(eventName)}</strong>.
    </p>

    <!-- Submission Summary Card -->
    <div style="background-color:#fafafa;border:1px solid rgba(17,17,20,0.08);border-radius:12px;padding:18px 20px;margin:0 0 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;">
        <tr>
          <td style="padding:4px 0;width:35%;color:rgba(17,17,20,0.6);font-weight:500;">School:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(schoolName)} (${escapeHtml(schoolCode)})</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Event:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(eventName)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Team:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(teamName)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Submitted By:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(submittedByName)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Submission Time:</td>
          <td style="padding:4px 0;color:#111114;font-weight:600;">${escapeHtml(submittedAt)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:rgba(17,17,20,0.6);font-weight:500;">Reference Code:</td>
          <td style="padding:4px 0;color:#d24500;font-weight:700;font-family:Consolas, monospace;">${escapeHtml(referenceCode)}</td>
        </tr>
      </table>
    </div>

    <!-- Deliverables -->
    <h3 style="font-size:15px;font-weight:700;color:#111114;margin:0 0 8px 0;letter-spacing:-0.01em;">
      What Was Submitted
    </h3>
    ${renderDeliverablesSection(deliverables)}

    <!-- Team Confirmation -->
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin:24px 0 0 0;font-size:13px;line-height:1.5;color:#166534;">
      <strong>Submission Status:</strong> Finalized and locked. Your Teacher In-Charge has also been notified. Keep your reference code handy.
    </div>
  `

  const html = emailLayout({
    title,
    kicker,
    contentHtml,
  })

  return { subject, html }
}
