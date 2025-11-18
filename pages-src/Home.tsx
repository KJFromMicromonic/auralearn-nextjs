import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Brain, Users, FileCheck, GraduationCap, Heart, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";

export default function Home() {
  const navigate = useNavigate();
  const { isSignedIn } = useClerkAuth();
  const { user, isTeacher, isParent } = useAuth();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    if (isSignedIn && user?.role) {
      if (isTeacher) {
        navigate("/create-class");
      } else if (isParent) {
        navigate("/parent-guide");
      }
    } else if (isSignedIn) {
      navigate("/select-role");
    } else {
      navigate("/sign-in");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen animate-fade-in bg-gradient-to-br from-background via-background to-pastel-mint/10">
      <div className="max-w-4xl text-center space-y-8">
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
          {t('home.description')}
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
              <Link to="/signin/teacher">
                <Button size="lg" className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-info">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  {t('home.teacherLogin')}
                </Button>
              </Link>
              <Link to="/signin/parent">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all border-2">
                  <Heart className="w-5 h-5 mr-2" />
                  {t('home.parentLogin')}
                </Button>
              </Link>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                {t('home.noAccount')}{" "}
                <Link to="/select-role" className="text-primary font-medium hover:underline">
                  {t('home.signUpHere')}
                </Link>
              </p>
            </div>
          </>
        )}

        <div className="grid grid-cols-3 gap-6 pt-12 max-w-3xl mx-auto">
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
    </div>
  );
}
