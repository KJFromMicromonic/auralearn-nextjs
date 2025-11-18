import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, Calendar, FileText, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { prepareReportData, generatePDFReport } from "@/services/assessment-report-service";
import { generateAssessmentSummary, generateClassSummary } from "@/services/assessment-ai-summary";


interface StudentWithAssessment {
  id: string;
  name: string;
  primary_category: string | null;
  latest_score: number | null;
  latest_assessment_date: string | null;
  total_assessments: number;
  needs_reassessment: boolean;
  next_assessment_date: string | null;
  confidence_score: number | null;
  improvement_trend: "up" | "down" | "stable" | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentWithAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStudentAssessmentData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all classes for this teacher
      const { data: classes, error: classError } = await supabase
        .from("classes")
        .select("id")
        .eq("user_id", user?.id);

      if (classError) throw classError;

      if (!classes || classes.length === 0) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      const classIds = classes.map(c => c.id);

      // Get all students from teacher's classes with their latest assessment
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          name,
          primary_category,
          class_id
        `)
        .in("class_id", classIds)
        .order("name");

      if (studentsError) throw studentsError;

      // For each student, get their latest assessment and calculate stats
      const studentsWithData = await Promise.all(
        (studentsData || []).map(async (student) => {
          const { data: assessments } = await supabase
            .from("student_assessments")
            .select("*")
            .eq("student_id", student.id)
            .order("assessment_date", { ascending: false })
            .limit(2);

          const latestAssessment = assessments?.[0];
          const previousAssessment = assessments?.[1];

          let improvementTrend: "up" | "down" | "stable" | null = null;
          if (latestAssessment && previousAssessment) {
            if (latestAssessment.score > previousAssessment.score) {
              improvementTrend = "up";
            } else if (latestAssessment.score < previousAssessment.score) {
              improvementTrend = "down";
            } else {
              improvementTrend = "stable";
            }
          }

          return {
            id: student.id,
            name: student.name,
            primary_category: student.primary_category,
            latest_score: latestAssessment?.score || null,
            latest_assessment_date: latestAssessment?.assessment_date || null,
            total_assessments: assessments?.length || 0,
            needs_reassessment: latestAssessment?.needs_reassessment || false,
            next_assessment_date: latestAssessment?.next_assessment_date || null,
            confidence_score: latestAssessment?.confidence_score || null,
            improvement_trend: improvementTrend,
          };
        })
      );

      setStudents(studentsWithData);
    } catch (error: unknown) {
      console.error("Error loading student data:", error);
      toast({
        title: t('common.error'),
        description: t('errors.generic'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, t]);

  useEffect(() => {
    if (user?.id) {
      loadStudentAssessmentData();
    }
  }, [user?.id, loadStudentAssessmentData]);

  const getPerformanceLevel = (score: number | null, totalQuestions: number = 10): number => {
    if (!score) return 0;
    const percentage = (score / totalQuestions) * 100;
    if (percentage >= 80) return 5; // Advanced
    if (percentage >= 60) return 4; // On track
    if (percentage >= 40) return 3; // Needs attention
    if (percentage >= 20) return 2; // Struggling
    return 1; // Needs immediate help
  };

  const getPerformanceColor = (level: number): "struggling" | "attention" | "ontrack" | "advanced" | "unknown" => {
    if (level === 0) return "unknown";
    if (level <= 2) return "struggling";
    if (level === 3) return "attention";
    if (level === 4) return "ontrack";
    return "advanced";
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case "struggling": return "bg-level-struggling text-white";
      case "attention": return "bg-level-attention text-white";
      case "ontrack": return "bg-level-ontrack text-white";
      case "advanced": return "bg-level-advanced text-white";
      case "unknown": return "bg-gray-400 text-white";
      default: return "bg-muted";
    }
  };

  const getLevelIcon = (level: number) => {
    if (level <= 2) return <TrendingDown className="w-4 h-4" />;
    if (level <= 3) return <Minus className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  const getCategoryDisplayName = (category: string | null): string => {
    if (!category) return t('dashboard.categories.not_assessed');
    return t(`dashboard.categories.${category}`, category);
  };

  // Report generation functions
  const generateStudentReport = async (studentId: string, studentName: string) => {
    try {
      toast({
        title: t('dashboard.generatingReport'),
        description: t('dashboard.pleaseWait'),
      });

      // Get the latest assessment for this student
      const { data: assessments, error } = await supabase
        .from('student_assessments')
        .select('*')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!assessments || assessments.length === 0) {
        toast({
          title: t('dashboard.noAssessmentFound'),
          description: t('dashboard.studentNotAssessed'),
          variant: "destructive",
        });
        return;
      }

      const assessmentId = assessments[0].id;

      // Generate report data
      const reportData = await prepareReportData(assessmentId);
      if (!reportData) {
        throw new Error('Failed to prepare report data');
      }

      // Generate AI summary
      const aiSummary = await generateAssessmentSummary(reportData, {
        language: 'en', // TODO: Get from user preferences
        detailLevel: 'detailed',
        includeRecommendations: true,
      });

      reportData.aiSummary = aiSummary;

      // Generate PDF
      await generatePDFReport(reportData);

      toast({
        title: t('dashboard.reportGenerated'),
        description: t('dashboard.reportDownloaded', { name: studentName }),
      });
    } catch (error: unknown) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : t('errors.generic');
      toast({
        title: t('dashboard.reportGenerationFailed'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const generateClassReport = async () => {
    try {
      toast({
        title: t('dashboard.generatingClassReport'),
        description: t('dashboard.pleaseWait'),
      });

      // Get all assessments for the teacher's classes
      const { data: classes, error: classError } = await supabase
        .from("classes")
        .select("id, name")
        .eq("user_id", user?.id);

      if (classError) throw classError;

      if (!classes || classes.length === 0) {
        toast({
          title: t('dashboard.noClassesFound'),
          description: t('dashboard.createClassFirst'),
          variant: "destructive",
        });
        return;
      }

      const classIds = classes.map(c => c.id);
      const className = classes.length === 1 ? classes[0].name : 'All Classes';

      // Get recent assessments (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: assessments, error: assessmentError } = await supabase
        .from('student_assessments')
        .select(`
          *,
          students!inner (
            name,
            class_id
          )
        `)
        .in('students.class_id', classIds)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (assessmentError) throw assessmentError;

      if (!assessments || assessments.length === 0) {
        toast({
          title: t('dashboard.noRecentAssessments'),
          description: t('dashboard.noAssessmentsLast30Days'),
          variant: "destructive",
        });
        return;
      }

      // Generate class summary using AI
      const classSummary = await generateClassSummary(
        assessments,
        className,
        'en' // TODO: Get from user preferences
      );

      // Create a simple PDF with class summary
      const pdf = new (await import('jspdf')).default();
      let yPosition = 20;
      const lineHeight = 7;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Class Performance Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 2;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Class: ${className}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Report Period: Last 30 days`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Total Assessments: ${assessments.length}`, margin, yPosition);
      yPosition += lineHeight * 2;

      // Class statistics
      const totalScore = assessments.reduce((sum, a) => sum + a.score, 0);
      const totalQuestions = assessments.reduce((sum, a) => sum + a.total_questions, 0);
      const classAverage = ((totalScore / totalQuestions) * 100).toFixed(1);

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Class Statistics', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Average Score: ${classAverage}%`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Total Students Assessed: ${new Set(assessments.map(a => a.student_id)).size}`, margin, yPosition);
      yPosition += lineHeight * 2;

      // AI Summary
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Performance Analysis', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const summaryLines = pdf.splitTextToSize(classSummary, contentWidth);
      summaryLines.forEach((line: string) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });

      // Footer
      const date = new Date().toLocaleDateString();
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Generated on ${date}`, pageWidth / 2, 285, { align: 'center' });

      // Save
      const filename = `Class_Report_${className.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`;
      pdf.save(filename);

      toast({
        title: t('dashboard.classReportGenerated'),
        description: t('dashboard.classReportDownloaded'),
      });
    } catch (error: unknown) {
      console.error('Error generating class report:', error);
      const errorMessage = error instanceof Error ? error.message : t('errors.generic');
      toast({
        title: t('dashboard.classReportGenerationFailed'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">{t('dashboard.loadingStudents')}</p>
        </div>
      </div>
    );
  }

  const studentsWithLevels = students.map(s => ({
    ...s,
    level: getPerformanceLevel(s.latest_score),
    color: getPerformanceColor(getPerformanceLevel(s.latest_score))
  }));

  const stats = {
    struggling: studentsWithLevels.filter(s => s.level > 0 && s.level <= 2).length,
    attention: studentsWithLevels.filter(s => s.level === 3).length,
    ontrack: studentsWithLevels.filter(s => s.level === 4).length,
    advanced: studentsWithLevels.filter(s => s.level === 5).length,
    notAssessed: studentsWithLevels.filter(s => s.level === 0).length,
    avgScore: students.filter(s => s.latest_score !== null).length > 0
      ? Math.round(
          students
            .filter(s => s.latest_score !== null)
            .reduce((acc, s) => acc + (s.latest_score || 0), 0) /
          students.filter(s => s.latest_score !== null).length
        )
      : 0
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.description', { count: students.length })}</p>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <Card className="p-6 rounded-2xl bg-gradient-to-br from-level-struggling/10 to-white">
          <div className="text-3xl font-bold text-level-struggling mb-1">{stats.struggling}</div>
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.struggling')}</div>
        </Card>
        <Card className="p-6 rounded-2xl bg-gradient-to-br from-level-attention/10 to-white">
          <div className="text-3xl font-bold text-level-attention mb-1">{stats.attention}</div>
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.needsAttention')}</div>
        </Card>
        <Card className="p-6 rounded-2xl bg-gradient-to-br from-level-ontrack/10 to-white">
          <div className="text-3xl font-bold text-level-ontrack mb-1">{stats.ontrack}</div>
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.onTrack')}</div>
        </Card>
        <Card className="p-6 rounded-2xl bg-gradient-to-br from-level-advanced/10 to-white">
          <div className="text-3xl font-bold text-level-advanced mb-1">{stats.advanced}</div>
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.advanced')}</div>
        </Card>
        <Card className="p-6 rounded-2xl bg-gradient-to-br from-gray-200/50 to-white">
          <div className="text-3xl font-bold text-gray-600 mb-1">{stats.notAssessed}</div>
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.notAssessed')}</div>
        </Card>
        <Card className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-white">
          <div className="text-3xl font-bold text-primary mb-1">{stats.avgScore}{stats.avgScore > 0 ? '%' : ''}</div>
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.avgScore')}</div>
        </Card>
      </div>

      {studentsWithLevels.length === 0 ? (
        <Card className="p-12 rounded-2xl text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-700 mb-2">{t('dashboard.noStudents.title')}</h3>
          <p className="text-gray-500 mb-6">
            {t('dashboard.noStudents.description')}
          </p>
          <Button onClick={() => navigate("/create-class")} size="lg">
            {t('dashboard.noStudents.action')}
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-6 rounded-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">{t('dashboard.classHeatmap')}</h2>
            <div className="grid grid-cols-6 gap-3">
              {studentsWithLevels.map((student) => (
                <div
                  key={student.id}
                  onClick={() => navigate(`/student-guide/${student.id}`)}
                  className={`p-4 rounded-xl ${getColorClass(student.color)} shadow-sm hover:shadow-md transition-all cursor-pointer group relative`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-sm font-bold">
                      {student.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold truncate w-full">{student.name.split(" ")[0]}</div>
                      <div className="text-xs opacity-90">
                        {student.level === 0 ? t('dashboard.notTested') : `${t('dashboard.level')} ${student.level}`}
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs p-2">
                    <div className="font-bold mb-1">{student.name}</div>
                    {student.latest_score !== null ? (
                      <>
                        <div>{t('dashboard.score')}: {student.latest_score}/10</div>
                        <div>{t('dashboard.level')}: {student.level}/5</div>
                        <div className="mt-1">{getCategoryDisplayName(student.primary_category)}</div>
                      </>
                    ) : (
                      <div className="text-yellow-300">{t('dashboard.stats.notAssessed')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('dashboard.detailedStudentList')}</h2>
            <div className="space-y-2">
              {studentsWithLevels.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
                >
                  <div className={`w-12 h-12 rounded-full ${getColorClass(student.color)} flex items-center justify-center text-sm font-bold`}>
                    {student.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{student.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {getCategoryDisplayName(student.primary_category)}
                      {student.total_assessments > 0 && (
                        <span className="ml-2">• {student.total_assessments} {student.total_assessments > 1 ? t('dashboard.assessments_plural') : t('dashboard.assessments')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {student.latest_score !== null ? (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{student.latest_score}</div>
                          <div className="text-xs text-muted-foreground">{t('dashboard.score')}</div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card">
                          {student.improvement_trend === "up" && <TrendingUp className="w-4 h-4 text-green-600" />}
                          {student.improvement_trend === "down" && <TrendingDown className="w-4 h-4 text-red-600" />}
                          {student.improvement_trend === "stable" && <Minus className="w-4 h-4 text-gray-600" />}
                          <span className="text-sm font-medium">{t('dashboard.level')} {student.level}</span>
                        </div>
                        {student.needs_reassessment && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t('dashboard.reassessSoon')}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary">{t('dashboard.stats.notAssessed')}</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => navigate(`/student-guide/${student.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {t('dashboard.profile')}
                    </Button>
                    {student.latest_score !== null && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => generateStudentReport(student.id, student.name)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {t('dashboard.downloadReport')}
                      </Button>
                    )}

                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-end gap-4">
            <Button onClick={generateClassReport} size="lg" className="rounded-xl px-8">
              <FileText className="w-5 h-5 mr-2" />
              {t('dashboard.generateClassReport')}
            </Button>
            <Button onClick={() => navigate("/insights")} size="lg" className="rounded-xl px-8">
              {t('dashboard.viewClassInsights')}
            </Button>
          </div>

        </>
      )}
    </div>
  );
}
