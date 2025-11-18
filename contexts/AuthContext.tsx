'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'teacher' | 'parent';

export type SubjectType = 
  | 'francais'
  | 'langues_vivantes'
  | 'arts_plastiques'
  | 'education_musicale'
  | 'histoire_des_arts'
  | 'education_physique_sportive'
  | 'enseignement_moral_civique'
  | 'histoire_geographie'
  | 'sciences_technologie'
  | 'mathematiques';

export type GradeLevelType = 'CM1' | 'CM2';

export interface UserProfile {
  id: string;
  clerk_id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  primary_subject?: SubjectType;
  primary_grade_level?: GradeLevelType;
  school_name?: string;
  onboarding_completed?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isTeacher: boolean;
  isParent: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrCreateUserProfile = useCallback(async () => {
    if (!clerkUser) {
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const clerkId = clerkUser.id;
      // Wait for email to be available (Clerk might load it asynchronously)
      let email = clerkUser.primaryEmailAddress?.emailAddress || '';
      
      // If email is not available, wait a bit and try again
      if (!email && clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
        email = clerkUser.emailAddresses[0].emailAddress || '';
      }

      if (!clerkId) {
        console.error('Missing required user data: clerkId', { clerkId, email });
        setIsLoading(false);
        return;
      }

      // If email is still not available, log a warning but continue (email might be optional)
      if (!email) {
        console.warn('Email not available yet, continuing without it:', { clerkId });
      }

      // Check Supabase configuration before making request
      // Log what we're about to use
      console.log('🔍 About to query Supabase:', {
        clerkId,
        email,
        // Try to get the actual URL from the client
        supabaseClientType: typeof supabase,
      });

      // Check if user exists in Supabase
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkId)
        .maybeSingle();

      // If user exists, use it
      if (existingUser) {
        setUserProfile(existingUser as UserProfile);
        setIsLoading(false);
        return;
      }

      // Handle fetch errors
      if (fetchError) {
        // Access error properties directly (Supabase PostgrestError structure)
        const errorCode = (fetchError as { code?: string })?.code;
        const errorMessage = (fetchError as { message?: string })?.message;
        const errorDetails = (fetchError as { details?: string })?.details;
        const errorHint = (fetchError as { hint?: string })?.hint;
        
        // PGRST116 is the "not found" error code, which is expected when creating a new user
        if (errorCode === 'PGRST116') {
          // This is expected - user doesn't exist yet, continue to create
        } else {
          // Log the error with direct property access
          console.error('Error fetching user from Supabase:');
          console.error('  Code:', errorCode || 'undefined');
          console.error('  Message:', errorMessage || 'undefined');
          console.error('  Details:', errorDetails || 'undefined');
          console.error('  Hint:', errorHint || 'undefined');
          console.error('  Clerk ID:', clerkId);
          console.error('  Email:', email);
          
          // Use console.dir for better object inspection
          console.dir(fetchError, { depth: null });
          
          setIsLoading(false);
          return;
        }
      }

      // User doesn't exist, determine role based on metadata or default to teacher
      const role = (clerkUser.publicMetadata?.role as UserRole) || 'teacher';

      // Create new user in Supabase
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: clerkId,
          email,
          role,
          full_name: clerkUser.fullName || undefined,
        })
        .select()
        .single();

      if (createError) {
        // Check if it's a duplicate key error (user was created in another request)
        // PostgreSQL error code 23505 = unique_violation
        // HTTP status 409 = Conflict
        const isDuplicateError = 
          createError.code === '23505' || 
          (createError as any)?.status === 409 ||
          createError.message?.includes('duplicate') ||
          createError.message?.includes('already exists');

        if (isDuplicateError) {
          // User already exists, try to fetch it again
          const { data: retryUser, error: retryError } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', clerkId)
            .single();

          if (retryUser) {
            setUserProfile(retryUser as UserProfile);
            setIsLoading(false);
            return;
          }

          if (retryError) {
            console.error('Error fetching user after duplicate key error:', {
              message: retryError.message,
              details: retryError.details,
              hint: retryError.hint,
              code: retryError.code,
            });
          }
        } else {
          console.error('Error creating user in Supabase:', {
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            code: createError.code,
            status: (createError as any)?.status,
          });
        }
        setIsLoading(false);
        return;
      }

      if (!newUser) {
        console.error('User creation succeeded but no data returned');
        setIsLoading(false);
        return;
      }

      setUserProfile(newUser as UserProfile);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchOrCreateUserProfile:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      setIsLoading(false);
    }
  }, [clerkUser]);

  useEffect(() => {
    if (isLoaded && clerkUser) {
      // Use setTimeout to avoid calling setState synchronously in effect
      const timer = setTimeout(() => {
        fetchOrCreateUserProfile();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [clerkUser, isLoaded, fetchOrCreateUserProfile]);

  const handleSignOut = async () => {
    await clerkSignOut();
    setUserProfile(null);
  };

  const value: AuthContextType = {
    user: userProfile,
    isLoading: !isLoaded || isLoading,
    isTeacher: userProfile?.role === 'teacher',
    isParent: userProfile?.role === 'parent',
    signOut: handleSignOut,
    refreshUser: fetchOrCreateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
