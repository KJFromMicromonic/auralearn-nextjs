import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, SubjectType, GradeLevelType } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECTS: SubjectType[] = [
  'francais',
  'langues_vivantes',
  'arts_plastiques',
  'education_musicale',
  'histoire_des_arts',
  'education_physique_sportive',
  'enseignement_moral_civique',
  'histoire_geographie',
  'sciences_technologie',
  'mathematiques',
];

const GRADE_LEVELS: GradeLevelType[] = ['CM1', 'CM2'];

export default function TeacherOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    primarySubject: '' as SubjectType | '',
    primaryGradeLevel: '' as GradeLevelType | '',
    schoolName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.primarySubject || !formData.primaryGradeLevel) {
      toast.error(t('onboarding.validation.requiredFields'));
      return;
    }

    if (!user) {
      toast.error(t('common.error'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Update user profile in Supabase
      const { error } = await supabase
        .from('users')
        .update({
          primary_subject: formData.primarySubject,
          primary_grade_level: formData.primaryGradeLevel,
          school_name: formData.schoolName || null,
          onboarding_completed: true,
        })
        .eq('clerk_id', user.clerk_id);

      if (error) {
        console.error('Error updating user profile:', error);
        toast.error(t('onboarding.error'));
        setIsSubmitting(false);
        return;
      }

      // Refresh user data in context
      await refreshUser();

      toast.success(t('onboarding.success'));
      
      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error in onboarding:', error);
      toast.error(t('onboarding.error'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-coral/20 via-pastel-mint/20 to-pastel-sky/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
            <Lightbulb className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl">{t('onboarding.title')}</CardTitle>
          <CardDescription className="text-base">
            {t('onboarding.description')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primary Subject */}
            <div className="space-y-2">
              <Label htmlFor="primarySubject" className="text-base font-semibold">
                {t('onboarding.primarySubject')} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.primarySubject}
                onValueChange={(value) =>
                  setFormData({ ...formData, primarySubject: value as SubjectType })
                }
              >
                <SelectTrigger id="primarySubject" className="h-12">
                  <SelectValue placeholder={t('onboarding.selectSubject')} />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {t(`subjects.${subject}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.subjectHelp')}
              </p>
            </div>

            {/* Primary Grade Level */}
            <div className="space-y-2">
              <Label htmlFor="primaryGradeLevel" className="text-base font-semibold">
                {t('onboarding.primaryGradeLevel')} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.primaryGradeLevel}
                onValueChange={(value) =>
                  setFormData({ ...formData, primaryGradeLevel: value as GradeLevelType })
                }
              >
                <SelectTrigger id="primaryGradeLevel" className="h-12">
                  <SelectValue placeholder={t('onboarding.selectGradeLevel')} />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.gradeLevelHelp')}
              </p>
            </div>

            {/* School Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="schoolName" className="text-base font-semibold">
                {t('onboarding.schoolName')} <span className="text-muted-foreground text-sm">({t('common.optional')})</span>
              </Label>
              <Input
                id="schoolName"
                type="text"
                placeholder={t('onboarding.schoolNamePlaceholder')}
                value={formData.schoolName}
                onChange={(e) =>
                  setFormData({ ...formData, schoolName: e.target.value })
                }
                className="h-12"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isSubmitting || !formData.primarySubject || !formData.primaryGradeLevel}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('onboarding.completing')}
                  </>
                ) : (
                  t('onboarding.complete')
                )}
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-4 mt-6">
              <p className="text-sm text-muted-foreground">
                <strong>{t('onboarding.note')}:</strong> {t('onboarding.noteText')}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
