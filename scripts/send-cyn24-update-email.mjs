/**
 * Utility script to send school code update email to Amity International School Sec 43 (Wireframe / Naveen Kumar)
 * Run with: node scripts/send-cyn24-update-email.mjs
 * Requires BREVO_API_KEY environment variable.
 */

const apiKey = process.env.BREVO_API_KEY

async function sendEmail({ to, subject, htmlContent }) {
  if (!apiKey) {
    console.log('[DRY RUN] BREVO_API_KEY not set. Would have sent email to:', to)
    return
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Cyfernode Team', email: 'hello@cyfernode.com' },
      to: Array.isArray(to) ? to : [to],
      subject,
      htmlContent,
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to send email: ${res.status} ${await res.text()}`)
  }

  console.log(`Successfully sent email to: ${JSON.stringify(to)}`)
}

const emailSubject = 'Important Update: School Code Revision for Amity International School, Sector-43 | Cyfernode 5.0'

const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111114; background: #f8f9fa; padding: 24px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .header { background: #111114; color: #ffffff; padding: 28px 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .content { padding: 32px; font-size: 15px; color: #2d3748; }
    .badge-box { background: #fff5f0; border: 1.5px solid #d24500; border-radius: 8px; padding: 18px 20px; margin: 24px 0; text-align: center; }
    .old-code { text-decoration: line-through; color: #a0aec0; font-size: 18px; font-weight: 700; }
    .new-code { color: #d24500; font-size: 26px; font-weight: 800; margin-left: 12px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 10px 14px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .info-table td:first-child { font-weight: 700; color: #4a5568; width: 38%; }
    .footer { background: #f7fafc; padding: 20px 32px; border-top: 1px solid #edf2f7; font-size: 13px; color: #718096; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CYFERNODE 5.0</h1>
      <p style="margin: 6px 0 0; color: #cbd5e0; font-size: 14px;">Annual Inter-School Technology Symposium</p>
    </div>
    <div class="content">
      <p>Dear Teacher In-charge &amp; Participants,</p>
      
      <p>Greetings from Team Cyfernode!</p>
      
      <p>This is an important update regarding your registration for <strong>Amity International School, Sector-43, Gurugram</strong>.</p>
      
      <div class="badge-box">
        <p style="margin: 0 0 6px; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.08em; color: #718096;">Updated School Code</p>
        <div>
          <span class="old-code">CYN24</span>
          <span style="font-size: 20px; color: #718096; margin: 0 6px;">&rarr;</span>
          <span class="new-code">CYN25</span>
        </div>
      </div>
      
      <p><strong>Reason for Update:</strong><br>
      Two separate registrations were submitted for Amity International School, Sector-43 with minor variations in the typed school name, generating separate codes (<code>CYN24</code> and <code>CYN25</code>). To prevent any conflicts during scoring, preliminary rounds, and symposium day logistics, we have unified all Amity Sector-43 teams under a single official school code: <strong>CYN25</strong>.</p>
      
      <table class="info-table">
        <tr>
          <td>School:</td>
          <td><strong>Amity International School, Sector 43, Gurugram</strong></td>
        </tr>
        <tr>
          <td>Official School Code:</td>
          <td><strong style="color: #d24500; font-size: 16px;">CYN25</strong></td>
        </tr>
        <tr>
          <td>Teacher In-charges:</td>
          <td>
            &bull; Mr. Naveen Kumar (Wireframe)<br>
            &bull; Ms. Jeevan Jyoti (Unscripted)
          </td>
        </tr>
        <tr>
          <td>Events Participating:</td>
          <td>Wireframe (UI/UX Design), Unscripted (Movie Making)</td>
        </tr>
      </table>

      <p><strong>What you need to do:</strong></p>
      <ul>
        <li>Please use <strong>CYN25</strong> as your school code for all competition entries, Google Meet sessions, preliminary quizzes, and submissions.</li>
        <li>No other details or participant information have been altered. Both teams are fully registered and active.</li>
      </ul>

      <p>If you have any questions or require any assistance, please reach out to us directly at <a href="mailto:bhavesh.rout50@gmail.com" style="color: #d24500; font-weight: 600;">bhavesh.rout50@gmail.com</a>.</p>

      <p style="margin-top: 24px;">Best regards,<br>
      <strong>Team Cyfernode</strong><br>
      Summer Fields School, Kailash Colony</p>
    </div>
    <div class="footer">
      Cyfernode 5.0 &bull; Summer Fields School &bull; Support: bhavesh.rout50@gmail.com
    </div>
  </div>
</body>
</html>
`

async function main() {
  const recipients = [
    { email: 'nkumar@aisg43.amity.edu.in', name: 'Mr. Naveen Kumar' },
  ]

  console.log('Sending notification email to:', recipients)
  await sendEmail({
    to: recipients,
    subject: emailSubject,
    htmlContent: emailHtml,
  })
}

main().catch((err) => {
  console.error('Error running script:', err)
})
