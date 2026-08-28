export const VOID_WHITESPACE_MESSAGE = 'THE VOID IS NOT EMPTY'

/** space = 0, tab = 1, 8 bits per ASCII character */
export function encodeWhitespaceMessage(message) {
  let encoded = ''
  for (const char of message) {
    const bits = char.charCodeAt(0).toString(2).padStart(8, '0')
    for (const bit of bits) encoded += bit === '0' ? ' ' : '\t'
  }
  return encoded
}

export function decodeWhitespaceMessage(source) {
  let bits = ''
  for (const char of source) {
    if (char === ' ') bits += '0'
    else if (char === '\t') bits += '1'
  }

  let decoded = ''
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    decoded += String.fromCharCode(parseInt(bits.slice(index, index + 8), 2))
  }
  return decoded
}

export function extractWhitespacePayloadFromHtml(html) {
  const match = html.match(/<!--[\s\S]*?That's your first mistake\.[\s\S]*?\n([\s\t]+)\n[\s\S]*?-->/)
  return match ? match[1] : ''
}
