'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  ArrowLeft, 
  TrendingUp, 
  Heart, 
  Target,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  GraduationCap
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { getLearningProfileSummary, LearningProfileSummary } from "@/services/parent-dashboard-service";
import { AssessmentResult, getAssessmentResult } from "@/services/learning-profile-service";
import { getStudentsForParent, StudentWithClass } from "@/services/student-service";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

export default function LearningSnapshotPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const studentId = params.studentId as string;
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [learningProfile, setLearningProfile] = useState<LearningProfileSummary | null>(null);
  const [student, setStudent] = useState<StudentWithClass | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!studentId || !user?.clerk_id || !user?.email) return;

      try {
        setIsLoading(true);
        
        // Load student information
        const students = await getStudentsForParent(user.email);
        const selectedStudent = students.find(s => s.id === studentId);
        if (selectedStudent) {
          setStudent(selectedStudent);
        }

        // Try to get full assessment result first
        const result = await getAssessmentResult(studentId, user.clerk_id);
        setAssessmentResult(result);

        // Also get learning profile summary (may have data even if full result doesn't)
        const profile = await getLearningProfileSummary(studentId, user.clerk_id);
        setLearningProfile(profile);
      } catch (error) {
        logger.error('Error loading learning snapshot data:', error);
        toast({
          title: t('errors.error'),
          description: t('errors.loadingFailed'),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [studentId, user?.clerk_id, user?.email, toast, t]);

  const getDomainDisplayName = (domain: string): string => {
    const names: Record<string, string> = {
      processing_speed: 'Processing Speed',
      working_memory: 'Working Memory',
      attention_focus: 'Attention & Focus',
      learning_style: 'Learning Style',
      self_efficacy: 'Self-Efficacy',
      motivation_engagement: 'Motivation & Engagement',
    };
    return names[domain] || domain;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 4.5) return 'Strong';
    if (score >= 3.5) return 'Good';
    if (score >= 2.5) return 'Developing';
    if (score >= 1.5) return 'Needs Support';
    return 'Needs Significant Support';
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireRole="parent">
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading learning snapshot...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Helper function to format category name
  const formatCategoryName = (category?: string): string => {
    if (!category) return '';
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Show student profile with learning profile summary if available, even if no full assessment result
  // Only show empty state if we have neither assessment result nor learning profile summary
  const hasProfileData = assessmentResult || learningProfile;
  
  if (!hasProfileData) {
    return (
      <ProtectedRoute requireRole="parent">
        <Layout>
          <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/parent/learning-snapshot')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('parentLearningSnapshot.backToDashboard')}
                </Button>
              </div>

              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-foreground">{t('parentLearningSnapshot.title')}</h1>
                    <p className="text-muted-foreground">
                      {student ? `${student.name}'s Learning Profile` : t('parentLearningSnapshot.description')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Information */}
              {student && (
                <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-600" />
                      {t('parentLearningSnapshot.studentInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t('parentLearningSnapshot.studentName')}</p>
                        <p className="text-lg font-semibold text-foreground">{student.name}</p>
                      </div>
                      {student.class_name && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {t('parentLearningSnapshot.class')}
                          </p>
                          <p className="text-lg font-semibold text-foreground">{student.class_name}</p>
                        </div>
                      )}
                    </div>

                    {/* Learning Categories */}
                    {(student.primary_category || student.secondary_category) && (
                      <div className="pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-3">{t('parentLearningSnapshot.learningCategories')}</p>
                        <div className="flex flex-wrap gap-2">
                          {student.primary_category && (
                            <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                              {formatCategoryName(student.primary_category)}
                            </Badge>
                          )}
                          {student.secondary_category && (
                            <Badge className="bg-pink-100 text-pink-800 text-sm px-3 py-1">
                              {formatCategoryName(student.secondary_category)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Learning Profile Summary (if available but no full assessment) */}
              {learningProfile && learningProfile.hasAssessment && (
                <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      {t('parentLearningSnapshot.profileSummary')}
                    </CardTitle>
                    <CardDescription>
                      {learningProfile.lastAssessmentDate && (
                        <span>{t('parentLearningSnapshot.lastUpdated')}: {new Date(learningProfile.lastAssessmentDate).toLocaleDateString()}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {learningProfile.profileSummary && (
                      <p className="text-sm leading-relaxed text-foreground">
                        {learningProfile.profileSummary}
                      </p>
                    )}
                    
                    {learningProfile.primaryStrengths && learningProfile.primaryStrengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          {t('parentDashboard.strengths')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {learningProfile.primaryStrengths.map((strength, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {learningProfile.areasForSupport && learningProfile.areasForSupport.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-blue-600" />
                          {t('parentDashboard.areasForSupport')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {learningProfile.areasForSupport.map((area, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-800">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* No Detailed Assessment Message (only if no learning profile summary) */}
              {!learningProfile && (
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-purple-600" />
                      {t('parentLearningSnapshot.detailedProfilePending')}
                    </CardTitle>
                    <CardDescription>
                      {t('parentLearningSnapshot.detailedProfileDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('parentLearningSnapshot.detailedProfileInfo')}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/parent-dashboard')}
                      className="w-full"
                    >
                      {t('parentLearningSnapshot.backToDashboard')}
                    </Button>
                  </CardContent>
                </Card>
              )}
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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/parent/learning-snapshot')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('parentLearningSnapshot.backToDashboard')}
              </Button>
            </div>

            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">{t('parentLearningSnapshot.title')}</h1>
                  <p className="text-muted-foreground">
                    {student ? `${student.name}'s Learning Profile` : t('parentLearningSnapshot.description')}
                  </p>
                </div>
              </div>
              {assessmentResult && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{t('parentLearningSnapshot.lastUpdated')}: {new Date(assessmentResult.calculated_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Student Basic Info */}
            {student && (
              <Card className="bg-gradient-to-br from-purple-50/30 to-pink-50/30 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="w-4 h-4 text-purple-600" />
                    {t('parentLearningSnapshot.studentInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {student.class_name && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('parentLearningSnapshot.class')}:</span>
                        <span className="font-medium">{student.class_name}</span>
                      </div>
                    )}
                    {(student.primary_category || student.secondary_category) && (
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('parentLearningSnapshot.learningCategories')}:</span>
                        <div className="flex gap-1">
                          {student.primary_category && (
                            <Badge variant="secondary" className="text-xs">
                              {formatCategoryName(student.primary_category)}
                            </Badge>
                          )}
                          {student.secondary_category && (
                            <Badge variant="secondary" className="text-xs">
                              {formatCategoryName(student.secondary_category)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall Summary */}
            <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Profile Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{assessmentResult.profile_summary}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Overall Score</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${getScoreColor(assessmentResult.overall_score)}`}>
                        {assessmentResult.overall_score.toFixed(1)}
                      </span>
                      <Badge variant="secondary">{getScoreLabel(assessmentResult.overall_score)}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Confidence</p>
                    <div className="flex items-center gap-2">
                      <Progress value={assessmentResult.confidence_score * 100} className="flex-1" />
                      <span className="text-sm font-medium">
                        {(assessmentResult.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Assessment Type</p>
                    <Badge variant="outline" className="capitalize">
                      {assessmentResult.assessment_type}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Domain Scores */}
            <Tabs defaultValue="domains" className="w-full">
              <TabsList>
                <TabsTrigger value="domains">Domain Scores</TabsTrigger>
                <TabsTrigger value="strengths">Strengths</TabsTrigger>
                <TabsTrigger value="support">Areas for Support</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="domains" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(assessmentResult.domain_scores).map(([domain, score]) => (
                    <Card key={domain}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{getDomainDisplayName(domain)}</CardTitle>
                          <Badge className={getScoreColor(score)}>
                            {score.toFixed(1)}/5.0
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Progress value={(score / 5) * 100} className="mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {getScoreLabel(score)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="strengths" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Primary Strengths
                    </CardTitle>
                    <CardDescription>
                      Areas where your child shows strong performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assessmentResult.strengths && assessmentResult.strengths.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assessmentResult.strengths.map((strength, idx) => (
                          <Badge key={idx} className="bg-green-100 text-green-800 text-sm px-3 py-1">
                            {getDomainDisplayName(strength)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific strengths identified yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="support" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-blue-600" />
                      Areas for Support
                    </CardTitle>
                    <CardDescription>
                      Areas where your child may benefit from additional support
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assessmentResult.areas_for_support && assessmentResult.areas_for_support.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assessmentResult.areas_for_support.map((area, idx) => (
                          <Badge key={idx} className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                            {getDomainDisplayName(area)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific support areas identified.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Next Steps
                    </CardTitle>
                    <CardDescription>
                      Recommended actions based on this learning snapshot
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Explore Support Strategies</p>
                          <p className="text-xs text-muted-foreground">
                            Get personalized strategies tailored to your child's learning profile
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => router.push('/parent-guide')}
                          >
                            View Strategies
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Try Adaptability Challenges</p>
                          <p className="text-xs text-muted-foreground">
                            Build flexibility and resilience through targeted challenges
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => router.push('/parent/challenges')}
                          >
                            View Challenges
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Browse Daily Activities</p>
                          <p className="text-xs text-muted-foreground">
                            Find activities that match your child's learning needs
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => router.push('/parent/activities')}
                          >
                            Browse Activities
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                onClick={() => router.push('/parent-dashboard')}
              >
                {t('parentLearningSnapshot.backToDashboard')}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
