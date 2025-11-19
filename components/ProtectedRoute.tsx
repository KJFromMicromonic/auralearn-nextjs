'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'teacher' | 'parent';
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
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
    } else if (isSignedIn && !user?.role) {
      router.push('/auth-callback');
    } else if (isSignedIn && requireRole && user?.role !== requireRole) {
      // Wrong role - redirect to appropriate dashboard
      if (user.role === 'teacher') {
        router.push('/dashboard');
      } else {
        router.push('/parent-guide');
      }
    }
  }, [clerkLoaded, authLoading, isSignedIn, user?.role, requireRole, router]);

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

  // Not signed in or wrong role - show loading while redirecting
  if (!isSignedIn || !user?.role || (requireRole && user.role !== requireRole)) {
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
