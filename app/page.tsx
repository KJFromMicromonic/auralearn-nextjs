'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Brain, FileCheck, GraduationCap, Heart, ArrowRight, Users, CheckCircle2, Target, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useClerkAuth();
  const { user, isTeacher, isParent } = useAuth();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    if (isSignedIn && user?.role) {
      if (isTeacher) {
        router.push("/create-class");
      } else if (isParent) {
        router.push("/parent-dashboard");
      }
    } else if (isSignedIn) {
      router.push("/select-role");
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen animate-fade-in bg-gradient-to-br from-background via-background to-pastel-mint/10">
      {/* Hero Section */}
      <div className="max-w-4xl text-center space-y-8 py-16 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pastel-mint text-primary text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          {t('home.tagline')}
        </div>

        <h1 className="text-6xl font-bold text-foreground leading-tight">
          {t('home.title')}
          <br />
          <span className="text-primary">{t('home.subtitle')}</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('home.heroDescription')}
        </p>

        {isSignedIn && user?.role ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-info"
            >
              {t('home.goToDashboard')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signin/teacher">
                <Button size="lg" className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-info">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  {t('home.teacherLogin')}
                </Button>
              </Link>
              <Link href="/signin/parent">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all border-2">
                  <Heart className="w-5 h-5 mr-2" />
                  {t('home.parentLogin')}
                </Button>
              </Link>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                {t('home.noAccount')}{" "}
                <Link href="/select-role" className="text-primary font-medium hover:underline">
                  {t('home.signUpHere')}
                </Link>
              </p>
            </div>
          </>
        )}

        {/* Quick Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-pastel-mint to-white shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-success text-white flex items-center justify-center mb-4">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{t('home.features.adaptiveAssessment.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.features.adaptiveAssessment.description')}</p>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-pastel-sky to-white shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-info text-white flex items-center justify-center mb-4">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{t('home.features.behavioralProfiles.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.features.behavioralProfiles.description')}</p>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-pastel-coral to-white shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{t('home.features.smartGrouping.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.features.smartGrouping.description')}</p>
          </div>
        </div>
      </div>

      {/* For Parents Section */}
      <div className="w-full bg-gradient-to-br from-pink-50/50 to-rose-50/50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 text-pink-700 text-sm font-medium mb-4">
              <Heart className="w-4 h-4" />
              {t('home.forParents.title')}
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-4">{t('home.forParents.subtitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('home.forParents.description')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {(t('home.forParents.benefits', { returnObjects: true }) as string[]).map((benefit: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-white/80 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-pink-600 mt-0.5 flex-shrink-0" />
                <p className="text-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* For Teachers Section */}
      <div className="w-full bg-gradient-to-br from-blue-50/50 to-indigo-50/50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              <GraduationCap className="w-4 h-4" />
              {t('home.forTeachers.title')}
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-4">{t('home.forTeachers.subtitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('home.forTeachers.description')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {(t('home.forTeachers.benefits', { returnObjects: true }) as string[]).map((benefit: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-white/80 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* For Students Section */}
      <div className="w-full bg-gradient-to-br from-purple-50/50 to-pink-50/50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              {t('home.forStudents.title')}
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-4">{t('home.forStudents.subtitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('home.forStudents.description')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {(t('home.forStudents.benefits', { returnObjects: true }) as string[]).map((benefit: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-white/80 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <p className="text-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="w-full py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">{t('home.howItWorks.title')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-pastel-mint/20 to-white shadow-sm">
              <div className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
              <h3 className="font-semibold text-foreground mb-2">{t('home.howItWorks.step1.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('home.howItWorks.step1.description')}</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-pastel-sky/20 to-white shadow-sm">
              <div className="w-16 h-16 rounded-full bg-info text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
              <h3 className="font-semibold text-foreground mb-2">{t('home.howItWorks.step2.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('home.howItWorks.step2.description')}</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-pastel-lavender/20 to-white shadow-sm">
              <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
              <h3 className="font-semibold text-foreground mb-2">{t('home.howItWorks.step3.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('home.howItWorks.step3.description')}</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-pastel-coral/20 to-white shadow-sm">
              <div className="w-16 h-16 rounded-full bg-warning text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">4</div>
              <h3 className="font-semibold text-foreground mb-2">{t('home.howItWorks.step4.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('home.howItWorks.step4.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
