import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const passkeyFile = path.join(root, 'supabase/functions/_shared/schoolPasskeys.ts')

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      walk(full, files)
    } else {
      files.push(full)
    }
  }
  return files
}

describe('school passkeys', () => {
  const source = fs.readFileSync(passkeyFile, 'utf8')
  const pairs = [...source.matchAll(/^\s+(CYN\d+): '(\d{4})',$/gm)]

  it('assigns a unique passkey to every code from CYN00 through CYN100', () => {
    const codes = pairs.map((match) => match[1])
    const keys = pairs.map((match) => match[2])
    expect(codes).toHaveLength(101)
    expect(codes[0]).toBe('CYN00')
    expect(codes.at(-1)).toBe('CYN100')
    expect(new Set(codes).size).toBe(101)
    expect(new Set(keys).size).toBe(101)
  })

  it('does not place passkeys in frontend source', () => {
    const frontendFiles = [
      path.join(root, 'index.html'),
      ...walk(path.join(root, 'src')),
      ...walk(path.join(root, 'public')),
    ]

    for (const file of frontendFiles) {
      const text = fs.readFileSync(file, 'utf8')
      const relative = path.relative(root, file)
      expect(text.includes('SCHOOL_PASSKEYS'), `${relative} contains the passkey map`).toBe(false)
      expect(text.includes('schoolPasskeys'), `${relative} imports school passkeys`).toBe(false)
      for (const [code, key] of pairs) {
        expect(text.includes(`${code}: '${key}'`), `${relative} contains ${code}`).toBe(false)
      }
    }
  })
})
