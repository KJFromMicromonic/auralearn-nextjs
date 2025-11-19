'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Heart } from 'lucide-react';

/**
 * Guides new visitors to the correct Clerk sign-up flow before any auth
 * begins, eliminating the old post-auth role selection screen.
 *
 * @returns JSX element with role-aware sign-up CTAs
 */
export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-coral/20 via-pastel-mint/20 to-pastel-sky/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Create your AuraLearn account</h1>
          <p className="text-lg text-muted-foreground">Pick the experience that matches how you use AuraLearn.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <GraduationCap className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-2xl">I&apos;m a Teacher</CardTitle>
              <CardDescription className="text-base">
                Launch differentiated instruction in minutes with data-backed insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Assess students and build learning profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Auto-generate AI guidance and worksheets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Collaborate with parents seamlessly</span>
                </li>
              </ul>
              <Link href="/signup/teacher">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90" size="lg">
                  Sign up as Teacher
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-pink-500">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Heart className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-2xl">I&apos;m a Parent</CardTitle>
              <CardDescription className="text-base">
                Understand your child&apos;s learning style and get weekly home strategies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>View actionable learning profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>Receive personalized, low-lift activities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>Track progress with weekly snapshots</span>
                </li>
              </ul>
              <Link href="/signup/parent">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90" size="lg">
                  Sign up as Parent
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}