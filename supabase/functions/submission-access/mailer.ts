import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export type SendResult = {
  ok: boolean
  messageId?: string
  error?: string
  provider: 'brevo' | 'resend' | 'none'
}

function getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno?.env?.get) {
    return Deno.env.get(key)
  }
  return undefined
}

/**
 * Send email via Brevo API (v3/smtp/email)
 */
async function sendViaBrevo(
  to: { email: string; name?: string },
  subject: string,
  html: string,
  apiKey: string,
  senderEmail: string,
  senderName: string,
): Promise<SendResult> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to.email, name: to.name || to.email }],
        subject,
        htmlContent: html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`Brevo email failed [HTTP ${res.status}]:`, errText)
      return { ok: false, error: `Brevo error [${res.status}]: ${errText}`, provider: 'brevo' }
    }

    const data = await res.json().catch(() => ({}))
    const messageId = String(data?.messageId || '')
    return { ok: true, messageId: messageId || undefined, provider: 'brevo' }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('Brevo network exception:', errorMsg)
    return { ok: false, error: `Brevo network error: ${errorMsg}`, provider: 'brevo' }
  }
}

/**
 * Send email via Resend API (/emails)
 */
async function sendViaResend(
  to: { email: string; name?: string },
  subject: string,
  html: string,
  apiKey: string,
  fromEmail: string,
  senderName: string,
): Promise<SendResult> {
  try {
    const from = senderName ? `${senderName} <${fromEmail}>` : fromEmail
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to.email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`Resend email failed [HTTP ${res.status}]:`, errText)
      return { ok: false, error: `Resend error [${res.status}]: ${errText}`, provider: 'resend' }
    }

    const data = await res.json().catch(() => ({}))
    const messageId = String(data?.id || '')
    return { ok: true, messageId: messageId || undefined, provider: 'resend' }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('Resend network exception:', errorMsg)
    return { ok: false, error: `Resend network error: ${errorMsg}`, provider: 'resend' }
  }
}

/**
 * Dispatch an email using the configured provider (Brevo preferred if configured, else Resend).
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: { email: string; name?: string }
  subject: string
  html: string
}): Promise<SendResult> {
  const brevoKey = getEnv('BREVO_API_KEY')
  const brevoSenderEmail = getEnv('BREVO_SENDER_EMAIL')
  const brevoSenderName = getEnv('BREVO_SENDER_NAME') || 'Cyfernode'

  // If Brevo is configured, use it first
  if (brevoKey && brevoSenderEmail) {
    return sendViaBrevo(to, subject, html, brevoKey, brevoSenderEmail, brevoSenderName)
  }

  // Otherwise check Resend
  const resendKey = getEnv('RESEND_API_KEY')
  const resendFrom = getEnv('RESEND_SENDER_EMAIL') || getEnv('RESEND_FROM') || 'onboarding@resend.dev'
  const resendSenderName = getEnv('RESEND_SENDER_NAME') || 'Cyfernode'

  if (resendKey) {
    return sendViaResend(to, subject, html, resendKey, resendFrom, resendSenderName)
  }

  const warnMsg = 'No email credentials found. Configure BREVO_API_KEY + BREVO_SENDER_EMAIL or RESEND_API_KEY.'
  console.warn(warnMsg)
  return { ok: false, error: warnMsg, provider: 'none' }
}

export type LogAndSendParams = {
  admin: ReturnType<typeof createClient>
  emailType: 'passkey' | 'submission_teacher' | 'submission_student'
  recipient: string
  recipientName?: string
  recipientType?: 'teacher_in_charge' | 'team_student' | 'participant'
  submissionId?: string | null
  eventRegistrationId?: string | null
  subject: string
  htmlContent: string
  metadata?: Record<string, unknown>
}

/**
 * Log to email_notifications (status: pending), send email via provider,
 * and update the notification row with status: sent or failed.
 * Guaranteed never to throw an unhandled error so it won't rollback or break submissions.
 */
export async function logAndSendEmail(params: LogAndSendParams): Promise<SendResult> {
  const {
    admin,
    emailType,
    recipient,
    recipientName = '',
    recipientType,
    submissionId = null,
    eventRegistrationId = null,
    subject,
    htmlContent,
    metadata = {},
  } = params

  let emailNotifId: string | null = null
  let submissionNotifId: string | null = null

  // 1. Attempt to insert into email_notifications (from SUPABASE_EMAIL_SYSTEM.sql)
  try {
    const { data, error } = await admin
      .from('email_notifications')
      .insert({
        email_type: emailType,
        recipient,
        recipient_name: recipientName,
        recipient_type: recipientType,
        submission_id: submissionId,
        event_registration_id: eventRegistrationId,
        subject,
        status: 'pending',
        metadata,
      })
      .select('id')
      .maybeSingle()

    if (!error && data?.id) {
      emailNotifId = data.id
    } else if (error) {
      console.warn('Note: Could not insert into email_notifications (table may not be created yet):', error.message)
    }
  } catch (err) {
    console.warn('email_notifications insert warning:', err)
  }

  // 2. Also keep submission_notifications table populated if submissionId is provided (from SUPABASE_SETUP.sql)
  if (submissionId) {
    try {
      const { data: subNotif, error: subErr } = await admin
        .from('submission_notifications')
        .insert({
          submission_id: submissionId,
          recipient_email: recipient,
          recipient_name: recipientName,
          recipient_type: recipientType === 'teacher_in_charge' ? 'teacher_in_charge' : 'team_student',
          notification_type: 'submission_finalized',
          status: 'pending',
        })
        .select('id')
        .maybeSingle()

      if (!subErr && subNotif?.id) {
        submissionNotifId = subNotif.id
      }
    } catch {
      // Ignored if table doesn't exist
    }
  }

  // 3. Send email through Brevo / Resend
  const sendResult = await sendEmail({
    to: { email: recipient, name: recipientName },
    subject,
    html: htmlContent,
  })

  // 4. Update logs with final status
  const nowIso = new Date().toISOString()
  if (emailNotifId) {
    try {
      await admin
        .from('email_notifications')
        .update({
          status: sendResult.ok ? 'sent' : 'failed',
          provider_message_id: sendResult.messageId || null,
          error_message: sendResult.ok ? null : (sendResult.error || 'Failed to send email'),
          sent_at: sendResult.ok ? nowIso : null,
          updated_at: nowIso,
        })
        .eq('id', emailNotifId)
    } catch (updateErr) {
      console.error('Failed to update email_notifications log:', updateErr)
    }
  }

  if (submissionNotifId) {
    try {
      await admin
        .from('submission_notifications')
        .update({
          status: sendResult.ok ? 'sent' : 'failed',
          provider_message_id: sendResult.messageId || null,
          error_message: sendResult.ok ? null : (sendResult.error || 'Failed to send email'),
          sent_at: sendResult.ok ? nowIso : null,
        })
        .eq('id', submissionNotifId)
    } catch {
      // Ignored
    }
  }

  return sendResult
}
