import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Palette, User, Globe, BookOpen, Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth, SubjectType, GradeLevelType } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import LanguageSelector from "@/components/LanguageSelector";

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

export default function Settings() {
  const { t } = useTranslation();
  const { user, isTeacher, refreshUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [teacherProfile, setTeacherProfile] = useState({
    primarySubject: (user?.primary_subject || '') as SubjectType | '',
    primaryGradeLevel: (user?.primary_grade_level || '') as GradeLevelType | '',
    schoolName: user?.school_name || '',
  });

  useEffect(() => {
    if (user) {
      setTeacherProfile({
        primarySubject: (user.primary_subject || '') as SubjectType | '',
        primaryGradeLevel: (user.primary_grade_level || '') as GradeLevelType | '',
        schoolName: user.school_name || '',
      });
    }
  }, [user]);

  const handleSaveTeacherProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          primary_subject: teacherProfile.primarySubject || null,
          primary_grade_level: teacherProfile.primaryGradeLevel || null,
          school_name: teacherProfile.schoolName || null,
          onboarding_completed: true,
        })
        .eq('clerk_id', user.clerk_id);

      if (error) {
        console.error('Error updating teacher profile:', error);
        toast.error(t('settings.teacherProfile.updateError'));
        return;
      }

      await refreshUser();
      toast.success(t('settings.teacherProfile.updateSuccess'));
    } catch (error) {
      console.error('Error in handleSaveTeacherProfile:', error);
      toast.error(t('settings.teacherProfile.updateError'));
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.description')}</p>
      </div>

      <Card className="p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{t('settings.language.title')}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('settings.language.selectLanguage')}</Label>
            <p className="text-sm text-muted-foreground mb-4">{t('settings.language.description')}</p>
            <div className="flex items-center gap-4">
              <LanguageSelector variant="outline" showLabel={true} className="px-6 py-3" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{t('settings.theme.title')}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">{t('settings.theme.selectTheme')}</Label>
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: "light", label: t('settings.theme.light') },
                { key: "dark", label: t('settings.theme.dark') },
                { key: "futuristic", label: t('settings.theme.futuristic') },
                { key: "highContrast", label: t('settings.theme.highContrast') }
              ].map((theme) => (
                <button
                  key={theme.key}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme.key === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{theme.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {isTeacher && (
        <Card className="p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{t('settings.teacherProfile.title')}</h2>
          </div>
          <div className="space-y-6">
            {/* Primary Subject */}
            <div className="space-y-2">
              <Label htmlFor="settings-subject" className="text-base font-semibold">
                {t('onboarding.primarySubject')}
              </Label>
              <Select
                value={teacherProfile.primarySubject}
                onValueChange={(value) =>
                  setTeacherProfile({ ...teacherProfile, primarySubject: value as SubjectType })
                }
              >
                <SelectTrigger id="settings-subject" className="h-12">
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
              {teacherProfile.primarySubject && (
                <p className="text-sm text-muted-foreground">
                  {t('settings.teacherProfile.currentSubject')}: <strong>{t(`subjects.${teacherProfile.primarySubject}`)}</strong>
                </p>
              )}
            </div>

            {/* Primary Grade Level */}
            <div className="space-y-2">
              <Label htmlFor="settings-grade" className="text-base font-semibold">
                {t('onboarding.primaryGradeLevel')}
              </Label>
              <Select
                value={teacherProfile.primaryGradeLevel}
                onValueChange={(value) =>
                  setTeacherProfile({ ...teacherProfile, primaryGradeLevel: value as GradeLevelType })
                }
              >
                <SelectTrigger id="settings-grade" className="h-12">
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
              {teacherProfile.primaryGradeLevel && (
                <p className="text-sm text-muted-foreground">
                  {t('settings.teacherProfile.currentGrade')}: <strong>{teacherProfile.primaryGradeLevel}</strong>
                </p>
              )}
            </div>

            {/* School Name */}
            <div className="space-y-2">
              <Label htmlFor="settings-school" className="text-base font-semibold">
                {t('onboarding.schoolName')} <span className="text-muted-foreground text-sm">({t('common.optional')})</span>
              </Label>
              <Input
                id="settings-school"
                type="text"
                placeholder={t('onboarding.schoolNamePlaceholder')}
                value={teacherProfile.schoolName}
                onChange={(e) =>
                  setTeacherProfile({ ...teacherProfile, schoolName: e.target.value })
                }
                className="h-12"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveTeacherProfile}
              disabled={isSaving}
              className="w-full h-12 text-base"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{t('settings.profile.title')}</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-white text-3xl font-bold">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-lg font-semibold">{user?.full_name || user?.email}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Button variant="outline" className="rounded-xl mt-2">
              {t('settings.profile.uploadPhoto')}
            </Button>
            <p className="text-sm text-muted-foreground">{t('settings.profile.photoRecommendation')}</p>
          </div>
        </div>
      </Card>

      <Card className="p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{t('settings.dataManagement.title')}</h2>
        </div>
        <div className="space-y-3">
          <Button variant="outline" className="w-full rounded-xl justify-start">
            {t('settings.dataManagement.exportClassData')}
          </Button>
          <Button variant="outline" className="w-full rounded-xl justify-start text-destructive hover:text-destructive">
            {t('settings.dataManagement.clearAssessmentHistory')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
