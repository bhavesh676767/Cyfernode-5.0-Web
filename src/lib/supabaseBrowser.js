import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabasePublic'

const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const SUBMISSION_BUCKET = 'submission-files'
