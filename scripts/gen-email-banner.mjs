import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input = path.join(root, 'public/assets/emailbanner.jpg')
const output = path.join(root, 'supabase/functions/register/email-banner.ts')
const b = fs.readFileSync(input)
fs.writeFileSync(output, `export const EMAIL_BANNER_SRC = 'data:image/jpeg;base64,${b.toString('base64')}'\n`)
console.log('Wrote', output, 'bytes', b.length)
