import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Button } from '@/components/ui/Button'
import { Footer } from '@/components/layout/Footer'
import styles from './Register.module.css'

export function Register() {
  const [submitted, setSubmitted] = useState(false)

  useDocumentTitle('Register')

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className={styles.page}>
      <main className={styles.register}>
        <Link to="/" className={styles.backLink}>
          <span aria-hidden="true">←</span> Back
        </Link>
        <div className={styles.topline}>
          <span>[08]</span>
          <span>// REGISTER</span>
        </div>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>THE NEXT IDEA STARTS HERE</p>
          <h1 id="register-title">CYFERNODE</h1>
          <div className={styles.edition} aria-label="Cyfernode 5.0, 2026">
            <span>5.0</span>
            <strong>2026.</strong>
          </div>
          <p className={styles.intro}>A place for curious minds to make something real.</p>
        </header>

        <section className={styles.formSection} aria-labelledby="form-title">
          <div className={styles.formLead}>
            <p className={styles.eyebrow}>GET ON THE LIST</p>
            <h2 id="form-title">YOUR NEXT<br />MOVE.</h2>
            <p>Tell us a little about yourself and we’ll send the important details your way.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formHeader}>
              <span>Registration form</span>
              <span>* Required fields</span>
            </div>
            <div className={styles.fields}>
              <label><span>Full name *</span><input name="name" type="text" autoComplete="name" placeholder="Your name" required /></label>
              <label><span>Email address *</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
              <label><span>School / organisation *</span><input name="organisation" type="text" placeholder="Where you’re from" required /></label>
              <label><span>What brings you here? *</span><select name="interest" defaultValue="" required><option value="" disabled>Select an interest</option><option>Compete</option><option>Learn</option><option>Build</option><option>Explore</option></select></label>
            </div>
            <div className={styles.submitRow}>
              <p>By registering, you agree to receive essential event updates from Cyfernode.</p>
              <Button type="submit">{submitted ? 'Registration received' : 'Register now'} <span aria-hidden="true">↗</span></Button>
            </div>
            {submitted && <p className={styles.success} role="status">Thanks — we’ll be in touch with your next steps.</p>}
          </form>
        </section>
      </main>
      <Footer />
    </div>
  )
}
