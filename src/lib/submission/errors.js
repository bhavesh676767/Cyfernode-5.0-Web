export function friendlyError(error) {
  const message = String(error?.message || error || '')
  const code = String(error?.code || '')

  if (/sign in to continue|JWT|session missing|not authenticated/i.test(message)) {
    return 'Sign in to continue.'
  }
  if (/already submitted this event/i.test(message)) {
    return 'This team has already submitted this event.'
  }
  if (/invalid passkey/i.test(message)) {
    return 'Invalid passkey. Please try again.'
  }
  if (/already finalized|submission is locked|cannot be reassigned/i.test(message)) {
    return 'This submission is locked and can no longer be edited.'
  }
  if (/required deliverables are missing/i.test(message)) {
    return 'Add every required item before the final submit.'
  }
  if (/valid http or https|enter a valid link/i.test(message)) {
    return 'Check that every link starts with http:// or https://.'
  }
  if (/file type is not accepted/i.test(message)) {
    return 'One of the files is not an accepted type.'
  }
  if (/larger than the allowed size|payload too large|entity too large/i.test(message)) {
    return 'One of the files is larger than the allowed size.'
  }
  if (/duplicate key|unique constraint|23505/i.test(`${code} ${message}`)) {
    return 'You already have a submission for this event.'
  }
  if (/row-level security|permission denied|42501|not allowed/i.test(message)) {
    return 'You do not have permission to change this submission.'
  }
  if (/could not find the table|schema cache|42P01|does not exist/i.test(message)) {
    return 'Submissions are not available yet. Run SUPABASE_SETUP.sql in the Supabase SQL Editor, then refresh.'
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'The network request failed. Check your connection and try again.'
  }
  if (/not open for submissions|event is not/i.test(message)) {
    return 'This event is not open for submissions.'
  }
  if (/submission not found/i.test(message)) {
    return 'That submission could not be found.'
  }

  if (message && message.length < 240 && !/PGRST|syntax error|service_role/i.test(message)) {
    return message
  }
  if (message) console.error(error)
  return 'Something went wrong. Please try again.'
}
