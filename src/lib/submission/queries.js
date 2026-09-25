import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabasePublic'
import { safeFileName } from '@/lib/submission/validation'

const ENDPOINT = `${SUPABASE_URL}/functions/v1/submission-access`
const SESSION_KEY = 'cyfernode-submission-session'
export const SUBMISSION_BUCKET = 'submission-files'

export function readSessionToken() {
  try {
    return sessionStorage.getItem(SESSION_KEY) || ''
  } catch {
    return ''
  }
}

export function writeSessionToken(token) {
  sessionStorage.setItem(SESSION_KEY, token)
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_KEY)
}

async function callSubmission(action, payload = {}, token = readSessionToken()) {
  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'content-type': 'application/json',
        'x-submission-session': token || '',
      },
      body: JSON.stringify({ action, ...payload }),
    })
  } catch {
    throw new Error('The network request failed')
  }

  let body = {}
  try {
    body = await response.json()
  } catch {
    body = {}
  }
  if (!response.ok || body.ok === false) {
    throw new Error(body.error || 'Something went wrong. Please try again.')
  }
  return body
}

export function checkSchool(schoolCode) {
  return callSubmission('check-school', { schoolCode })
}

export function verifyIdentity(schoolCode, email) {
  return callSubmission('verify-identity', { schoolCode, email })
}

export function requestPasskey(schoolCode, email) {
  return callSubmission('request-passkey', { schoolCode, email })
}

export async function verifyPasskey(schoolCode, email, passkey) {
  const result = await callSubmission('verify-passkey', { schoolCode, email, passkey })
  if (result.token) writeSessionToken(result.token)
  return result
}

export function loadSession() {
  if (!readSessionToken()) return Promise.resolve(null)
  return callSubmission('session').catch((error) => {
    clearSessionToken()
    throw error
  })
}

export function signOutSubmission() {
  const token = readSessionToken()
  clearSessionToken()
  if (!token) return Promise.resolve()
  return callSubmission('sign-out', {}, token).catch(() => {})
}

export function openTeam(registrationId) {
  return callSubmission('open-team', { registrationId })
}

export function saveValues(registrationId, values) {
  return callSubmission('save-values', { registrationId, values })
}

export function uploadSubmissionFile({ registrationId, deliverable, file, onProgress }) {
  return callSubmission('sign-upload', {
    registrationId,
    deliverableId: deliverable.id,
    fileName: safeFileName(file.name),
    fileSize: file.size,
  }).then((signed) => new Promise((resolve, reject) => {
    const endpoint = `${SUPABASE_URL}/storage/v1/object/upload/sign/${SUBMISSION_BUCKET}/${signed.path.split('/').map(encodeURIComponent).join('/')}?token=${encodeURIComponent(signed.token)}`
    const request = new XMLHttpRequest()
    request.open('PUT', endpoint)
    request.setRequestHeader('cache-control', '3600')
    if (file.type) request.setRequestHeader('content-type', file.type)
    request.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100)
        resolve(signed)
        return
      }
      reject(new Error('The file could not be uploaded.'))
    }
    request.onerror = () => reject(new Error('The network request failed'))
    request.send(file)
  })).then((signed) => callSubmission('record-file', {
    registrationId,
    deliverableId: deliverable.id,
    filePath: signed.path,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  }))
}

export function removeSubmissionFile(registrationId, deliverableId) {
  return callSubmission('remove-file', { registrationId, deliverableId })
}

export function finalizeTeam(registrationId) {
  return callSubmission('finalize', { registrationId })
}

export function signedDownload(registrationId, deliverableId) {
  return callSubmission('sign-download', { registrationId, deliverableId })
}
