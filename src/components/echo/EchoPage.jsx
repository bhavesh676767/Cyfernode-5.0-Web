import { useState } from 'react'
import { echoConfig } from '@/levels/echo/echo.config'
import { useEchoAudio } from '@/levels/echo/useEchoAudio'
import { isEchoComplete, isEchoUnlocked } from '@/lib/hunt/progress'
import { EchoAudioPlayer } from './EchoAudioPlayer'
import { EchoTranscript } from './EchoTranscript'
import { EchoInspectionPanel } from './EchoInspectionPanel'
import { EchoAnswerInput } from './EchoAnswerInput'
import { EchoHints } from './EchoHints'
import { EchoCompletion } from './EchoCompletion'
import styles from './EchoPage.module.css'

export function EchoPage() {
  const [started, setStarted] = useState(false)
  const [inspectOpen, setInspectOpen] = useState(false)
  const [solved, setSolved] = useState(isEchoComplete())

  const audio = useEchoAudio(echoConfig.audio.src)

  if (!isEchoUnlocked()) {
    return (
      <div className={styles.locked}>
        <p>Complete VOID to unlock ECHO.</p>
        <a className={styles.backLink} href="/prompts/clue-less-prompt/">Back to levels</a>
      </div>
    )
  }

  if (solved) {
    return (
      <div className={styles.echoPage}>
        <div className={styles.inner}>
          <EchoCompletion nextLevelPath={echoConfig.nextLevelPath} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.echoPage}>
      <div className={styles.inner}>
        <a className={styles.backLink} href="/prompts/clue-less-prompt/">Back</a>
        <h1 className={styles.title}>{echoConfig.title}</h1>

        {!started ? (
          <>
            <div className={styles.intro}>
              {echoConfig.intro.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <button type="button" className={styles.playCta} onClick={() => setStarted(true)}>
              PLAY ECHO
            </button>
          </>
        ) : (
          <>
            {audio.status === 'missing' && (
              <p className={styles.missing}>
                Audio asset missing. Add `public/echo/audio/ECHO_02.wav` (see `public/echo/README.md`).
              </p>
            )}

            <EchoAudioPlayer audio={audio} config={echoConfig} />

            <div className={styles.section}>
              <EchoTranscript
                transcript={echoConfig.transcript}
                onInspect={() => setInspectOpen(true)}
              />
            </div>

            <div className={styles.section}>
              <EchoAnswerInput
                validationId={echoConfig.final.validationId}
                disabled={audio.status !== 'ready'}
                onSolved={() => setSolved(true)}
              />
            </div>

            <div className={styles.section}>
              <EchoHints hints={echoConfig.hints} />
            </div>
          </>
        )}
      </div>

      {inspectOpen && (
        <EchoInspectionPanel
          label={echoConfig.transcript.inspectionLabel}
          audio={audio}
          config={echoConfig}
          onClose={() => setInspectOpen(false)}
        />
      )}
    </div>
  )
}
