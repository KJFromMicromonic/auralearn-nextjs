import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function RoleSelection() {
  const navigate = useNavigate();
  const { user: clerkUser } = useUser();
  const { user, isTeacher, isParent, refreshUser, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // If user already has a role, redirect them to their dashboard
  useEffect(() => {
    if (!authLoading && user?.role) {
      if (isTeacher) {
        navigate('/create-class', { replace: true });
      } else if (isParent) {
        navigate('/parent-guide', { replace: true });
      }
    }
  }, [user, isTeacher, isParent, authLoading, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const selectRole = (role: 'teacher' | 'parent') => {
    // If user is already signed in (has clerkUser), set role and navigate to dashboard
    if (clerkUser) {
      setIsLoading(true);

      clerkUser.update({
        unsafeMetadata: { ...clerkUser.unsafeMetadata, role },
      }).then(async () => {
        // Update or create user in Supabase
        await supabase
          .from('users')
          .upsert({
            clerk_id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            role,
            full_name: clerkUser.fullName || undefined,
          });

        // Refresh user profile
        await refreshUser();

        // Navigate based on role
        if (role === 'teacher') {
          navigate('/create-class');
        } else {
          navigate('/parent-guide');
        }
      }).catch((error) => {
        console.error('Error selecting role:', error);
        setIsLoading(false);
      });
    } else {
      // User is not signed in, redirect to signup with role
      if (role === 'teacher') {
        navigate('/signup/teacher');
      } else {
        navigate('/signup/parent');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-mint/20 via-pastel-sky/20 to-pastel-lavender/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Welcome to LearnAura!</h1>
          <p className="text-lg text-muted-foreground">Choose your role to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Teacher Card */}
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <GraduationCap className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-2xl">I'm a Teacher</CardTitle>
              <CardDescription className="text-base">
                Manage classes, create assessments, and generate teaching strategies
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
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Create differentiated worksheets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Connect with parent accounts</span>
                </li>
              </ul>
              <Button
                onClick={() => selectRole('teacher')}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
                size="lg"
              >
                Continue as Teacher
              </Button>
            </CardContent>
          </Card>

          {/* Parent Card */}
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-pink-500">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Heart className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-2xl">I'm a Parent</CardTitle>
              <CardDescription className="text-base">
                Support your child's learning with personalized strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>View your child's learning profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>Get home support strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>Access curated educational resources</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>Receive weekly action checklists</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>Stay connected with teachers</span>
                </li>
              </ul>
              <Button
                onClick={() => selectRole('parent')}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90"
                size="lg"
              >
                Continue as Parent
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
