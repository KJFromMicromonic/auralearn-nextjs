'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Loader2, Plus, X, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Badge } from '@/components/ui/badge';

interface ChildForm {
  name: string;
  gradeLevel: string;
}

export default function ParentOnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [children, setChildren] = useState<ChildForm[]>([{ name: '', gradeLevel: 'CM1' }]);
  const [schoolName, setSchoolName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');

  const addChild = () => {
    setChildren([...children, { name: '', gradeLevel: 'CM1' }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: keyof ChildForm, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    // Validate at least one child with a name
    const validChildren = children.filter(c => c.name.trim());
    if (validChildren.length === 0) {
      toast.error('Please add at least one child');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a "Home" class for this parent
      // Note: We use user_id field to create parent-managed classes
      const { data: homeClass, error: classError } = await supabase
        .from('classes')
        .insert({
          name: `${user.full_name || 'Home'}'s Learning Space`,
          user_id: user.id, // Using parent's user ID to create parent-managed classes
          grade_level: validChildren[0].gradeLevel,
          subject: 'home_learning',
        })
        .select()
        .single();

      if (classError) {
        console.error('Error creating home class:', classError);
        toast.error('Failed to create learning space');
        setIsSubmitting(false);
        return;
      }

      // Create students for each child
      const studentsToCreate = validChildren.map(child => ({
        class_id: homeClass.id,
        name: child.name.trim(),
        parent_email: user.email,
        // Store grade level in a way we can access it later
        // Note: This might require a schema update, but for now we'll use the class grade_level
      }));

      const { error: studentsError } = await supabase
        .from('students')
        .insert(studentsToCreate);

      if (studentsError) {
        console.error('Error creating students:', studentsError);
        toast.error('Failed to add children');
        setIsSubmitting(false);
        return;
      }

      // Update user profile with onboarding completion
      const { error: updateError } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          school_name: schoolName.trim() || null,
        })
        .eq('clerk_id', user.clerk_id);

      if (updateError) {
        console.error('Error updating user profile:', updateError);
        // Non-critical, continue
      }

      // Refresh user data
      await refreshUser();

      toast.success(`Welcome! Added ${validChildren.length} child${validChildren.length > 1 ? 'ren' : ''} to your learning space.`);
      
      // Redirect to parent dashboard
      router.replace('/parent-dashboard');
    } catch (error) {
      console.error('Error in parent onboarding:', error);
      toast.error('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requireRole="parent">
      <div className="min-h-screen bg-gradient-to-br from-pastel-coral/20 via-pastel-mint/20 to-pastel-sky/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl">Welcome to Your Home Learning Companion</CardTitle>
            <CardDescription className="text-base">
              Let's set up your child's learning profile to get personalized support strategies
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Children Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Add Your Children <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addChild}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Child
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add one or more children to get personalized learning support for each child.
                </p>

                <div className="space-y-4">
                  {children.map((child, index) => (
                    <Card key={index} className="bg-secondary/50">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor={`child-name-${index}`}>
                                Child's Name <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id={`child-name-${index}`}
                                type="text"
                                placeholder="Enter your child's name"
                                value={child.name}
                                onChange={(e) => updateChild(index, 'name', e.target.value)}
                                className="h-12"
                                required={index === 0}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`child-grade-${index}`}>Grade Level</Label>
                              <select
                                id={`child-grade-${index}`}
                                value={child.gradeLevel}
                                onChange={(e) => updateChild(index, 'gradeLevel', e.target.value)}
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="CM1">CM1</option>
                                <option value="CM2">CM2</option>
                                <option value="CE2">CE2</option>
                                <option value="CE1">CE1</option>
                                <option value="CP">CP</option>
                                <option value="6e">6ème</option>
                                <option value="5e">5ème</option>
                                <option value="4e">4ème</option>
                                <option value="3e">3ème</option>
                              </select>
                            </div>
                          </div>
                          {children.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeChild(index)}
                              className="mt-8"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  Optional: Link to School
                </div>
                <p className="text-sm text-muted-foreground">
                  You can link to your child's school or teacher later. This helps us provide more personalized recommendations.
                </p>

                {/* School Name (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="schoolName">
                    School Name <span className="text-muted-foreground text-sm">(Optional)</span>
                  </Label>
                  <Input
                    id="schoolName"
                    type="text"
                    placeholder="e.g., École Primaire de Paris"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="h-12"
                  />
                </div>

                {/* Teacher Email (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="teacherEmail">
                    Teacher Email <span className="text-muted-foreground text-sm">(Optional)</span>
                  </Label>
                  <Input
                    id="teacherEmail"
                    type="email"
                    placeholder="teacher@school.com"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    If your child's teacher uses LearnAura, enter their email to link accounts.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90"
                  disabled={isSubmitting || !children.some(c => c.name.trim())}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Setting up your learning space...
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-5 w-5" />
                      Get Started with Home Learning
                    </>
                  )}
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-200">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-pink-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-pink-900">
                      What happens next?
                    </p>
                    <ul className="text-xs text-pink-800 space-y-1 list-disc list-inside">
                      <li>Complete a quick Learning Snapshot for each child (10-15 minutes)</li>
                      <li>Get personalized support strategies based on how your child learns</li>
                      <li>Access daily activities and resources tailored to your child's needs</li>
                      <li>Link to your child's teacher anytime to share insights</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

