import crypto from 'crypto';
import fs from 'fs';

function getYelloveKeyDigits(keyStr = "2010-2023") {
  const digits = keyStr.replace(/\D/g, '').split('').map(Number);
  if (digits.length === 0) throw new Error("Key must contain digits");
  return digits;
}

function getColumnOrder(keyDigits) {
  // Stable sort indices by keyDigit value
  const indexed = keyDigits.map((val, idx) => ({ val, idx }));
  indexed.sort((a, b) => a.val - b.val || a.idx - b.idx);
  return indexed.map(item => item.idx);
}

export function encodeYellove(plaintext, keyStr = "2010-2023") {
  const keyDigits = getYelloveKeyDigits(keyStr);
  const numCols = keyDigits.length;
  
  // Preserve original length metadata or standard padding
  const origLen = plaintext.length;
  const padLen = (numCols - (origLen % numCols)) % numCols;
  const padded = plaintext + 'X'.repeat(padLen);
  const numRows = padded.length / numCols;
  
  // Layer 1: Columnar transposition
  const colOrder = getColumnOrder(keyDigits);
  let stage1 = '';
  for (const col of colOrder) {
    for (let r = 0; r < numRows; r++) {
      stage1 += padded[r * numCols + col];
    }
  }

  // Layer 2: Repeating numeric shift
  let ciphertext = '';
  for (let i = 0; i < stage1.length; i++) {
    const ch = stage1[i];
    const shift = keyDigits[i % numCols];
    
    if (ch >= 'a' && ch <= 'z') {
      const code = ((ch.charCodeAt(0) - 97 + shift) % 26) + 97;
      ciphertext += String.fromCharCode(code);
    } else if (ch >= 'A' && ch <= 'Z') {
      const code = ((ch.charCodeAt(0) - 65 + shift) % 26) + 65;
      ciphertext += String.fromCharCode(code);
    } else {
      ciphertext += ch;
    }
  }

  return {
    origLen,
    stage1,
    ciphertext
  };
}

export function decodeYellove(ciphertext, origLen, keyStr = "2010-2023") {
  const keyDigits = getYelloveKeyDigits(keyStr);
  const numCols = keyDigits.length;
  
  // Reverse Layer 2: Repeating numeric shift
  let stage1 = '';
  for (let i = 0; i < ciphertext.length; i++) {
    const ch = ciphertext[i];
    const shift = keyDigits[i % numCols];
    
    if (ch >= 'a' && ch <= 'z') {
      const code = ((ch.charCodeAt(0) - 97 - shift + 26) % 26) + 97;
      stage1 += String.fromCharCode(code);
    } else if (ch >= 'A' && ch <= 'Z') {
      const code = ((ch.charCodeAt(0) - 65 - shift + 26) % 26) + 65;
      stage1 += String.fromCharCode(code);
    } else {
      stage1 += ch;
    }
  }

  // Reverse Layer 1: Columnar transposition
  const numRows = stage1.length / numCols;
  const colOrder = getColumnOrder(keyDigits);
  
  // Grid of size numRows x numCols
  const grid = Array.from({ length: numRows }, () => Array(numCols).fill(''));
  
  let ptr = 0;
  for (const col of colOrder) {
    for (let r = 0; r < numRows; r++) {
      grid[r][col] = stage1[ptr++];
    }
  }

  let unpadded = '';
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      unpadded += grid[r][c];
    }
  }

  return typeof origLen === 'number' ? unpadded.slice(0, origLen) : unpadded.replace(/X+$/, '');
}

// Morse Code dictionary
const MORSE_CODE = {
  'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.',
  'g': '--.', 'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..',
  'm': '--', 'n': '-.', 'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.',
  's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-',
  'y': '-.--', 'z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.'
};

function textToMorse(text) {
  return text.toLowerCase().split('').map(ch => MORSE_CODE[ch] || '').filter(Boolean).join(' ');
}

// Vault XOR + Base64
function xorEncrypt(text, key = "thala") {
  const textBytes = Buffer.from(text, 'utf-8');
  const keyBytes = Buffer.from(key, 'utf-8');
  const out = Buffer.alloc(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    out[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out.toString('base64');
}

function xorDecrypt(b64, key = "thala") {
  const bytes = Buffer.from(b64, 'base64');
  const keyBytes = Buffer.from(key, 'utf-8');
  const out = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out.toString('utf-8');
}

// Tests
console.log("=== RUNNING TESTS ===");
const testStr = "harleen";
const enc = encodeYellove(testStr);
console.log("Plaintext:", testStr);
console.log("Stage 1:", enc.stage1);
console.log("Ciphertext:", enc.ciphertext);

const dec = decodeYellove(enc.ciphertext, enc.origLen);
console.log("Decoded:", dec);
if (dec !== testStr) {
  throw new Error(`Assertion failed: ${dec} !== ${testStr}`);
}
console.log("✓ Cipher round-trip test PASSED!");

const morse = textToMorse(enc.ciphertext);
console.log("Morse code:", morse);

// Vault test
const vaultJson = JSON.stringify({
  "title": "Yellow Army Encore",
  "quote": "Why so serious? - The Joker",
  "audio": "/assets/whistle-morse.wav",
  "tool": "Yellove Cipher",
  "cipher_key": "2010-2023",
  "unlock_tag": "harleenscore"
}, null, 2);

const encryptedVaultBlob = xorEncrypt(vaultJson, "thala");
const decryptedVault = xorDecrypt(encryptedVaultBlob, "thala");
if (decryptedVault !== vaultJson) {
  throw new Error("Vault XOR test failed");
}
console.log("✓ Vault XOR test PASSED!");
console.log("Vault Encrypted Base64 Blob:\n", encryptedVaultBlob);

const uuid = crypto.randomUUID();
console.log("Generated UUID v4 for /harleenscore:", uuid);
