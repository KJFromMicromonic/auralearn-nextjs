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
        router.replace('/sign-in');
        return;
      }

      try {
        const persistRole = async (role: 'teacher' | 'parent') => {
          await clerkUser.update({
            unsafeMetadata: { ...clerkUser.unsafeMetadata, role },
          });

          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', clerkUser.id)
            .maybeSingle();

          if (existingUser) {
            await supabase
              .from('users')
              .update({ role })
              .eq('clerk_id', clerkUser.id);
          } else {
            await supabase.from('users').insert({
              clerk_id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress,
              role,
              full_name: clerkUser.fullName || null,
            });
          }

          // Wait for refresh to complete
          await refreshUser();
        };

        // If role is provided in URL, set it everywhere
        if (roleFromUrl && clerkUser.unsafeMetadata?.role !== roleFromUrl) {
          await persistRole(roleFromUrl);
        }

        // Get role from URL parameter or from user metadata
        const metadataRole = (clerkUser.unsafeMetadata?.role as 'teacher' | 'parent' | undefined)
          || (clerkUser.publicMetadata?.role as 'teacher' | 'parent' | undefined);
        const dbRole = user?.role as 'teacher' | 'parent' | undefined;
        let finalRole: 'teacher' | 'parent' = roleFromUrl || metadataRole || dbRole || 'teacher';

        if (!metadataRole && !dbRole && !roleFromUrl) {
          // Ensure future loads have a role
          await persistRole(finalRole);
        } else if (roleFromUrl || metadataRole) {
          // Refresh user context to ensure it's up to date
          await refreshUser();
        }

        // Small delay to ensure context updates propagate
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch the latest user record to determine onboarding status
        const { data: latestUser, error: latestUserError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkUser.id)
          .maybeSingle();

        if (latestUserError) {
          console.error('Error fetching latest user profile:', latestUserError);
        }

        const onboardingCompleted = Boolean(latestUser?.onboarding_completed);

        setHasChecked(true);

        // Redirect based on role and onboarding completion
        if (finalRole === 'teacher') {
          router.replace(onboardingCompleted ? '/dashboard' : '/teacher-onboarding');
        } else if (finalRole === 'parent') {
          router.replace(onboardingCompleted ? '/parent-dashboard' : '/parent-onboarding');
        }
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

