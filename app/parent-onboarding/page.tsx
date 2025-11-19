'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, GradeLevelType } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Loader2, Plus, X, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import { addChildToParentProfile } from '@/services/parent-child-service';

interface ChildForm {
  name: string;
  gradeLevel: string;
  schoolName: string;
  classLabel?: string;
  schoolLocation?: string;
}

export default function ParentOnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createEmptyChild = (): ChildForm => ({
    name: '',
    gradeLevel: 'CM1',
    schoolName: '',
    classLabel: '',
    schoolLocation: '',
  });
  const [children, setChildren] = useState<ChildForm[]>([createEmptyChild()]);

  const addChild = () => {
    setChildren([...children, createEmptyChild()]);
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

    if (!user.email || !user.id) {
      toast.error('Missing parent account information.');
      return;
    }

    // Validate at least one child with name and school
    const validChildren = children.filter(c => c.name.trim() && c.schoolName.trim());
    if (validChildren.length === 0) {
      toast.error('Please add at least one child with a school name');
      return;
    }

    setIsSubmitting(true);

    try {
      await Promise.all(
        validChildren.map(child =>
          addChildToParentProfile({
            userId: user.id,
            parentEmail: user.email!,
            child: {
              name: child.name.trim(),
              gradeLevel: child.gradeLevel as GradeLevelType,
              schoolName: child.schoolName.trim(),
              classLabel: child.classLabel?.trim() || undefined,
              schoolLocation: child.schoolLocation?.trim() || undefined,
            },
          })
        )
      );

      const primarySchool = validChildren[0]?.schoolName?.trim() || null;

      // Update user profile with onboarding completion
      const { error: updateError } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          school_name: primarySchool,
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
    } finally {
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
                  Add one or more children to get personalized learning support for each child. Each child can attend a different school.
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
                            <div className="space-y-2">
                              <Label htmlFor={`child-school-${index}`}>
                                School Name <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id={`child-school-${index}`}
                                type="text"
                                placeholder="e.g., École Primaire de Lyon"
                                value={child.schoolName}
                                onChange={(e) => updateChild(index, 'schoolName', e.target.value)}
                                className="h-12"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`child-class-${index}`}>Class / Teacher (optional)</Label>
                                <Input
                                  id={`child-class-${index}`}
                                  type="text"
                                  placeholder="e.g., Mme Bernard - CM2B"
                                  value={child.classLabel}
                                  onChange={(e) => updateChild(index, 'classLabel', e.target.value)}
                                  className="h-12"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`child-location-${index}`}>School City (optional)</Label>
                                <Input
                                  id={`child-location-${index}`}
                                  type="text"
                                  placeholder="e.g., Marseille"
                                  value={child.schoolLocation}
                                  onChange={(e) => updateChild(index, 'schoolLocation', e.target.value)}
                                  className="h-12"
                                />
                              </div>
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

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90"
                  disabled={isSubmitting || !children.some(c => c.name.trim() && c.schoolName.trim())}
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

