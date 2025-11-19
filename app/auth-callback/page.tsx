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

          // First, try to find user by clerk_id
          let { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', clerkUser.id)
            .maybeSingle();

          // If not found by clerk_id, try to find by email (for migrated users)
          if (!existingUser && clerkUser.primaryEmailAddress?.emailAddress) {
            const { data: userByEmail } = await supabase
              .from('users')
              .select('*')
              .eq('email', clerkUser.primaryEmailAddress.emailAddress)
              .maybeSingle();
            
            if (userByEmail) {
              // Update the existing user with the new clerk_id
              const { data: updatedUser } = await supabase
                .from('users')
                .update({ 
                  clerk_id: clerkUser.id,
                  role // Update role if different
                })
                .eq('id', userByEmail.id)
                .select()
                .single();
              
              existingUser = updatedUser || userByEmail;
            }
          }

          if (existingUser) {
            // Only update role if it's different, preserve all other fields (especially onboarding_completed)
            if (existingUser.role !== role) {
              await supabase
                .from('users')
                .update({ role })
                .eq('clerk_id', clerkUser.id);
            }
          } else {
            // Create new user - onboarding_completed defaults to false/null
            await supabase.from('users').insert({
              clerk_id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress,
              role,
              full_name: clerkUser.fullName || null,
              onboarding_completed: false, // Explicitly set to false for new users
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
        // Try by clerk_id first, then by email as fallback (for migrated users)
        let { data: latestUser, error: latestUserError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkUser.id)
          .maybeSingle();

        // If not found by clerk_id, try by email (for users migrated from dev)
        if (!latestUser && clerkUser.primaryEmailAddress?.emailAddress) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', clerkUser.primaryEmailAddress.emailAddress)
            .maybeSingle();
          
          if (userByEmail) {
            latestUser = userByEmail;
            // Update the clerk_id to match the current Clerk instance
            await supabase
              .from('users')
              .update({ clerk_id: clerkUser.id })
              .eq('id', userByEmail.id);
          }
        }

        if (latestUserError && !latestUser) {
          console.error('Error fetching latest user profile:', latestUserError);
        }

        // Log for debugging migration issues
        if (latestUser) {
          console.log('User profile found:', {
            clerk_id: latestUser.clerk_id,
            email: latestUser.email,
            role: latestUser.role,
            onboarding_completed: latestUser.onboarding_completed,
          });
        } else {
          console.warn('No user profile found in Supabase for Clerk user:', clerkUser.id);
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

