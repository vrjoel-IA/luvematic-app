import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yrwcxvkjrujbqtdemfth.supabase.co'
const supabaseKey = 'sb_publishable_OXBBHNBcIdNv4BV006NJMw_WpVDiDaK'

export const supabase = createClient(supabaseUrl, supabaseKey)
