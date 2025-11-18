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

export default function ParentDashboardPage() {
  const { user, isParent } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
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
                  <h1 className="text-4xl font-bold text-foreground">Parent Dashboard</h1>
                  <p className="text-muted-foreground">
                    Welcome back, {user?.full_name || 'Parent'}! Here's an overview of your child's learning journey.
                  </p>
                </div>
              </div>
            </div>

            {/* No Children Linked */}
            {students.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Linked Students</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    Your email ({user?.email}) is not linked to any students yet. Please contact your child's teacher
                    to have your email added to their student profile.
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
                      <CardTitle className="text-sm font-medium">Learning Profile</CardTitle>
                      <Brain className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardData.stats.learningProfileStatus === 'completed' ? (
                          <span className="text-green-600">Completed</span>
                        ) : (
                          <span className="text-orange-600">Pending</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardData.stats.learningProfileStatus === 'completed' 
                          ? 'Profile ready' 
                          : 'Complete snapshot to get started'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-pastel-lavender/20 to-pastel-coral/20 border-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Activities</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.activitiesCompleted}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed {dashboardData.stats.activitiesCompleted === 1 ? 'activity' : 'activities'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-pastel-sky/20 to-pastel-mint/20 border-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.recommendationsAvailable}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Available strategies
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
                        Learning Profile Summary
                      </CardTitle>
                      <CardDescription>
                        Last updated: {dashboardData.learningProfile.lastAssessmentDate 
                          ? new Date(dashboardData.learningProfile.lastAssessmentDate).toLocaleDateString()
                          : 'Recently'}
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
                            Strengths
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
                            Areas for Support
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
                        View Full Learning Snapshot
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        Get Started with Learning Snapshot
                      </CardTitle>
                      <CardDescription>
                        Complete a quick assessment to understand your child's unique learning profile
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Our Learning Snapshot helps you understand how {selectedStudent.name} learns best. 
                        It takes about 10-15 minutes and provides personalized recommendations.
                      </p>
                      <Button
                        onClick={() => router.push(`/parent/cognitive-assessment/${selectedStudentId}`)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Start Learning Snapshot
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
                        Support Strategies
                      </CardTitle>
                      <CardDescription>
                        Get personalized strategies for supporting your child at home
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Access AI-generated strategies, activities, and resources tailored to your child's learning profile.
                      </p>
                      <Button variant="outline" className="w-full">
                        View Strategies
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push('/parent/activities')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Daily Activities
                      </CardTitle>
                      <CardDescription>
                        Find fun, educational activities to do at home
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Browse activities filtered by time, subject, and materials needed. Perfect for homework support and enrichment.
                      </p>
                      <Button variant="outline" className="w-full">
                        Browse Activities
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50"
                    onClick={() => router.push('/parent/challenges')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        Adaptability Challenges
                      </CardTitle>
                      <CardDescription>
                        Build flexibility and resilience through targeted challenges
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Weekly challenges designed to build cognitive flexibility, executive functions, and growth mindset.
                      </p>
                      <Button variant="outline" className="w-full">
                        View Challenges
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity Feed (Placeholder) */}
                {dashboardData.recentActivities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Your child's recent learning activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Activity tracking coming soon!
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

