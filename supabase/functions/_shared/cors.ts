const DEFAULT_ORIGINS = [
  'https://cyfernode.com',
  'https://www.cyfernode.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

function isLocalDevOrigin(origin: string) {
  try {
    const { protocol, hostname } = new URL(origin)
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')
  } catch {
    return false
  }
}

export function corsHeaders(req: Request, allowHeaders: string) {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS')
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean) ?? []

  const allowed = new Set([...DEFAULT_ORIGINS, ...envOrigins])
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = allowed.has(origin) || isLocalDevOrigin(origin)
    ? origin
    : 'https://cyfernode.com'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': allowHeaders,
    Vary: 'Origin',
  }
}
