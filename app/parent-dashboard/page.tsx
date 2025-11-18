'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Brain, 
  BookOpen, 
  Heart, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Target
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentsForParent, StudentWithClass } from "@/services/student-service";
import { getParentDashboardData, ParentDashboardData } from "@/services/parent-dashboard-service";
import { getActivityStats } from "@/services/parent-activity-service";
import ChildSwitcher from "@/components/ChildSwitcher";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function ParentDashboardPage() {
  const { user, isParent } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<ParentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch linked students for parent
  useEffect(() => {
    async function loadStudents() {
      if (!user?.email) return;

      try {
        setIsLoading(true);
        const linkedStudents = await getStudentsForParent(user.email);
        setStudents(linkedStudents);

        // Auto-select if only one child
        if (linkedStudents.length === 1) {
          setSelectedStudentId(linkedStudents[0].id);
        }
      } catch (error) {
        console.error('Error loading students:', error);
        toast({
          title: "Error",
          description: "Failed to load linked students",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadStudents();
  }, [user?.email, toast]);

  // Load dashboard data when student is selected
  useEffect(() => {
    async function loadDashboardData() {
      if (!selectedStudentId) {
        setDashboardData(null);
        return;
      }

      const selectedStudent = students.find(s => s.id === selectedStudentId);
      if (!selectedStudent) return;

      try {
        setIsLoading(true);
        if (!user?.clerk_id) {
          console.error('User clerk_id not available');
          return;
        }

        const data = await getParentDashboardData(
          selectedStudentId,
          selectedStudent.name,
          user.clerk_id
        );
        setDashboardData(data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [selectedStudentId, students, toast]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  if (isLoading && !dashboardData) {
    return (
      <ProtectedRoute requireRole="parent">
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole="parent">
      <Layout>
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">{t('parentDashboard.title')}</h1>
                  <p className="text-muted-foreground">
                    {t('parentDashboard.welcome', { name: user?.full_name || t('auth.parent') })} {t('parentDashboard.overview')}
                  </p>
                </div>
              </div>
            </div>

            {/* No Children Linked */}
            {students.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('parentDashboard.noLinkedStudents')}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    {t('parentDashboard.noLinkedDescription', { email: user?.email || '' })}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Child Switcher */}
            {students.length > 0 && (
              <ChildSwitcher
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            )}

            {/* Dashboard Content */}
            {selectedStudent && dashboardData && (
              <>
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-pastel-mint/20 to-pastel-sky/20 border-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('parentDashboard.learningProfile')}</CardTitle>
                      <Brain className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardData.stats.learningProfileStatus === 'completed' ? (
                          <span className="text-green-600">{t('parentDashboard.learningProfileStatus.completed')}</span>
                        ) : (
                          <span className="text-orange-600">{t('parentDashboard.learningProfileStatus.pending')}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardData.stats.learningProfileStatus === 'completed' 
                          ? t('parentDashboard.learningProfileStatus.ready')
                          : t('parentDashboard.learningProfileStatus.getStarted')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-pastel-lavender/20 to-pastel-coral/20 border-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('parentDashboard.activities')}</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.activitiesCompleted}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardData.stats.activitiesCompleted === 1 
                          ? t('parentDashboard.activitiesCompleted', { count: dashboardData.stats.activitiesCompleted })
                          : t('parentDashboard.activitiesCompleted_plural', { count: dashboardData.stats.activitiesCompleted })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-pastel-sky/20 to-pastel-mint/20 border-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('parentDashboard.recommendations')}</CardTitle>
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.recommendationsAvailable}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('parentDashboard.availableStrategies')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Learning Profile Summary */}
                {dashboardData.learningProfile?.hasAssessment ? (
                  <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 border-purple-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        {t('parentDashboard.learningProfileSummary')}
                      </CardTitle>
                      <CardDescription>
                        {t('parentDashboard.lastUpdated', { 
                          date: dashboardData.learningProfile.lastAssessmentDate 
                            ? new Date(dashboardData.learningProfile.lastAssessmentDate).toLocaleDateString()
                            : t('parentDashboard.recently')
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {dashboardData.learningProfile.profileSummary && (
                        <p className="text-sm leading-relaxed text-foreground">
                          {dashboardData.learningProfile.profileSummary}
                        </p>
                      )}
                      
                      {dashboardData.learningProfile.primaryStrengths && dashboardData.learningProfile.primaryStrengths.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            {t('parentDashboard.strengths')}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {dashboardData.learningProfile.primaryStrengths.map((strength, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                                {strength}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {dashboardData.learningProfile.areasForSupport && dashboardData.learningProfile.areasForSupport.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Heart className="w-4 h-4 text-blue-600" />
                            {t('parentDashboard.areasForSupport')}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {dashboardData.learningProfile.areasForSupport.map((area, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-800">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => router.push(`/parent/learning-snapshot/${selectedStudentId}`)}
                        variant="outline"
                        className="w-full"
                      >
                        {t('parentDashboard.viewSnapshot')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        {t('parentLearningSnapshot.title')}
                      </CardTitle>
                      <CardDescription>
                        {t('parentLearningSnapshot.completeSnapshot')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('parentLearningSnapshot.completeSnapshot')}
                      </p>
                      <Button
                        onClick={() => router.push(`/parent/cognitive-assessment/${selectedStudentId}`)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        {t('parentLearningSnapshot.startSnapshot')}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push('/parent-guide')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-600" />
                        {t('parentDashboard.supportStrategies')}
                      </CardTitle>
                      <CardDescription>
                        {t('parentDashboard.strategiesDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('parentDashboard.strategiesDescription')}
                      </p>
                      <Button variant="outline" className="w-full">
                        {t('parentDashboard.viewStrategies')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push('/parent/activities')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        {t('parentDashboard.dailyActivities')}
                      </CardTitle>
                      <CardDescription>
                        {t('parentDashboard.activitiesDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('parentDashboard.activitiesDescription')}
                      </p>
                      <Button variant="outline" className="w-full">
                        {t('parentDashboard.viewActivities')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50"
                    onClick={() => router.push('/parent/challenges')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        {t('parentDashboard.challenges')}
                      </CardTitle>
                      <CardDescription>
                        {t('parentDashboard.challengesDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('parentDashboard.challengesDescription')}
                      </p>
                      <Button variant="outline" className="w-full">
                        {t('parentDashboard.viewChallenges')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity Feed (Placeholder) */}
                {dashboardData.recentActivities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('parentDashboard.dailyActivities')}</CardTitle>
                      <CardDescription>{t('parentDashboard.activitiesDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t('common.loading')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

