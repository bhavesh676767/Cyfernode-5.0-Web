import { buildParticipantEmail, buildTeacherEmail } from '../supabase/functions/register/emails.ts'

const apiKey = process.env.BREVO_API_KEY
if (!apiKey) throw new Error('Missing BREVO_API_KEY')

async function send(to, subject, html) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Cyfernode', email: 'hello@cyfernode.com' },
      to: [{ email: to.email, name: to.name }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  console.log(`Sent: ${to.email}`)
}

const teacher = { name: 'Ms Shalini Kapoor', phone: '+91 98765 43210', email: '888akabhavesh@gmail.com' }
const participant = { no: 1, name: 'Bhavesh Rout', email: 'bhavesh.rout50@gmail.com', phone: '+91 91234 56789', grade: '11th' }
const event = {
  eventId: 'wireframe', eventName: 'Wireframe', eventCategory: 'UI/UX Design', eventMode: 'Online',
  schoolName: 'Summer Fields School', schoolCode: 'CYN01', teacherIncharge: teacher, participants: [participant],
}
const ctx = {
  registrationId: 'CYFRN5_PREVIEW_002', registrationMode: 'single', schoolCode: 'CYN01',
  schoolName: 'Summer Fields School', teacher, events: [event], isReturningSchool: false,
  priorEventNames: [], siteUrl: 'https://cyfernode.com',
}

const t = buildTeacherEmail(ctx)
await send({ email: '888akabhavesh@gmail.com', name: teacher.name }, t.subject, t.html)
const s = buildParticipantEmail(ctx, event, participant)
await send({ email: 'bhavesh.rout50@gmail.com', name: participant.name }, s.subject, s.html)
