'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  ArrowRight,
  AlertCircle,
  Users
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentsForParent, StudentWithClass } from "@/services/student-service";
import { useToast } from "@/hooks/use-toast";
import ChildSwitcher from "@/components/ChildSwitcher";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";

/**
 * Parent Learning Snapshot Index Page
 * 
 * Displays a list of linked students and allows parents to select
 * a child to view their learning snapshot.
 * 
 * @returns JSX.Element
 */
export default function LearningSnapshotIndexPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
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
        logger.error('Error loading students:', error);
        toast({
          title: t('errors.error'),
          description: t('parentDashboard.noLinkedStudents'),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadStudents();
  }, [user?.email, toast, t]);

  const handleViewSnapshot = () => {
    if (!selectedStudentId) {
      toast({
        title: t('errors.validation'),
        description: t('parentLearningSnapshot.selectStudent'),
        variant: "destructive",
      });
      return;
    }

    router.push(`/parent/learning-snapshot/${selectedStudentId}`);
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireRole="parent">
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('common.loading')}</p>
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">{t('parentLearningSnapshot.title')}</h1>
                  <p className="text-muted-foreground">
                    {t('parentLearningSnapshot.description')}
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
                  <Button
                    onClick={() => router.push('/parent-dashboard')}
                    variant="outline"
                  >
                    {t('parentLearningSnapshot.backToDashboard')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Child Selection */}
            {students.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      {t('parentLearningSnapshot.selectChild')}
                    </CardTitle>
                    <CardDescription>
                      {t('parentLearningSnapshot.selectChildDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChildSwitcher
                      students={students}
                      selectedStudentId={selectedStudentId}
                      onSelectStudent={setSelectedStudentId}
                    />
                  </CardContent>
                </Card>

                {/* View Snapshot Button */}
                {selectedStudentId && (
                  <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 border-purple-200">
                    <CardContent className="pt-6">
                      <Button
                        onClick={handleViewSnapshot}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-lg py-6"
                        size="lg"
                      >
                        <Brain className="w-5 h-5 mr-2" />
                        {t('parentLearningSnapshot.viewSnapshot')}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Info Card */}
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      {t('parentLearningSnapshot.aboutSnapshot')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('parentLearningSnapshot.snapshotDescription')}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

