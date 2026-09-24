import { corsHeaders } from '../_shared/cors.ts'

const BANNER_IMAGE_URL = 'https://i.ibb.co/Lzsh2Rth/banner-email-cyfernode.jpg'
const SITE_URL = 'https://cyfernode.com'
const DISCORD_INVITE_URL = 'https://discord.gg/bkqrUAAnvc'

function buildEmailHtml({
  recipientName,
  roleOrEvent,
  isTeacher,
}: {
  recipientName: string
  roleOrEvent: string
  isTeacher: boolean
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cyfernode 5.0 - Important School Code Clarification</title>
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
                Important Registration Update &bull; Cyfernode 5.0
              </div>
              <h1 style="font-size:22px;font-weight:800;color:#111114;margin:0 0 16px 0;line-height:1.25;letter-spacing:-0.02em;">
                School Code Unified: Amity International School Sec 43 is CYN25
              </h1>
              
              <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 16px 0;">
                Dear ${recipientName},
              </p>

              <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 14px 0;">
                We are writing to provide an important update regarding the school code for <strong>Amity International School, Sector-43, Gurugram</strong> at Cyfernode 5.0.
              </p>

              <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 14px 0;">
                During our registration audit, it was detected that two separate registrations were submitted from Amity International School, Sector-43:
              </p>

              <ul style="margin:0 0 16px 0;padding-left:22px;font-size:14px;line-height:1.7;color:rgba(17,17,20,0.85);">
                <li>One contingent under teacher in-charge <strong>Mr. Naveen Kumar</strong> (Wireframe)</li>
                <li>Another contingent under teacher in-charge <strong>Ms. Jeevan Jyoti</strong> (Unscripted)</li>
              </ul>

              <p style="font-size:15px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 18px 0;">
                Due to slight variations in the typed school name, both groups were initially assigned different school codes by our automated system (CYN24 and CYN25). To prevent any conflicts during scoring, prelim rounds, and symposium day logistics, <strong>we have unified all teams from Amity Sector-43 under a single official school code: CYN25</strong>.
              </p>

              <!-- Unified Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background-color:#fafafa;border:1px solid rgba(17,17,20,0.1);border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="font-size:11px;font-weight:600;color:rgba(17,17,20,0.5);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">School</div>
                          <div style="font-size:15px;font-weight:700;color:#111114;">Amity International School, Sector-43, Gurugram</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:12px;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-right:24px;">
                                <div style="font-size:11px;font-weight:600;color:rgba(17,17,20,0.5);text-transform:uppercase;">Previous Code</div>
                                <div style="font-size:15px;font-weight:700;color:#c81e1e;text-decoration:line-through;margin-top:2px;">CYN24</div>
                              </td>
                              <td style="padding-left:18px;border-left:2px solid rgba(17,17,20,0.12);">
                                <div style="font-size:11px;font-weight:700;color:#d24500;text-transform:uppercase;">Official Unified Code</div>
                                <div style="font-size:20px;font-weight:900;color:#d24500;margin-top:2px;">CYN25</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;border-top:1px solid rgba(17,17,20,0.06);margin-top:12px;">
                          <div style="font-size:11px;font-weight:600;color:rgba(17,17,20,0.5);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">
                            ${isTeacher ? 'Designation' : 'Registered Event'}
                          </div>
                          <div style="font-size:14px;font-weight:700;color:#111114;">${roleOrEvent}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;line-height:1.6;color:rgba(17,17,20,0.85);margin:0 0 16px 0;">
                <strong>Please note:</strong> From now on, your official school code is <strong>CYN25</strong>. All your event registrations, team members, and event slots remain completely safe and confirmed.
              </p>

              <!-- Direct Contact Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 16px 0;background-color:#fff8f5;border:1px solid rgba(210,69,0,0.2);border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:13px;font-weight:700;color:#d24500;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">
                      Questions or Any Confusion?
                    </div>
                    <div style="font-size:14px;line-height:1.6;color:#111114;">
                      If you have any questions or require any assistance, please do not hesitate to contact us directly:
                    </div>
                    <div style="margin-top:10px;font-size:14px;line-height:1.6;color:#111114;">
                      <strong>Bhavesh Rout</strong> (President, Cyfernode)<br>
                      Phone: <a href="tel:+919667017285" style="color:#d24500;font-weight:700;text-decoration:none;">+91 96670 17285</a><br>
                      Email: <a href="mailto:bhavesh.rout50@gmail.com" style="color:#d24500;font-weight:600;text-decoration:none;">bhavesh.rout50@gmail.com</a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Discord Banner -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#f8f9ff;border:1px solid rgba(88,101,242,0.25);border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="font-size:13px;font-weight:700;color:#5865F2;margin-bottom:2px;">Official Discord Server</div>
                          <div style="font-size:12px;color:rgba(17,17,20,0.65);">Live announcements and prompt releases are posted on Discord.</div>
                        </td>
                        <td align="right" style="vertical-align:middle;padding-left:14px;white-space:nowrap;">
                          <a href="${DISCORD_INVITE_URL}" target="_blank" style="display:inline-block;padding:8px 14px;background-color:#5865F2;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;border-radius:8px;">Join Discord &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(17,17,20,0.08);font-size:13px;line-height:1.5;color:rgba(17,17,20,0.6);">
                <p style="margin:0 0 4px 0;font-weight:600;color:#111114;">Team Cyfernode</p>
                <p style="margin:0;">Summer Fields School, DLF Phase 1, Gurugram &bull; <a href="${SITE_URL}" style="color:#d24500;text-decoration:none;font-weight:600;">cyfernode.com</a></p>
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

async function sendViaBrevo(
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
    return { ok: false, error: `${res.status} ${errText}` }
  }
  return { ok: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  const apiKey = Deno.env.get('BREVO_API_KEY')
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'hello@cyfernode.com'
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Cyfernode'

  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'BREVO_API_KEY is not configured' }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const recipients = [
    {
      name: 'Mr. Naveen Kumar',
      email: 'nkumar@aisg43.amity.edu.in',
      roleOrEvent: 'Teacher In-Charge (Wireframe)',
      isTeacher: true,
    },
    {
      name: 'Ms. Jeevan Jyoti',
      email: 'jjyoti@aisg43.amity.edu.in',
      roleOrEvent: 'Teacher In-Charge (Unscripted)',
      isTeacher: true,
    },
    {
      name: 'Aabhav Srivastava',
      email: 'aabhav.srivastava@ais.amity.edu.in',
      roleOrEvent: 'Wireframe (UI/UX Design)',
      isTeacher: false,
    },
    {
      name: 'Prakhar Sharma',
      email: 'prakhar.sharma2@ais.amity.edu.in',
      roleOrEvent: 'Wireframe (UI/UX Design)',
      isTeacher: false,
    },
  ]

  const results = []

  for (const r of recipients) {
    const subject = r.isTeacher
      ? '[Important] School Code Clarification: Amity International School Sec 43 Unified to CYN25 – Cyfernode 5.0'
      : `[Important] School Code Update: CYN25 (${r.roleOrEvent}) – Cyfernode 5.0`

    const htmlContent = buildEmailHtml({
      recipientName: r.name,
      roleOrEvent: r.roleOrEvent,
      isTeacher: r.isTeacher,
    })

    const sendRes = await sendViaBrevo(
      { email: r.email, name: r.name },
      subject,
      htmlContent,
      apiKey,
      senderEmail,
      senderName,
    )

    results.push({
      recipient: r.name,
      email: r.email,
      roleOrEvent: r.roleOrEvent,
      ok: sendRes.ok,
      error: sendRes.error,
    })
  }

  const successCount = results.filter((r) => r.ok).length
  const failCount = results.filter((r) => !r.ok).length

  return new Response(
    JSON.stringify({
      ok: failCount === 0,
      total: results.length,
      successCount,
      failCount,
      results,
    }),
    {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    },
  )
})
