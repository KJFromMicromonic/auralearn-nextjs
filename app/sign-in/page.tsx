'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Heart } from 'lucide-react';

/**
 * Presents a role selector before any Clerk interaction so we always
 * know whether the user intends to authenticate as a teacher or parent.
 *
 * @returns JSX element that links to the role-specific sign-in flows
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-mint/20 via-pastel-sky/20 to-pastel-lavender/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Sign in to LearnAura</h1>
          <p className="text-lg text-muted-foreground">
            Choose your experience to jump straight into the right dashboard.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <GraduationCap className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-2xl">I&apos;m a Teacher</CardTitle>
              <CardDescription className="text-base">
                Manage classes, run assessments, and generate instant strategies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Create and manage multiple classes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Assess students and track progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Generate AI-powered teaching guides</span>
                </li>
              </ul>
              <Link href="/signin/teacher">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90" size="lg">
                  Continue as Teacher
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
                Support your child with personalized insight and weekly actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>View your child&apos;s learning profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>Get 10-minute home support strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>Stay aligned with teachers week to week</span>
                </li>
              </ul>
              <Link href="/signin/parent">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90" size="lg">
                  Continue as Parent
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}