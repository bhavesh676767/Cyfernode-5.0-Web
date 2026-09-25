import { useState } from 'react'
import styles from '../Submission.module.css'

export function AuthGate({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.')
      return
    }
    setBusy(true)
    try {
      const result = mode === 'signin'
        ? await onSignIn(email.trim(), password)
        : await onSignUp(email.trim(), password)
      if (result?.needsConfirmation) {
        setNotice('Check your email to confirm the account, then sign in.')
      }
    } catch (caught) {
      setError(caught?.message || 'Sign-in failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const emailId = 'submission-email'
  const passwordId = 'submission-password'

  return (
    <section className={styles.panel} aria-labelledby="auth-title">
      <h2 id="auth-title">{mode === 'signin' ? 'Sign in to submit' : 'Create an account'}</h2>
      <p className={styles.lede}>
        Submissions are tied to your account. Sign in with email to save a draft or send a final submission.
      </p>
      <form className={styles.stack} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={emailId}>Email</label>
          <input
            id={emailId}
            className={styles.control}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={passwordId}>Password</label>
          <input
            id={passwordId}
            className={styles.control}
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {notice ? <p className={styles.helper} role="status">{notice}</p> : null}
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button
            className={styles.textButton}
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
              setNotice('')
            }}
          >
            {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
          </button>
        </div>
      </form>
    </section>
  )
}
