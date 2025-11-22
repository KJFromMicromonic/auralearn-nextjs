'use client';

import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { FeatureToggleProvider } from "@/contexts/FeatureToggleContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useState } from "react";
import "@/i18n/config";

// Get Clerk publishable key from environment
const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

/**
 * Client-side providers wrapper
 * All providers that need client-side features must be here
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Create QueryClient with useState to ensure it's only created once per component instance
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FeatureToggleProvider>
            <LanguageProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </LanguageProvider>
          </FeatureToggleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

