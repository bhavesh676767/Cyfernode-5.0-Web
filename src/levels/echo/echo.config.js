import { echoHints } from './echo.hints.js'

/** @type {import('./echo.types.js').EchoConfig} */
export const echoConfig = {
  id: 'ECHO',
  levelId: 'echo',
  title: 'ECHO',

  intro: [
    'Some things disappear',
    'when you hear them once.',
    'Listen again.',
  ],

  audio: {
    src: '/echo/audio/ECHO_02.wav',
    channels: ['stereo', 'left', 'right'],
  },

  transcript: {
    enabled: true,
    text: '[Audio unavailable]\n\nNothing to transcribe.',
    lastDetectedWord: '\u2014',
    inspectionLabel: 'ECHO_02.wav',
  },

  extraction: {
    // Intermediate word players may discover; not accepted as final answer.
    intermediate: 'REPEAT',
    // Populate from the authoritative recording + right-channel whispers.
    positions: [],
    changedWordIndices: [],
  },

  environment: {
    // Must match the actual recording. Example: ['CLOCK', 'RAIN', 'DOOR', 'FOOTSTEPS', 'CLOCK']
    sequence: [],
  },

  final: {
    validationId: 'echo-final',
  },

  nextLevelPath: '/prompts/clue-less-prompt/mirror',

  playbackSpeeds: [0.5, 0.75, 1, 1.25, 1.5],

  hints: echoHints,
}
