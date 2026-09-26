import fs from 'fs';
import path from 'path';

function generateMorseWav(morseStr, outputPath) {
  const sampleRate = 44100;
  const frequency = 800; // 800 Hz tone
  const dotDuration = 0.09; // 90ms dot
  const dashDuration = dotDuration * 3; // 270ms dash
  const symbolGap = dotDuration; // gap between dots/dashes
  const letterGap = dotDuration * 3; // gap between letters

  const samples = [];

  function addTone(duration) {
    const numSamples = Math.floor(sampleRate * duration);
    for (let i = 0; i < numSamples; i++) {
      // Smooth attack and release envelope to prevent clicking
      const t = i / sampleRate;
      let env = 1.0;
      const attackSamples = Math.min(Math.floor(sampleRate * 0.005), numSamples / 2);
      if (i < attackSamples) {
        env = i / attackSamples;
      } else if (i > numSamples - attackSamples) {
        env = (numSamples - i) / attackSamples;
      }
      const val = Math.sin(2 * Math.PI * frequency * t) * 0.7 * env;
      samples.push(val);
    }
  }

  function addSilence(duration) {
    const numSamples = Math.floor(sampleRate * duration);
    for (let i = 0; i < numSamples; i++) {
      samples.push(0);
    }
  }

  // Initial silence
  addSilence(0.5);

  const letters = morseStr.split(' ');
  for (let l = 0; l < letters.length; l++) {
    const letter = letters[l];
    for (let s = 0; s < letter.length; s++) {
      const sym = letter[s];
      if (sym === '.') {
        addTone(dotDuration);
      } else if (sym === '-') {
        addTone(dashDuration);
      }
      if (s < letter.length - 1) {
        addSilence(symbolGap);
      }
    }
    if (l < letters.length - 1) {
      addSilence(letterGap);
    }
  }

  // Ending silence
  addSilence(0.5);

  // Write WAV Header and PCM data
  const dataSize = samples.length * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(int16), offset);
    offset += 2;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated Morse audio at: ${outputPath} (${samples.length} samples, ${(samples.length / sampleRate).toFixed(2)}s)`);
}

const morse = "-.-. .-.. ..-. .-. .--- . .--. .-";
generateMorseWav(morse, './public/assets/whistle-morse.wav');
generateMorseWav(morse, './public/assets/whistle-morse.mp3');
