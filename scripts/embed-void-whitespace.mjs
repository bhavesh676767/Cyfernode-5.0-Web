import { encodeWhitespaceMessage, VOID_WHITESPACE_MESSAGE, decodeWhitespaceMessage } from '../public/clue-less/lib/whitespace.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const voidHtmlPath = path.join(root, '../public/prompts/clue-less-prompt/void/index.html')
const wsPayload = encodeWhitespaceMessage(VOID_WHITESPACE_MESSAGE)

const commentBlock = `<!--
You are looking for something.
That's your first mistake.

${wsPayload}

-->
<!-- 01110110 01101111 01101001 01100100 -->`

let html = fs.readFileSync(voidHtmlPath, 'utf8')
html = html.replace(/<!-- WS:BEGIN -->[\s\S]*?<!-- WS:END -->/, `<!-- WS:BEGIN -->\n${commentBlock}\n<!-- WS:END -->`)
fs.writeFileSync(voidHtmlPath, html)

const embedded = decodeWhitespaceMessage(wsPayload)
if (embedded !== VOID_WHITESPACE_MESSAGE) {
  console.error('Whitespace verification failed')
  process.exit(1)
}

console.log('void whitespace block verified:', VOID_WHITESPACE_MESSAGE)
