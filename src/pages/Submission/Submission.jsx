import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { friendlyError } from '@/lib/submission/errors'
import { Preloader } from '@/components/Preloader'
import {
  checkSchool,
  clearSessionToken,
  finalizeTeam,
  loadSession,
  openTeam,
  readSessionToken,
  removeSubmissionFile,
  requestPasskey,
  saveValues,
  signOutSubmission,
  uploadSubmissionFile,
  verifyIdentity,
  verifyPasskey,
} from '@/lib/submission/queries'
import { formatSubmissionCountdown, isSubmissionOpen } from '@/lib/submission/schedule'
import { isPasskey, normalizeSchoolCode, parsePublicUrl, deliverableIsComplete, validateDeliverableEntry } from '@/lib/submission/validation'
import { DeliverableCard } from './components/DeliverableCard'
import { SubmissionReview } from './components/SubmissionReview'
import { SubmissionSuccess } from './components/SubmissionSuccess'
import styles from './Submission.module.css'

function entriesFromSubmission(submission) {
  const entries = {}
  for (const row of submission?.submission_deliverables || []) {
    entries[row.deliverable_id] = row
  }
  return entries
}

function roleLabel(role) {
  return role === 'teacher_in_charge' ? 'Teacher In-Charge' : 'Student'
}

