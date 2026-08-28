# ECHO E2E tests

Playwright (or similar) is not configured in this repo yet.

When added, cover:

- level loads at `/prompts/clue-less-prompt/echo`
- PLAY ECHO reveals player
- audio loads from `/echo/audio/ECHO_02.wav`
- left/right channel switching
- waveform seek
- transcript + em dash opens inspection panel
- REPEAT rejected with "That's not the end."
- final answer submitted via `hunt-submit`
- completion persists after refresh
- MIRROR unlocks on level hub

Run manually until e2e harness exists.
