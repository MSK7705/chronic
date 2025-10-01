import { createClient } from '@supabase/supabase-js'

// Use environment variables with fallback to hardcoded values for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fqgojtuivmqauulhjany.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZ29qdHVpdm1xYXV1bGhqYW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjg2NzgsImV4cCI6MjA3NDkwNDY3OH0.7IrdrdEyVlgz0_cc9NDIL8G7pELdLOZMee4ek1b3B9M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)