import { createClient } from '@supabase/supabase-js';

import { getEnvVar } from './utils';

// Supabase configuration
// In Next.js, NEXT_PUBLIC_* vars are available at build time and runtime
// Use a function to get env vars dynamically to ensure they're loaded
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

// Create Supabase client - match Vite.js configuration exactly
// Note: Removed custom fetch handler and credentials - these might be causing CORS issues
// In Next.js, we need to ensure this only runs on client-side
function createSupabaseClient() {
  // Get fresh values each time (in case env vars are loaded after module init)
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  
  // Check if we're on client-side and have valid credentials
  if (typeof window === 'undefined') {
    // Server-side: return a dummy client (shouldn't be used)
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      global: { headers: {} }
    });
  }

  // Debug: Log configuration (only in development, client-side only)
  const actualUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const actualKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('🔧 Supabase Configuration:', {
    'getSupabaseUrl()': url,
    'getSupabaseAnonKey() Length': key?.length || 0,
    'Direct process.env.NEXT_PUBLIC_SUPABASE_URL': actualUrl || 'NOT SET',
    'Direct process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': actualKey ? `${actualKey.substring(0, 20)}...` : 'NOT SET',
    'isPlaceholder': url.includes('placeholder'),
    'All NEXT_PUBLIC_ vars': typeof process !== 'undefined' ? Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')) : [],
  });

  // Client-side: use actual credentials
  if (!url.includes('placeholder') && key && !key.includes('placeholder')) {
    return createClient(url, key, {
      global: {
        headers: {
          // Headers will be set dynamically in AuthContext when Clerk session is available
          // Match original Vite.js configuration
        }
      }
    });
  } else {
    // Invalid credentials - log error with detailed debugging
    console.error('❌ Cannot create Supabase client - using placeholder values');
    console.error('Supabase URL:', url);
    console.error('Supabase Key (first 20 chars):', key?.substring(0, 20));
    console.error('Environment check:', {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : 'N/A (no process)',
      'process.env.VITE_SUPABASE_URL': typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : 'N/A (no process)',
      'process.env keys': typeof process !== 'undefined' ? Object.keys(process.env).filter(k => k.includes('SUPABASE')) : [],
      'window location': typeof window !== 'undefined' ? window.location.href : 'N/A',
    });
    console.error('⚠️ IMPORTANT: Restart the Next.js dev server after adding/updating .env file!');
    console.error('📝 The .env file should be in the auralearn-nextjs/ directory with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      global: { headers: {} }
    });
  }
}

export const supabase = createSupabaseClient();

// Types
export type UserRole = 'teacher' | 'parent' | 'admin';

export type StudentCategory =
  | 'slow_processing'
  | 'fast_processor'
  | 'high_energy'
  | 'visual_learner'
  | 'auditory_learner'
  | 'kinesthetic_learner'
  | 'logical_learner'
  | 'sensitive_low_confidence'
  | 'easily_distracted'
  | 'needs_repetition'
  | 'social_learner'
  | 'independent_learner';

export type ResourceType = 'article' | 'blog' | 'pdf' | 'video' | 'website';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  grade_level?: string;
  subject?: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  name: string;
  primary_category?: StudentCategory;
  secondary_category?: StudentCategory;
  created_at: string;
  updated_at: string;
}

export interface InternetResource {
  id: string;
  student_category: StudentCategory;
  curriculum_topic: string;
  title: string;
  url: string;
  snippet?: string;
  resource_type: ResourceType;
  source?: string;
  relevance_score?: number;
  created_at: string;
  updated_at: string;
}

export interface YoutubeTranscript {
  id: string;
  video_url: string;
  video_id: string;
  title?: string;
  transcript_text: string;
  student_category?: StudentCategory;
  curriculum_topic?: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface TeachingGuide {
  id: string;
  class_id: string;
  student_category: StudentCategory;
  curriculum_topic: string;
  audience: 'teacher' | 'parent';
  summary: string;
  strategies: Strategy[];
  activities: Activity[];
  resources: ResourceLink[];
  lesson_plan?: string;
  home_support_checklist?: ChecklistItem[];
  generated_at: string;
  expires_at?: string;
}

export interface Strategy {
  title: string;
  description: string;
  why_it_works: string;
}

export interface Activity {
  name: string;
  duration: string;
  materials: string[];
  steps: string[];
  differentiation?: string;
}

export interface ResourceLink {
  title: string;
  url: string;
  type: ResourceType;
  description?: string;
}

export interface ChecklistItem {
  task: string;
  frequency: string;
  tips: string[];
}

// Helper function to map category enum to display name
export const categoryDisplayNames: Record<StudentCategory, string> = {
  slow_processing: 'Slow Processing',
  fast_processor: 'Fast Processor',
  high_energy: 'High Energy / Needs Movement',
  visual_learner: 'Visual Learner',
  auditory_learner: 'Auditory Learner',
  kinesthetic_learner: 'Kinesthetic Learner',
  logical_learner: 'Logical Learner',
  sensitive_low_confidence: 'Sensitive / Low Confidence',
  easily_distracted: 'Easily Distracted',
  needs_repetition: 'Needs Repetition',
  social_learner: 'Social Learner',
  independent_learner: 'Independent Learner',
};

// Helper function to map category to icon
export const categoryIcons: Record<StudentCategory, string> = {
  slow_processing: 'clock',
  fast_processor: 'zap',
  high_energy: 'activity',
  visual_learner: 'eye',
  auditory_learner: 'volume2',
  kinesthetic_learner: 'hand',
  logical_learner: 'brain',
  sensitive_low_confidence: 'heart',
  easily_distracted: 'target',
  needs_repetition: 'repeat',
  social_learner: 'users',
  independent_learner: 'user',
};
