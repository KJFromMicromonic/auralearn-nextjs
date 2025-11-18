/**
 * Cognitive Assessment Management Page (Teacher Interface)
 * 
 * Similar to Academic Assessment, but for cognitive/learning profile assessments
 * Allows teachers to:
 * - Generate cognitive assessment links for students
 * - Preview the 15 cognitive questions
 * - Send parent assessment links
 * - View triangulation results
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Brain,
  Users,
  Copy,
  Eye,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Mail,
  User,
  Shield,
  Download,
  ExternalLink,
  Link2,
  Sparkles,
} from 'lucide-react';
import { generateCognitiveAssessment, type CognitiveQuestion } from '@/services/assessment-api-client';
import { 
  getClassStudentsWithTokens, 
  generateTokenAssessmentLink,
  regenerateAssessmentToken,
  type Student 
} from '@/services/assessment-token-service';
import { 
  generateTriangulationReport,
  type TriangulationReport,
  type AssessmentResult
} from '@/services/cognitive-assessment-service';

interface Class {
  id: string;
  name: string;
  grade_level: string | null;
  subject: string | null;
  student_count: number;
}

export default function CognitiveAssessment() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [generatingForClass, setGeneratingForClass] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<CognitiveQuestion[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [currentPreviewClass, setCurrentPreviewClass] = useState<Class | null>(null);
  const [selectedClassStudents, setSelectedClassStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<string | null>(null);
  const [regeneratingToken, setRegeneratingToken] = useState<string | null>(null);
  const [viewingResults, setViewingResults] = useState<string | null>(null); // student ID for viewing results
  const [triangulationReport, setTriangulationReport] = useState<TriangulationReport | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  const handleViewResults = async (studentId: string) => {
    setViewingResults(studentId);
    setLoadingResults(true);
    try {
      const report = await generateTriangulationReport(studentId);
      setTriangulationReport(report);
      // Open results dialog
      setShowResultsDialog(true);
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load assessment results. Make sure both student and parent assessments are completed.');
    } finally {
      setLoadingResults(false);
    }
  };

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: classesData, error: classError } = await supabase
        .from('classes')
        .select('id, name, grade_level, subject')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (classError) throw classError;

      const classesWithCounts = await Promise.all(
        (classesData || []).map(async (classItem) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id);

          return {
            ...classItem,
            student_count: count || 0,
          };
        })
      );

      setClasses(classesWithCounts);
    } catch (error: unknown) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadClasses();
    }
  }, [user?.id, loadClasses]);

  const loadStudentsForClass = async (classId: string) => {
    setLoadingStudents(classId);
    try {
      const students = await getClassStudentsWithTokens(classId);
      setSelectedClassStudents(students);
    } catch (error: unknown) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(null);
    }
  };

  const generateQuestionsPreview = async (classItem: Class) => {
    setGeneratingForClass(classItem.id);
    setCurrentPreviewClass(classItem);
    
    try {
      toast.info('Generating cognitive assessment questions...');

      // Ensure grade level is valid, default to CM1 if null or invalid
      const gradeLevel = (classItem.grade_level === 'CM1' || classItem.grade_level === 'CM2') 
        ? classItem.grade_level 
        : 'CM1';

      const assessment = await generateCognitiveAssessment('fr', gradeLevel as 'CM1' | 'CM2');
      setPreviewQuestions(assessment.questions);
      setShowPreviewDialog(true);
      
      toast.success('Cognitive questions generated successfully!');
    } catch (error: unknown) {
      console.error('Error generating questions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate questions. Please check your API key configuration.';
      toast.error(errorMessage);
    } finally {
      setGeneratingForClass(null);
    }
  };

  const regenerateQuestions = async () => {
    if (!currentPreviewClass) return;
    setShowPreviewDialog(false);
    await generateQuestionsPreview(currentPreviewClass);
  };

  const getClassWideLink = (classId: string): string => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}/student-selection/${classId}?type=cognitive`;
    }
    return '';
  };

  const getCognitiveTokenLink = (token: string): string => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}/cognitive-assessment/${token}`;
    }
    return '';
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRegenerateToken = async (studentId: string, studentName: string) => {
    setRegeneratingToken(studentId);
    try {
      const newToken = await regenerateAssessmentToken(studentId);
      if (newToken) {
        toast.success(`New token generated for ${studentName}`);
        if (selectedClassStudents.length > 0) {
          const classId = selectedClassStudents[0].class_id;
          await loadStudentsForClass(classId);
        }
      } else {
        toast.error('Failed to regenerate token');
      }
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast.error('Failed to regenerate token');
    } finally {
      setRegeneratingToken(null);
    }
  };

  const downloadStudentLinks = (classItem: Class, students: Student[]) => {
    const csv = [
      ['Student Name', 'Cognitive Assessment Link', 'Parent Email', 'Parent Email 2'].join(','),
      ...students.map(s => [
        s.name,
        getCognitiveTokenLink(s.assessment_token),
        s.parent_email || '',
        s.parent_email_2 || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classItem.name}-cognitive-assessment-links.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully!');
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireRole="teacher">
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Loading classes...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole="teacher">
      <Layout>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Brain className="w-10 h-10 text-primary" />
              AuraVoice 
            </h1>
            <p className="text-muted-foreground">
              Share cognitive assessment links with a Smart Voice Agent for students and parents - 15 questions across 6 validated cognitive domains
              
            </p>
          </div>

          {/* Info Banner */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Brain className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Research-Backed Cognitive Assessment</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>15 questions</strong> across 6 validated domains: Processing Speed, Working Memory, 
                    Attention & Focus, Learning Style, Self-Efficacy, and Motivation. Based on MSLQ, BRIEF-2, WISC-V, and UDL principles.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Triangulation:</strong> Students complete self-assessment, parents complete observation assessment, 
                    and results are triangulated to identify discrepancies and gain deeper insights.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {classes.length === 0 ? (
            <Card className="p-12 rounded-2xl text-center">
              <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-700 mb-2">No Classes Found</h3>
              <p className="text-gray-500 mb-6">
                Create a class first to start cognitive assessments
              </p>
              <Button onClick={() => router.push('/create-class')} size="lg">
                Create Your First Class
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6">
              {classes.map((classItem) => (
                <Card key={classItem.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">{classItem.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {classItem.grade_level && <span>{classItem.grade_level}</span>}
                          {classItem.grade_level && classItem.subject && <span> • </span>}
                          {classItem.subject && <span>{classItem.subject}</span>}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {classItem.student_count} {classItem.student_count === 1 ? 'student' : 'students'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Preview Questions Button */}
                    <Button
                      onClick={() => generateQuestionsPreview(classItem)}
                      disabled={generatingForClass === classItem.id}
                      className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      size="lg"
                    >
                      {generatingForClass === classItem.id ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating Questions...
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5 mr-2" />
                          Preview 15 Cognitive Questions
                        </>
                      )}
                    </Button>

                    {/* Tabs for Individual vs Class-Wide Links */}
                    <Tabs defaultValue="individual" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger 
                          value="individual"
                          onClick={() => {
                            if (selectedClassStudents.length === 0 || selectedClassStudents[0].class_id !== classItem.id) {
                              loadStudentsForClass(classItem.id);
                            }
                          }}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Individual Links (Secure)
                        </TabsTrigger>
                        <TabsTrigger value="classwide">
                          <Users className="w-4 h-4 mr-2" />
                          Class-Wide Link
                        </TabsTrigger>
                      </TabsList>

                      {/* Individual Student Links Tab */}
                      <TabsContent value="individual" className="space-y-4 mt-4">
                        {loadingStudents === classItem.id ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                          </div>
                        ) : selectedClassStudents.length > 0 && selectedClassStudents[0].class_id === classItem.id ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm text-muted-foreground">
                                Secure, personalized cognitive assessment links for each student
                              </p>
                              <Button
                                onClick={() => downloadStudentLinks(classItem, selectedClassStudents)}
                                variant="outline"
                                size="sm"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download CSV
                              </Button>
                            </div>
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-3">
                                {selectedClassStudents.map((student) => {
                                  const tokenLink = getCognitiveTokenLink(student.assessment_token);
                                  return (
                                    <Card key={student.id} className="p-4">
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                              <p className="font-semibold">{student.name}</p>
                                            </div>
                                          </div>
                                        </div>

                                        {student.parent_email && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="w-3 h-3" />
                                            <span>{student.parent_email}</span>
                                          </div>
                                        )}

                                        <div className="bg-secondary p-2 rounded text-xs break-all">
                                          {tokenLink}
                                        </div>

                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => copyToClipboard(tokenLink, student.name)}
                                            variant={copiedLink === tokenLink ? 'secondary' : 'default'}
                                            size="sm"
                                            className="flex-1"
                                          >
                                            <Copy className="w-3 h-3 mr-1" />
                                            {copiedLink === tokenLink ? 'Copied!' : 'Copy Link'}
                                          </Button>
                                          <Button
                                            onClick={() => handleRegenerateToken(student.id, student.name)}
                                            variant="outline"
                                            size="sm"
                                            disabled={regeneratingToken === student.id}
                                          >
                                            {regeneratingToken === student.id ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <RefreshCw className="w-3 h-3" />
                                            )}
                                          </Button>
                                          <Button
                                            onClick={() => handleViewResults(student.id)}
                                            variant="outline"
                                            size="sm"
                                            disabled={loadingResults}
                                            title="View Assessment Results"
                                          >
                                            {loadingResults && viewingResults === student.id ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <TrendingUp className="w-3 h-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            Click "Individual Links" tab to load student links
                          </div>
                        )}
                      </TabsContent>

                      {/* Class-Wide Link Tab */}
                      <TabsContent value="classwide" className="space-y-4 mt-4">
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-400 p-4 rounded">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Note:</strong> This link allows any student to select any name. 
                            Use individual links for better security and tracking.
                          </p>
                        </div>

                        <div className="p-4 bg-secondary rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Link2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Class-Wide Cognitive Assessment Link</span>
                          </div>
                          <code className="block text-sm bg-card p-3 rounded-lg border break-all">
                            {getClassWideLink(classItem.id)}
                          </code>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => copyToClipboard(getClassWideLink(classItem.id), 'Class link')}
                            className="flex-1 rounded-xl"
                            variant={copiedLink === getClassWideLink(classItem.id) ? 'secondary' : 'default'}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {copiedLink === getClassWideLink(classItem.id) ? 'Copied!' : 'Copy Link'}
                          </Button>
                          <Button
                            onClick={() => window.open(getClassWideLink(classItem.id), '_blank')}
                            variant="outline"
                            className="flex-1 rounded-xl"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Link
                          </Button>
                        </div>

                        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <p className="font-medium mb-1">How to use:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Copy the link above</li>
                            <li>Share with students/parents via email or LMS</li>
                            <li>Students complete self-assessment (15 questions)</li>
                            <li>Parents complete observation assessment</li>
                            <li>View triangulated results in Dashboard</li>
                          </ol>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={() => router.push('/create-class')} className="rounded-xl">
              Create New Class
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="rounded-xl">
              View Dashboard
            </Button>
          </div>
        </div>

        {/* Question Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                Cognitive Assessment Preview
              </DialogTitle>
              <DialogDescription>
                Preview of 15 questions for {currentPreviewClass?.name}. 
                Students and parents will see these questions when they take the assessment.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {previewQuestions.map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            Question {index + 1} - {question.domain.replace(/_/g, ' ').toUpperCase()}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            <strong>Student (FR):</strong> {question.student_fr}
                          </CardDescription>
                          <CardDescription className="mt-1">
                            <strong>Parent (FR):</strong> {question.parent_fr}
                          </CardDescription>
                        </div>
                        {question.reverse && (
                          <Badge variant="secondary">Reverse Scored</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>English (Student):</strong> {question.student_en}</p>
                        <p><strong>English (Parent):</strong> {question.parent_en}</p>
                        <p className="text-muted-foreground">
                          <strong>Research:</strong> {question.research_basis}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={regenerateQuestions}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate New Questions
              </Button>
              <Button
                onClick={() => setShowPreviewDialog(false)}
                className="flex-1"
              >
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Results Dialog */}
        <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                Assessment Results & Summary
              </DialogTitle>
              <DialogDescription>
                Triangulated cognitive assessment results comparing student self-perception and parent observation.
              </DialogDescription>
            </DialogHeader>
            
            {triangulationReport ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Triangulation Score */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Triangulation Score</CardTitle>
                      <CardDescription>
                        Agreement level between student and parent assessments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-purple-600">
                        {(triangulationReport.triangulation_score * 100).toFixed(1)}%
                      </div>
                      <Progress 
                        value={triangulationReport.triangulation_score * 100} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  {/* Domain Comparisons */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Domain Comparisons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {triangulationReport.domain_comparisons.map((comparison) => (
                          <div key={comparison.domain} className="border-l-4 border-purple-500 pl-4">
                            <h4 className="font-semibold capitalize">
                              {comparison.domain.replace(/_/g, ' ')}
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div>
                                <p className="text-sm text-muted-foreground">Student</p>
                                <p className="text-lg font-semibold">
                                  {comparison.student_score?.toFixed(1) || 'N/A'} / 5.0
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Parent</p>
                                <p className="text-lg font-semibold">
                                  {comparison.parent_score?.toFixed(1) || 'N/A'} / 5.0
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              Difference: {Math.abs((comparison.student_score || 0) - (comparison.parent_score || 0)).toFixed(1)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Insights */}
                  {triangulationReport.key_insights && triangulationReport.key_insights.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Key Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2">
                          {triangulationReport.key_insights.map((insight, idx) => (
                            <li key={idx} className="text-sm">{insight}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommended Actions */}
                  {triangulationReport.recommended_actions && triangulationReport.recommended_actions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Recommended Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2">
                          {triangulationReport.recommended_actions.map((action, idx) => (
                            <li key={idx} className="text-sm">{action}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Discrepancies */}
                  {triangulationReport.discrepancies && triangulationReport.discrepancies.length > 0 && (
                    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          Areas of Discrepancy
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2">
                          {triangulationReport.discrepancies.map((disc, idx) => (
                            <li key={idx} className="text-sm">
                              <strong className="capitalize">{disc.domain.replace(/_/g, ' ')}:</strong> Difference: {disc.difference.toFixed(1)}
                              <div className="mt-1 text-xs text-muted-foreground">
                                <div>Student perspective: {disc.student_perspective}</div>
                                <div>Parent perspective: {disc.parent_perspective}</div>
                                {disc.possible_reasons && disc.possible_reasons.length > 0 && (
                                  <div className="mt-1">
                                    Possible reasons: {disc.possible_reasons.join(', ')}
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading results...</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  );
}
