import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type RateLimitResult = { allowed: boolean; failedClosed?: boolean }

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  ipHash: string,
  windowMs: number,
  max: number,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs).toISOString()
  const { count, error } = await supabase
    .from('registration_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', `${bucket}:${ipHash}`)
    .gte('attempted_at', windowStart)

  if (error) {
    console.error(`rate limit query failed (${bucket}):`, error)
    return { allowed: false, failedClosed: true }
  }

  return { allowed: (count ?? 0) < max }
}

export async function recordRateLimitAttempt(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  ipHash: string,
) {
  await supabase.from('registration_rate_limits').insert({ ip_hash: `${bucket}:${ipHash}` })
}
