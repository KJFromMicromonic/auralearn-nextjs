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

          await refreshUser();
        };

        // If role is provided in URL, set it everywhere
        if (roleFromUrl && clerkUser.unsafeMetadata?.role !== roleFromUrl) {
          await persistRole(roleFromUrl);
        }

        // Small delay to ensure sync is complete
        setTimeout(() => {
          setHasChecked(true);

          // Get role from URL parameter or from user metadata
          const metadataRole = (clerkUser.unsafeMetadata?.role as 'teacher' | 'parent' | undefined)
            || (clerkUser.publicMetadata?.role as 'teacher' | 'parent' | undefined);
          const dbRole = user?.role as 'teacher' | 'parent' | undefined;
          let finalRole: 'teacher' | 'parent' = roleFromUrl || metadataRole || dbRole || 'teacher';

          if (!metadataRole && !dbRole && !roleFromUrl) {
            // Ensure future loads have a role
            persistRole(finalRole).catch((error) => {
              console.error('Error persisting default role:', error);
            });
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

