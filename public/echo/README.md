# ECHO Level Assets

Level 02 of Clue-Less requires a **single authoritative stereo WAV**. Do not substitute MP3 or synthetic audio generated in code.

## Required file

```
public/echo/audio/ECHO_02.wav
```

## Format requirements

| Property | Requirement |
|----------|-------------|
| Format | WAV (uncompressed) |
| Channels | Stereo (2 distinct channels) |
| Duration | ~60–120 seconds |
| Left channel | Primary narration (repeated sections, subtle word changes) |
| Right channel | Secondary whisper / number layer (`one`, `two`, `three`, …) |
| Repetitions | Multiple narration passes with **different** wording each pass |
| Environment | Background sounds change between repetitions (e.g. clock, rain, door) |
| Ending | Very quiet fragment: “You heard me.” + click |
| Waveform tail | Pulse pattern interpretable as **LOOK BACK** (not labeled in UI) |

## Puzzle data (not in this folder)

Extraction metadata, environmental sequence, and whisper positions live in:

- `src/levels/echo/echo.config.js` (populate `environment.sequence` and `extraction` when the recording is finalized)

## Final answer validation

The final answer is **not** stored in frontend config. Validation runs server-side via:

- `supabase/functions/hunt-submit` with `validationId: "echo-final"`

Set the Supabase secret:

```
HUNT_ECHO_ANSWER=<final answer, uppercase>
```

## Deployment checklist

- [ ] `ECHO_02.wav` present at `public/echo/audio/ECHO_02.wav`
- [ ] Stereo channels verified in a DAW or `ffprobe`
- [ ] `environment.sequence` in config matches the recording
- [ ] `extraction.positions` in config matches right-channel numbers
- [ ] `HUNT_ECHO_ANSWER` secret set in Supabase
- [ ] Level loads at `/prompts/clue-less-prompt/echo`

## Missing asset behavior

If `ECHO_02.wav` is absent, the level UI loads but shows an asset-missing state. The puzzle cannot be solved until the file is supplied.