function formatWhen(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

function statusLabel(status) {
  if (!status || status === 'not_submitted' || status === 'draft') return 'Not Submitted'
  if (status === 'submitted') return 'Submitted'
  return status.replaceAll('_', ' ')
}

export function Submission() {
  useDocumentTitle('Submission')
  const confirmRef = useRef(null)
  const submittingRef = useRef(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [phase, setPhase] = useState('boot')
  const [step, setStep] = useState('details')
  const [schoolCode, setSchoolCode] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [email, setEmail] = useState('')
  const [passkey, setPasskey] = useState('')
  const [verifiedIdentity, setVerifiedIdentity] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const [verifyingSuccess, setVerifyingSuccess] = useState(false)
  const [profile, setProfile] = useState(null)
  const [groups, setGroups] = useState([])
  const [opened, setOpened] = useState(null)
  const [entries, setEntries] = useState({})
  const [errors, setErrors] = useState({})
  const [progress, setProgress] = useState({})
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')
  const [view, setView] = useState('form')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const submissionOpen = isSubmissionOpen(now)

  const event = opened?.event || null
  const submission = opened?.submission || null
  const locked = submission && submission.status !== 'draft'
  const deliverables = useMemo(() => event?.event_deliverables || [], [event])
  const requiredDeliverables = deliverables.filter((item) => item.required)
  const readyCount = requiredDeliverables.filter((item) => deliverableIsComplete(item, entries[item.id])).length

  function applyDashboard(result) {
    setProfile(result.profile)
    setGroups(result.groups || [])
    setPhase('dashboard')
    setOpened(null)
    setPageError('')
  }

  useEffect(() => {
    if (submissionOpen) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [submissionOpen])

  useEffect(() => {
    if (!submissionOpen) return undefined
    let active = true
    if (!readSessionToken()) {
      setPhase('verify')
      return undefined
    }
    loadSession()
      .then((result) => {
        if (!active || !result) return
        applyDashboard(result)
      })
      .catch((error) => {
        if (!active) return
        clearSessionToken()
        setPhase('verify')
        setPageError(friendlyError(error))
      })
    return () => {
      active = false
    }
  }, [submissionOpen])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function submitDetails(formEvent) {
    formEvent.preventDefault()
    setPageError('')
    setNotice('')
    const code = normalizeSchoolCode(schoolCode)
    if (!code) {
      setPageError('Enter a school code from CYN00 to CYN100.')
      return
    }
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setPageError('Enter the registered email address used on CyferNode.')
      return
    }

    setBusy(true)
    try {
      const result = await verifyIdentity(code, cleanEmail)
      setSchoolCode(result.schoolCode)
      setSchoolName(result.schoolName)
      setVerifiedIdentity(result)
      setStep('verified_send')
      setNotice('')
    } catch (error) {
      setVerifiedIdentity(null)
      setPageError(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleSendPasskey() {
    setPageError('')
    setNotice('')
    setBusy(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const result = await requestPasskey(schoolCode, cleanEmail)
      setPasskey('')
      setStep('passkey')
      setCooldown(result.cooldownSeconds || 60)
      setNotice(`Passkey sent to ${cleanEmail}. Check your inbox.`)
    } catch (error) {
      setPageError(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  async function submitPasskey(formEvent) {
    formEvent.preventDefault()
    setPageError('')
    if (!isPasskey(passkey)) {
      setPageError('Enter the 4-digit passkey from the email.')
      return
    }
    setBusy(true)
    try {
      const result = await verifyPasskey(schoolCode, email.trim().toLowerCase(), passkey)
      setVerifyingSuccess(true)
      setNotice('Verified → Continue to Submission Dashboard')
      setTimeout(() => {
        setPasskey('')
        setNotice('')
        setVerifyingSuccess(false)
        applyDashboard(result)
        setSearchParams({})
      }, 350)
    } catch (error) {
      setVerifyingSuccess(false)
      setPageError(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  async function openRegistration(registrationId, slug) {
    setBusy(true)
    setPageError('')
    setNotice('')
    setErrors({})
    try {
      const result = await openTeam(registrationId)
      if (result.closed) {
        setPageError(result.message || 'Submission is not open for this event yet.')
        return
      }
      setOpened(result)
      setEntries(entriesFromSubmission(result.submission))
      setView(result.submission?.status === 'draft' ? 'form' : 'success')
      setPhase('workspace')
      setSearchParams({ event: slug })
    } catch (error) {
      setPageError(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  function updateEntry(deliverableId, patch) {
    setEntries((current) => ({
      ...current,
      [deliverableId]: { ...current[deliverableId], deliverable_id: deliverableId, ...patch },
    }))
  }

  async function persistTextLike(deliverable, value) {
    if (deliverable.type === 'url' && value.trim()) {
      const parsed = parsePublicUrl(value)
      if (!parsed.ok) {
        setErrors((current) => ({ ...current, [deliverable.id]: parsed.error }))
        return false
      }
    }
    return true
  }

  async function saveDraft() {
    setBusy(true)
    setPageError('')
    setNotice('')
    try {
      const values = []
      for (const deliverable of deliverables) {
        if (deliverable.type === 'file') continue
        const value = entries[deliverable.id]?.value || ''
        const ok = await persistTextLike(deliverable, value)
        if (!ok) {
          setPageError('Fix the highlighted links before saving.')
          return
        }
        values.push({ deliverableId: deliverable.id, value })
      }
      await saveValues(opened.team.registrationId, values)
      setNotice('Draft saved. You can come back and finish it later.')
    } catch (error) {
      setPageError(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(deliverable, file) {
    setErrors((current) => ({ ...current, [deliverable.id]: '' }))
    setProgress((current) => ({ ...current, [deliverable.id]: 0 }))
    try {
      const saved = await uploadSubmissionFile({
        registrationId: opened.team.registrationId,
        deliverable,
        file,
        onProgress: (value) => setProgress((current) => ({ ...current, [deliverable.id]: value })),
      })
      setEntries((current) => ({ ...current, [deliverable.id]: saved.deliverable }))
    } catch (error) {
      setErrors((current) => ({ ...current, [deliverable.id]: friendlyError(error) }))
    } finally {
      setProgress((current) => ({ ...current, [deliverable.id]: undefined }))
    }
  }

  async function handleRemove(deliverable) {
    setBusy(true)
    try {
      await removeSubmissionFile(opened.team.registrationId, deliverable.id)
      setEntries((current) => {
        const next = { ...current }
        delete next[deliverable.id]
        return next
      })
    } catch (error) {
      setErrors((current) => ({ ...current, [deliverable.id]: friendlyError(error) }))
    } finally {
      setBusy(false)
    }
  }

  function review() {
    const nextErrors = {}
    for (const deliverable of deliverables) {
      const result = validateDeliverableEntry(deliverable, entries[deliverable.id])
      if (!result.ok) nextErrors[deliverable.id] = result.error
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setPageError('Complete the required items before review.')
      setView('form')
      return
    }
    setPageError('')
    setView('review')
  }

  async function confirmSubmit() {
    if (busy || submittingRef.current) return
    submittingRef.current = true
    setBusy(true)
    setPageError('')
    try {
      for (const deliverable of deliverables) {
        if (deliverable.type === 'file') continue
        const ok = await persistTextLike(deliverable, entries[deliverable.id]?.value || '')
        if (!ok) throw new Error('Enter a valid http or https link')
      }
      const values = deliverables
        .filter((deliverable) => deliverable.type !== 'file')
        .map((deliverable) => ({ deliverableId: deliverable.id, value: entries[deliverable.id]?.value || '' }))
      await saveValues(opened.team.registrationId, values)
      const finalized = await finalizeTeam(opened.team.registrationId)
      setOpened((current) => ({
        ...current,
        submission: { ...current.submission, ...finalized.submission, status: 'submitted' },
      }))
      confirmRef.current?.close()
      setView('success')
    } catch (error) {
      setPageError(friendlyError(error))
      confirmRef.current?.close()
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  async function signOut() {
    await signOutSubmission()
    setProfile(null)
    setGroups([])
    setOpened(null)
    setStep('details')
    setSchoolCode('')
    setEmail('')
    setPasskey('')
    setVerifiedIdentity(null)
    setNotice('')
    setPhase('verify')
    setSearchParams({})
  }

  function backToDashboard() {
    setOpened(null)
    setPhase('dashboard')
    setView('form')
    setSearchParams({})
    if (readSessionToken()) {
      loadSession().then(applyDashboard).catch(() => {})
    }
  }

  const selectedGroup = groups.find((group) => group.slug === searchParams.get('event'))
  const showTeamPicker = phase === 'dashboard' && profile?.role === 'teacher_in_charge' && selectedGroup

  if (!submissionOpen) {
    return (
      <div className={styles.page}>
        <Link className={styles.back} to="/" aria-label="Back to homepage">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </Link>
        <main className={styles.main}>
          <p className={styles.kicker}>Cyfernode 5.0</p>
          <h1>Submission</h1>
          <p className={styles.lede}>Opens 1 October 2026 at 12:00 am IST.</p>
          <p className={styles.countdown} aria-live="polite">{formatSubmissionCountdown(now)}</p>
        </main>
      </div>
    )
  }

  if (phase === 'boot') {
    return <Preloader loading={true} />
  }

  return (
    <div className={styles.page}>
      {phase === 'verify' && step === 'verified_send' ? (
        <button
          className={styles.back}
          type="button"
          aria-label="Back to school code and email"
          onClick={() => {
            setStep('details')
            setPageError('')
            setNotice('')
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <Link className={styles.back} to="/" aria-label="Back to homepage">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </Link>
      )}
      <main className={styles.main}>
        <p className={styles.kicker}>Cyfernode 5.0</p>
        <h1>{profile ? `Welcome, ${profile.name}` : 'Submission'}</h1>
        {profile ? (
          <div className={styles.meta}>
            <div>School: {profile.schoolName}</div>
            <div>Role: {roleLabel(profile.role)}</div>
            <div>{profile.email}</div>
            <button className={styles.textButton} type="button" onClick={signOut}>
              Sign out / Change account
            </button>
          </div>
        ) : null}
        {pageError ? <p className={`${styles.banner} ${styles.bannerError}`} role="alert">{pageError}</p> : null}
        {notice ? <p className={`${styles.banner} ${styles.bannerSuccess}`} role="status">{notice}</p> : null}

        {phase === 'verify' && step === 'details' ? (
          <form className={styles.stack} onSubmit={submitDetails}>
            <label className={styles.field}>
              <span className={styles.label}>School Code</span>
              <input
                className={styles.control}
                value={schoolCode}
                placeholder="CYN042"
                autoComplete="off"
                onChange={(inputEvent) => setSchoolCode(inputEvent.target.value.toUpperCase())}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Registered Email</span>
              <input
                className={styles.control}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="student@example.com"
                value={email}
                onChange={(inputEvent) => setEmail(inputEvent.target.value)}
                required
              />
            </label>
            <button className={styles.button} type="submit" disabled={busy}>
              {busy ? 'Verifying…' : 'Continue'}
            </button>
          </form>
        ) : null}

        {phase === 'verify' && step === 'verified_send' && verifiedIdentity ? (
          <div className={styles.stack}>
            <div className={styles.card}>
              <h2>{verifiedIdentity.schoolName}</h2>
              <p className={styles.helper}>{verifiedIdentity.schoolCode}</p>
              <p className={styles.description}>
                {verifiedIdentity.participantName} · {roleLabel(verifiedIdentity.role)}
              </p>
              <p className={styles.helper}>{email}</p>
            </div>
            <button className={styles.button} type="button" onClick={handleSendPasskey} disabled={busy}>
              {busy ? 'Sending…' : 'Send Passkey'}
            </button>
          </div>
        ) : null}

        {phase === 'verify' && step === 'passkey' ? (
          <form className={styles.stack} onSubmit={submitPasskey}>
            <p className={styles.helper}>
              {schoolName} · {schoolCode} · {email}
            </p>
            <label className={styles.field}>
              <span className={styles.label}>Enter your 4-digit passkey</span>
              <input
                className={styles.control}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={4}
                value={passkey}
                autoFocus
                onChange={(inputEvent) => {
                  setPageError('')
                  setPasskey(inputEvent.target.value.replace(/\D/g, '').slice(0, 4))
                }}
              />
            </label>
            <p className={styles.helper}>Enter the 4-digit code sent to your registered inbox.</p>
            <div className={styles.actions}>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                onClick={() => {
                  setNotice('')
                  setStep('details')
                  setPasskey('')
                }}
                disabled={busy}
              >
                Change details
              </button>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                onClick={handleSendPasskey}
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0 ? `Resend Passkey (${cooldown}s)` : 'Resend Passkey'}
              </button>
              <button className={styles.button} type="submit" disabled={busy || passkey.length !== 4}>
                {verifyingSuccess ? 'Verified → Continue to Submission Dashboard' : busy ? 'Checking…' : 'Verify & Continue'}
              </button>
            </div>
          </form>
        ) : null}

        {phase === 'dashboard' && profile && !showTeamPicker ? (
          <section className={styles.stack}>
            <h2>{profile.role === 'teacher_in_charge' ? 'Your school’s events' : 'Your events'}</h2>
            <p className={styles.lede}>
              {profile.role === 'teacher_in_charge'
                ? 'Open an event, pick one team, and submit only for that team.'
                : 'You only see the event and team you registered for.'}
            </p>
            {!groups.length ? <p className={styles.helper}>No registered events were found for this account.</p> : null}
            <div className={styles.teamList}>
              {groups.map((group) => {
                const nonSubmission = group.slug === 'clue-less' || group.slug === 'runtime-terror'
                return (
                <article className={styles.teamCard} key={group.slug}>
                  <div className={styles.cardHeader}>
                    <h3>{group.name}</h3>
                    {!nonSubmission && !group.open ? <span className={styles.pill}>Not open</span> : null}
                  </div>
                  {profile.role === 'teacher_in_charge' ? (
                    <p className={styles.helper}>{group.teamCount} {group.teamCount === 1 ? 'team' : 'teams'} registered</p>
                  ) : (
                    group.teams.map((team) => (
                      <div key={team.registrationId}>
                        <p className={styles.helper}>Team: {team.teamName}</p>
                        {nonSubmission ? null : (
                          <p className={styles.statusLine}>
                            <span className={`${styles.pill} ${team.status === 'submitted' ? styles.pillDone : ''}`}>{statusLabel(team.status)}</span>
                          </p>
                        )}
                        {!nonSubmission && team.status !== 'not_submitted' && team.status !== 'draft' ? (
                          <p className={styles.helper}>Submitted by {team.submittedByName} · {formatWhen(team.submittedAt)}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                  {nonSubmission ? (
                    <p className={styles.helper}>Non submission based event</p>
                  ) : !group.open ? (
                    <p className={styles.helper}>This event does not take a file submission here.</p>
                  ) : null}
                  {nonSubmission ? null : profile.role === 'teacher_in_charge' ? (
                    <button className={styles.button} type="button" disabled={busy || !group.open} onClick={() => setSearchParams({ event: group.slug })}>
                      {group.open ? 'Choose a team' : 'Closed'}
                    </button>
                  ) : (
                    group.teams.map((team) => (
                      <button
                        className={styles.button}
                        type="button"
                        key={team.registrationId}
                        disabled={busy || !group.open}
                        onClick={() => openRegistration(team.registrationId, group.slug)}
                      >
                        {!group.open ? 'Closed' : team.status === 'submitted' ? 'View submission' : 'Continue submission'}
                      </button>
                    ))
                  )}
                </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {showTeamPicker ? (
          <section className={styles.stack}>
            <button className={styles.textButton} type="button" onClick={() => setSearchParams({})}>All events</button>
            <h2>{selectedGroup.name}</h2>
            <p className={styles.lede}>Each team submits on its own. Pick the team, then fill only that team’s deliverables.</p>
            <div className={styles.teamList}>
              {selectedGroup.teams.map((team) => (
                <article className={styles.teamCard} key={team.registrationId}>
                  <h3>Team {String(team.teamNumber || '').padStart(2, '0')}</h3>
                  <p>{team.teamName}</p>
                  <p className={styles.statusLine}>Status: {statusLabel(team.status)}</p>
                  {team.submittedByName ? <p className={styles.helper}>Submitted by: {team.submittedByName}</p> : null}
                  <button
                    className={styles.button}
                    type="button"
                    disabled={busy || !selectedGroup.open}
                    onClick={() => openRegistration(team.registrationId, selectedGroup.slug)}
                  >
                    {!selectedGroup.open ? 'Not open yet' : team.status === 'submitted' ? 'View' : 'Submit'}
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {phase === 'workspace' && opened?.closed ? null : null}

        {phase === 'workspace' && event && locked ? (
          <div className={styles.stack}>
            <SubmissionSuccess
              event={event}
              submission={submission}
              deliverables={deliverables}
              entries={entries}
              onChooseAnother={backToDashboard}
            />
          </div>
        ) : null}

        {phase === 'workspace' && event && !locked && view === 'form' ? (
          <form className={styles.stack} onSubmit={(formEvent) => { formEvent.preventDefault(); review() }}>
            <div className={styles.actions}>
              <button className={styles.textButton} type="button" onClick={backToDashboard}>Back to events</button>
              <p className={styles.helper}>{event.name} · {opened.team.teamName}</p>
            </div>
            <div className={styles.progressLabel}>
              {readyCount} of {requiredDeliverables.length} required items ready
            </div>
            <div className={styles.progress} aria-hidden="true">
              <span style={{ width: `${requiredDeliverables.length ? Math.round((readyCount / requiredDeliverables.length) * 100) : 0}%` }} />
            </div>
            <p className={styles.helper}>Save a draft anytime. Review locks the submission for this team. It can only be sent once.</p>
            {deliverables.map((deliverable) => (
              <DeliverableCard
                key={deliverable.id}
                deliverable={deliverable}
                entry={entries[deliverable.id]}
                error={errors[deliverable.id]}
                progress={progress[deliverable.id]}
                disabled={busy}
                onUrlChange={(value) => updateEntry(deliverable.id, { value })}
                onTextChange={(value) => updateEntry(deliverable.id, { value })}
                onFile={(file) => handleFile(deliverable, file)}
                onRemove={() => handleRemove(deliverable)}
              />
            ))}
            <div className={styles.actions}>
              <button className={`${styles.button} ${styles.buttonSecondary}`} type="button" onClick={saveDraft} disabled={busy}>
                {busy ? 'Saving…' : 'Save draft'}
              </button>
              <button className={styles.button} type="submit" disabled={busy}>Review submission</button>
            </div>
          </form>
        ) : null}

        {phase === 'workspace' && event && !locked && view === 'review' ? (
          <div className={styles.stack}>
            <SubmissionReview
              event={event}
              entries={entries}
              busy={busy}
              onBack={() => setView('form')}
              onConfirm={() => confirmRef.current?.showModal()}
            />
          </div>
        ) : null}
      </main>
      <dialog className={styles.dialog} ref={confirmRef} aria-labelledby="confirm-title">
        <h2 id="confirm-title">Lock this submission?</h2>
        <p>
          Final submit sends {event?.name || 'this event'} for {opened?.team?.teamName || 'this team'} and turns off further edits.
        </p>
        <div className={styles.actions}>
          <button className={`${styles.button} ${styles.buttonSecondary}`} type="button" onClick={() => confirmRef.current?.close()}>
            Keep editing
          </button>
          <button className={styles.button} type="button" onClick={confirmSubmit} disabled={busy}>
            {busy ? 'Submitting…' : 'Final submit'}
          </button>
        </div>
      </dialog>
    </div>
  )
}
