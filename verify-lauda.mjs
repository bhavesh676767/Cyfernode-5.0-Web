function vigenereDecrypt(ciphertext, key) {
  let res = '';
  const cleanKey = key.toLowerCase();
  for (let i = 0; i < ciphertext.length; i++) {
    const c = ciphertext[i].toLowerCase().charCodeAt(0) - 97;
    const k = cleanKey[i % cleanKey.length].charCodeAt(0) - 97;
    const p = (c - k + 26) % 26;
    res += String.fromCharCode(p + 97);
  }
  return res;
}

function affineDecrypt(ciphertext, a = 5, b = 8) {
  // a = 5, gcd(5, 26) = 1.
  // Multiplicative inverse of 5 mod 26: 5 * 21 = 105 = 4*26 + 1 => a_inv = 21.
  const a_inv = 21;
  let res = '';
  for (let i = 0; i < ciphertext.length; i++) {
    const y = ciphertext[i].toLowerCase().charCodeAt(0) - 97;
    const x = (a_inv * (y - b + 26)) % 26;
    res += String.fromCharCode(x + 97);
  }
  return res;
}

const cipher = "iwkzzzutlziwxlaimdkvciyfzfd";
const key = "goldenmile";
const intermediate = vigenereDecrypt(cipher, key);
console.log("Vigenere Decrypt:", intermediate);
console.log("Expected intermediate:", "cizwvmilavcimiwvavzrwuncvsr");
console.log("Match:", intermediate === "cizwvmilavcimiwvavzrwuncvsr");

const plaintext = affineDecrypt(intermediate, 5, 8);
console.log("Affine Decrypt:", plaintext);
console.log("Expected plaintext:", "eatingaloneagainonthisbench");
console.log("Match:", plaintext === "eatingaloneagainonthisbench");
