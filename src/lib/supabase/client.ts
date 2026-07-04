import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wyaaakqcrcktbhcwhgya.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_5SPpj6gV57gGoGj8-bH4Aw_Dam-5p6p'

export function createClient() {
  return createBrowserClient(
    supabaseUrl!,
    supabaseKey!
  )
}
