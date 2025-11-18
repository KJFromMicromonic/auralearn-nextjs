'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { user, refreshUser, isLoading } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  const roleFromUrl = searchParams.get('role') as 'teacher' | 'parent' | null;

  useEffect(() => {
    async function handleAuth() {
      // Wait for both Clerk and our auth context to load
      if (!isLoaded || !clerkUser) {
        return;
      }

      // Prevent multiple redirects
      if (hasChecked) {
        return;
      }

      // Not signed in - redirect to sign in
      if (!isSignedIn) {
        setHasChecked(true);
        router.replace('/signin/teacher');
        return;
      }

      try {
        // If role is provided in URL, set it in Clerk metadata
        if (roleFromUrl && clerkUser.unsafeMetadata?.role !== roleFromUrl) {
          await clerkUser.update({
            unsafeMetadata: { ...clerkUser.unsafeMetadata, role: roleFromUrl }
          });

          // Also sync to Supabase
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', clerkUser.id)
            .single();

          if (existingUser) {
            await supabase
              .from('users')
              .update({ role: roleFromUrl })
              .eq('clerk_id', clerkUser.id);
          } else {
            // Create user in Supabase if doesn't exist
            await supabase.from('users').insert({
              clerk_id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress,
              role: roleFromUrl,
              full_name: clerkUser.fullName || null,
            });
          }

          // Refresh our auth context
          await refreshUser();
        }

        // Small delay to ensure sync is complete
        setTimeout(() => {
          setHasChecked(true);

          // Get role from URL parameter or from user metadata
          const finalRole = roleFromUrl || (clerkUser.unsafeMetadata?.role as string) || user?.role;

          if (!finalRole) {
            router.replace('/select-role');
            return;
          }

          // Redirect based on role
          if (finalRole === 'teacher') {
            // Check if teacher has completed onboarding
            if (!user?.onboarding_completed) {
              router.replace('/teacher-onboarding');
            } else {
              router.replace('/dashboard');
            }
          } else if (finalRole === 'parent') {
            // Check if parent has completed onboarding
            if (!user?.onboarding_completed) {
              router.replace('/parent-onboarding');
            } else {
              router.replace('/parent-dashboard');
            }
          }
        }, 500);
      } catch (error) {
        console.error('Error in auth callback:', error);
        setHasChecked(true);
        router.replace('/');
      }
    }

    handleAuth();
  }, [isSignedIn, isLoaded, clerkUser, user, roleFromUrl, isLoading, router, hasChecked, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

