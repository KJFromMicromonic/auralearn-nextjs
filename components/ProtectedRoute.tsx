'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'teacher' | 'parent';
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // All hooks must be called before any conditional returns
  // Handle redirects in useEffect (must be called unconditionally)
  useEffect(() => {
    // Only redirect if auth is loaded
    if (!clerkLoaded || authLoading) {
      return; // Wait for auth to load
    }

    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    // Check role from context or Clerk metadata as fallback
    const roleFromContext = user?.role as 'teacher' | 'parent' | undefined;
    const roleFromMetadata = (clerkUser?.unsafeMetadata?.role as 'teacher' | 'parent' | undefined)
      || (clerkUser?.publicMetadata?.role as 'teacher' | 'parent' | undefined);
    const userRole = roleFromContext || roleFromMetadata;

    // If no role found anywhere, redirect to auth-callback to set it
    if (!userRole) {
      router.push('/auth-callback');
      return;
    }

    // Check if role matches requirement
    if (requireRole && userRole !== requireRole) {
      // Wrong role - redirect to appropriate dashboard
      if (userRole === 'teacher') {
        router.push('/dashboard');
      } else {
        router.push('/parent-dashboard');
      }
      return;
    }
  }, [clerkLoaded, authLoading, isSignedIn, user?.role, clerkUser, requireRole, router]);

  // Wait for auth to load
  if (!clerkLoaded || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check role from context or Clerk metadata as fallback
  const roleFromContext = user?.role as 'teacher' | 'parent' | undefined;
  const roleFromMetadata = (clerkUser?.unsafeMetadata?.role as 'teacher' | 'parent' | undefined)
    || (clerkUser?.publicMetadata?.role as 'teacher' | 'parent' | undefined);
  const userRole = roleFromContext || roleFromMetadata;

  // Not signed in or wrong role - show loading while redirecting
  if (!isSignedIn || !userRole || (requireRole && userRole !== requireRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
