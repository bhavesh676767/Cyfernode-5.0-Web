export function normalizeSchoolCode(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  const match = /^CYN(\d{1,3})$/.exec(raw)
  if (!match) return null
  const num = Number(match[1])
  if (!Number.isInteger(num) || num < 0 || num > 100) return null
  return `CYN${String(num).padStart(2, '0')}`
}

export function isPasskey(value) {
  return /^\d{4}$/.test(String(value || ''))
}

const PLATFORMS = [
  { label: 'YouTube', test: (host) => host === 'youtu.be' || host.endsWith('youtube.com') },
  { label: 'Google Drive', test: (host) => host === 'drive.google.com' || host === 'docs.google.com' },
  { label: 'Google Slides', test: (host) => host === 'docs.google.com' },
  { label: 'Vimeo', test: (host) => host.endsWith('vimeo.com') },
  { label: 'OneDrive', test: (host) => host.endsWith('1drv.ms') || host.includes('onedrive.') || host.endsWith('sharepoint.com') },
  { label: 'Dropbox', test: (host) => host.endsWith('dropbox.com') || host === 'db.tt' },
  { label: 'Loom', test: (host) => host.endsWith('loom.com') },
  { label: 'Canva', test: (host) => host.endsWith('canva.com') },
  { label: 'Figma', test: (host) => host.endsWith('figma.com') },
  { label: 'Behance', test: (host) => host.endsWith('behance.net') },
  { label: 'Adobe Express', test: (host) => host.endsWith('express.adobe.com') },
  { label: 'Adobe XD', test: (host) => host.includes('adobe.com') && host.includes('xd') },
  { label: 'Penpot', test: (host) => host.endsWith('penpot.app') },
  { label: 'Sketch', test: (host) => host.endsWith('sketch.com') },
  { label: 'GitHub', test: (host) => host === 'github.com' || host.endsWith('.github.io') },
  { label: 'GitHub Pages', test: (host) => host.endsWith('.github.io') },
  { label: 'GitLab', test: (host) => host === 'gitlab.com' },
  { label: 'Bitbucket', test: (host) => host === 'bitbucket.org' },
  { label: 'Vercel', test: (host) => host.endsWith('vercel.app') || host === 'vercel.com' },
  { label: 'Netlify', test: (host) => host.endsWith('netlify.app') || host === 'netlify.com' },
]

export function detectPlatform(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '')
  return PLATFORMS.find((platform) => platform.test(host))?.label || ''
}

export function parsePublicUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return { ok: false, error: 'Enter a link.' }

  let url
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, error: 'Enter a valid link, including https://.' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'Use an http or https link.' }
  }

  if (!url.hostname || !url.hostname.includes('.')) {
    return { ok: false, error: 'Enter a complete website address.' }
  }

  return {
    ok: true,
    href: url.href,
    platform: detectPlatform(url.hostname),
  }
}

export function fileExtension(name) {
  const base = String(name || '').split(/[/\\]/).pop() || ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return ''
  return base.slice(dot + 1).toLowerCase()
}

export function formatBytes(bytes) {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size < 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function safeFileName(name) {
  const base = String(name || 'file').split(/[/\\]/).pop() || 'file'
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return (cleaned || 'file').slice(0, 120)
}

export function validateFile(file, deliverable) {
  if (!file) return { ok: false, error: 'Choose a file.' }

  const allowed = (deliverable?.accepted_file_types || []).map((item) => String(item).toLowerCase())
  const extension = fileExtension(file.name)
  if (allowed.length && !allowed.includes(extension)) {
    return { ok: false, error: `Use one of these types: ${allowed.join(', ')}.` }
  }

  const max = Number(deliverable?.max_file_size_mb)
  if (max && file.size > max * 1024 * 1024) {
    return { ok: false, error: `This file is over the ${max} MB limit.` }
  }

  return { ok: true, extension }
}

export function countWords(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

export function validatePlainTextWords(text, maxWords) {
  if (!maxWords) return { ok: true, count: countWords(text) }
  const count = countWords(text)
  if (count > maxWords) {
    return { ok: false, count, error: `This text file is ${count} words. The maximum is ${maxWords}.` }
  }
  return { ok: true, count }
}

export function deliverableIsComplete(deliverable, entry) {
  if (!entry) return false
  if (deliverable.type === 'file') return Boolean(entry.file_path)
  return Boolean(String(entry.value || '').trim())
}

export function validateDeliverableEntry(deliverable, entry) {
  const required = Boolean(deliverable.required)
  const complete = deliverableIsComplete(deliverable, entry)

  if (!complete) {
    return required
      ? { ok: false, error: `${deliverable.name} is required.` }
      : { ok: true }
  }

  if (deliverable.type === 'url') {
    return parsePublicUrl(entry.value)
  }

  if (deliverable.type === 'text') {
    return { ok: true }
  }

  return { ok: true }
}
