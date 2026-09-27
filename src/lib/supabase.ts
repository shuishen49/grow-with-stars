import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** 调试用：设 VITE_USE_MOCK=1 强制使用本机演示数据 */
export const useMock = import.meta.env.VITE_USE_MOCK === '1'

export const supabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null =
  supabaseConfigured && !useMock ? createClient(url!, key!) : null
