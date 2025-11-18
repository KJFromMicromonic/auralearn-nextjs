import { createClient } from '@supabase/supabase-js';
import { getEnvVar } from './utils';

// Get Supabase URL - prioritize NEXT_PUBLIC_ for Next.js
function getSupabaseUrl(): string {
  // Try NEXT_PUBLIC_ first (Next.js standard)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  // Fallback to VITE_ for compatibility
  if (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) {
    return process.env.VITE_SUPABASE_URL;
  }
  // Use getEnvVar as last resort
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', '') || getEnvVar('VITE_SUPABASE_URL', '');
  if (url) return url;
  return 'https://placeholder.supabase.co';
}

// Get Supabase Anon Key - prioritize NEXT_PUBLIC_ for Next.js
function getSupabaseAnonKey(): string {
  // Try NEXT_PUBLIC_ first (Next.js standard)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  // Fallback to VITE_ for compatibility
  if (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) {
    return process.env.VITE_SUPABASE_ANON_KEY;
  }
  // Use getEnvVar as last resort
  const key = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', '') || getEnvVar('VITE_SUPABASE_ANON_KEY', '');
  if (key) return key;
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Log configuration in browser
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase Anon Client Configuration:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length || 0,
    isPlaceholder: supabaseUrl.includes('placeholder'),
  });
  
  if (supabaseUrl.includes('placeholder')) {
    console.error('❌ CRITICAL: Supabase Anon client is using placeholder URL!');
    console.error('⚠️ Restart the Next.js dev server after updating .env file!');
  }
}

/**
 * Anonymous Supabase client for unauthenticated operations
 * This client is specifically configured for student assessment submissions
 * where students are not logged in users.
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-anon-client',
    },
  },
});

/**
 * Use this client for:
 * - Student assessment submissions (unauthenticated)
 * - Public data access
 * - Any operation that should work without authentication
 */
