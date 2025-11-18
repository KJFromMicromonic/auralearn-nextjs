import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { supabaseAnon } from "@/lib/supabase-anon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { generateAssessmentQuestions } from "@/services/mistralai-assessment-generator";
import { SubjectType, GradeLevelType } from "@/contexts/AuthContext";
import { 
  validateAssessmentToken, 
  markTokenAsUsed, 
  logAssessmentAccess 
} from "@/services/assessment-token-service";

interface Question {
  id: string;
  category: string;
  difficulty_level: number;
  question?: string;
  base_question?: string;
  options: { value: string; label: string }[];
  correct_answer: string;
  explanation: string;
}

interface Answer {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  time_taken: number;
}

interface AssessmentResult {
  score: number;
  total_questions: number;
  category_determined: string;
  confidence_score: number;
  time_taken: number;
}

const StudentAssessment = () => {
  const { classId, studentId, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const [student, setStudent] = useState<{ id: string; name: string; primary_category?: string } | null>(null);
  const [accessMethod, setAccessMethod] = useState<'token' | 'manual_selection'>('manual_selection');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const loadStudentByToken = useCallback(async () => {
    setIsLoading(true);
    setAccessMethod('token');

    try {
      // Validate token
      const validation = await validateAssessmentToken(token!);

      if (!validation.valid) {
        setTokenError(validation.errorMessage || 'Invalid or expired token');
        setIsLoading(false);
        return;
      }

      // Mark token as used
      await markTokenAsUsed(token!);

      // Log access
      await logAssessmentAccess(
        validation.studentId!,
        validation.classId!,
        'token',
        token
      );

      // Load student info
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, name, class_id, primary_category")
        .eq("id", validation.studentId)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      // Load questions based on student's profile
      await loadQuestionsForStudent(studentData);

    } catch (error: unknown) {
      console.error("Error loading assessment by token:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load assessment";
      setTokenError(errorMessage);
      setIsLoading(false);
    }
  }, [token, toast, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStudentAndQuestions = useCallback(async () => {
    setIsLoading(true);
    setAccessMethod('manual_selection');

    try {
      // Log manual access
      await logAssessmentAccess(
        studentId!,
        classId!,
        'manual_selection'
      );

      // Load student info
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, name, class_id, primary_category")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      // Load questions
      await loadQuestionsForStudent(studentData);

    } catch (error: unknown) {
      console.error("Error loading assessment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load assessment. Please try again.";
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [classId, studentId, toast, t]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (token) {
      // Token-based access
      loadStudentByToken();
    } else if (classId && studentId) {
      // Manual selection access
      loadStudentAndQuestions();
    }
  }, [token, classId, studentId, loadStudentByToken, loadStudentAndQuestions]);

  interface StudentDataForAssessment {
    id: string;
    name: string;
    class_id: string;
    primary_category: string | null;
  }

  const loadQuestionsForStudent = async (studentData: StudentDataForAssessment) => {
    try {

      // Load class info to get teacher
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("user_id")
        .eq("id", studentData.class_id)
        .single();

      if (classError) throw classError;

      // Load teacher profile to get subject and grade level
      // Try with clerk_id first, if not found, try with id
      let teacherData = null;
      
      const { data: teacherByClerkId, error: clerkError } = await supabase
        .from("users")
        .select("primary_subject, primary_grade_level")
        .eq("clerk_id", classData.user_id)
        .maybeSingle();

      if (teacherByClerkId) {
        teacherData = teacherByClerkId;
      } else {
        // Try with id field
        const { data: teacherById, error: idError } = await supabase
          .from("users")
          .select("primary_subject, primary_grade_level")
          .eq("id", classData.user_id)
          .maybeSingle();
        
        teacherData = teacherById;
      }

      // Set default values if teacher hasn't completed onboarding or not found
      const subject = (teacherData?.primary_subject || 'mathematiques') as SubjectType;
      const gradeLevel = (teacherData?.primary_grade_level || 'CM1') as GradeLevelType;

      // Generate questions using Gemini based on teacher's profile, user's language, and student's learning profile
      const language = i18n.language.startsWith('fr') ? 'fr' : 'en';
      
      console.log('Generating personalized assessment questions:', { 
        subject, 
        gradeLevel, 
        language,
        studentCategory: studentData.primary_category,
        accessMethod
      });

      const generatedQuestions = await generateAssessmentQuestions(
        {
          subject,
          gradeLevel,
          language: language as 'en' | 'fr',
          // Future: Add student profile for personalization
          // studentProfile: {
          //   primaryCategory: studentData.primary_category,
          // }
        },
        10
      );

      // Convert to Question format
      const formattedQuestions: Question[] = generatedQuestions.map(q => ({
        id: q.id,
        category: q.category,
        difficulty_level: q.difficulty_level,
        question: q.question,
        base_question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      }));

      setQuestions(formattedQuestions);
      
      toast({
        title: t('common.success'),
        description: accessMethod === 'token' 
          ? "Personalized assessment loaded successfully!" 
          : "Assessment questions generated successfully!",
      });
    } catch (error: unknown) {
      console.error("Error loading questions:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const startAssessment = () => {
    setAssessmentStarted(true);
    setStartTime(new Date());
    setQuestionStartTime(new Date());
  };

  const handleAnswerSelect = (value: string) => {
    setSelectedAnswer(value);
  };

  const handleNext = () => {
    if (!selectedAnswer) {
      toast({
        title: t('studentAssessment.selectAnswer'),
        description: "You must select an answer before continuing.",
        variant: "destructive",
      });
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;
    const timeTaken = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000);

    // Record answer
    const newAnswer: Answer = {
      question_id: currentQuestion.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      time_taken: timeTaken,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer("");
      setQuestionStartTime(new Date());
    } else {
      // Assessment complete
      submitAssessment(updatedAnswers);
    }
  };

  const calculateCategoryAndScore = (answers: Answer[]): { category: string; confidence: number } => {
    const correctCount = answers.filter(a => a.is_correct).length;
    const scorePercentage = (correctCount / answers.length) * 100;

    // Determine category based on score
    let category = "average_learner";
    let confidence = 0.5;

    if (scorePercentage >= 80) {
      category = "fast_processor";
      confidence = 0.85;
    } else if (scorePercentage >= 70) {
      category = "logical_learner";
      confidence = 0.75;
    } else if (scorePercentage >= 50) {
      category = "visual_learner";
      confidence = 0.65;
    } else if (scorePercentage >= 40) {
      category = "high_energy";
      confidence = 0.60;
    } else if (scorePercentage >= 30) {
      category = "needs_repetition";
      confidence = 0.70;
    } else {
      category = "slow_processing";
      confidence = 0.75;
    }

    // Adjust confidence based on answer consistency
    const avgTimeTaken = answers.reduce((sum, a) => sum + a.time_taken, 0) / answers.length;
    if (avgTimeTaken < 10) {
      confidence -= 0.1; // Too fast might indicate guessing
    } else if (avgTimeTaken > 60) {
      confidence -= 0.05; // Very slow might indicate uncertainty
    }

    return { category, confidence: Math.max(0.5, Math.min(1.0, confidence)) };
  };

  const submitAssessment = async (finalAnswers: Answer[]) => {
    setIsSubmitting(true);

    try {
      const totalTimeTaken = Math.floor((new Date().getTime() - (startTime?.getTime() || 0)) / 1000);
      const correctCount = finalAnswers.filter(a => a.is_correct).length;
      const { category, confidence } = calculateCategoryAndScore(finalAnswers);

      console.log('Submitting assessment:', {
        student_id: student?.id,
        score: correctCount,
        total_questions: questions.length,
        category_determined: category,
        confidence_score: confidence,
        time_taken: totalTimeTaken,
      });

      // Save to database using anonymous client (students are not authenticated)
      const { data: assessmentData, error: assessmentError } = await supabaseAnon
        .from("student_assessments")
        .insert({
          student_id: student?.id,
          questions_data: questions,
          answers: finalAnswers,
          score: correctCount,
          total_questions: questions.length,
          category_determined: category,
          confidence_score: confidence,
          time_taken: totalTimeTaken,
          started_at: startTime?.toISOString(),
          completed_at: new Date().toISOString(),
          needs_reassessment: false,
          next_assessment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single();

      if (assessmentError) {
        console.error("Database error details:", {
          message: assessmentError.message,
          details: assessmentError.details,
          hint: assessmentError.hint,
          code: assessmentError.code,
        });
        throw assessmentError;
      }

      console.log('Assessment saved successfully:', assessmentData);

      // Update student's primary category using anonymous client
      const { error: updateError } = await supabaseAnon
        .from("students")
        .update({ primary_category: category })
        .eq("id", student?.id);

      if (updateError) {
        console.warn("Failed to update student category:", updateError);
        // Don't throw - assessment is already saved
      }

      // Show results
      setResult({
        score: correctCount,
        total_questions: questions.length,
        category_determined: category,
        confidence_score: confidence,
        time_taken: totalTimeTaken,
      });
      setShowResult(true);

      toast({
        title: t('studentAssessment.completed'),
        description: `You scored ${correctCount} out of ${questions.length}. Great job!`,
      });
    } catch (error: unknown) {
      console.error("Error submitting assessment:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to submit assessment. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
          errorMessage = "Database permission error. Please contact your teacher.";
          console.error("RLS Policy Error - Student assessments table may need policy update");
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        }
      }
      
      // Check for database error codes (PostgreSQL)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        errorMessage = "This assessment has already been submitted.";
      }

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryDisplayName = (category: string): string => {
    return t(`dashboard.categories.${category}`);
  };

  // Token error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-900">Access Denied</CardTitle>
            <CardDescription className="text-base text-red-700">
              {tokenError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <p className="text-sm text-red-800">
                <strong>Possible reasons:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                <li>The assessment link has expired</li>
                <li>The link has already been used</li>
                <li>The link is invalid</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Please contact your teacher for a new assessment link.
            </p>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">
            {accessMethod === 'token' 
              ? 'Validating your personalized assessment...' 
              : t('studentAssessment.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (showResult && result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold">{t('studentAssessment.completed')}</CardTitle>
            <CardDescription className="text-lg">
              {t('studentAssessment.thankYou')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-1">{t('dashboard.score')}</p>
                <p className="text-3xl font-bold text-blue-600">
                  {result.score}/{result.total_questions}
                </p>
                <p className="text-sm text-gray-500">
                  {Math.round((result.score / result.total_questions) * 100)}%
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-1">Time Taken</p>
                <p className="text-3xl font-bold text-purple-600">
                  {Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Learning Profile</p>
              <p className="text-2xl font-bold text-gray-800 mb-2">
                {getCategoryDisplayName(result.category_determined)}
              </p>
              <div className="flex items-center gap-2">
                <Progress value={result.confidence_score * 100} className="flex-1" />
                <span className="text-sm font-medium text-gray-600">
                  {Math.round(result.confidence_score * 100)}% confidence
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm text-yellow-800">
                <strong>{t('studentAssessment.resultsAvailable')}</strong>
              </p>
            </div>

            {accessMethod === 'manual_selection' && (
              <Button
                onClick={() => navigate(`/student-selection/${classId}`)}
                className="w-full"
                size="lg"
              >
                {t('common.back')}
              </Button>
            )}
            {accessMethod === 'token' && (
              <Button
                onClick={() => navigate('/')}
                className="w-full"
                size="lg"
              >
                Go to Home
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assessmentStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold mb-2">Welcome, {student?.name}!</CardTitle>
            <CardDescription className="text-lg">
              You're about to start your learning assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg space-y-3">
              <h3 className="font-semibold text-lg text-blue-900">Assessment Guidelines:</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <Circle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>You will answer <strong>10 questions</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Circle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>Take your time and read each question carefully</span>
                </li>
                <li className="flex items-start gap-2">
                  <Circle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>There are no wrong answers - just do your best!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Circle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>Your teacher will use these results to help you learn better</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={startAssessment}
              className="w-full"
              size="lg"
              disabled={questions.length === 0}
            >
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const questionText = currentQuestion.question || currentQuestion.base_question || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              {t('studentAssessment.question', { current: currentQuestionIndex + 1, total: questions.length })}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {student?.name}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{questionText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect}>
              {currentQuestion.options?.map((option: { value: string; label: string }, index: number) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedAnswer === option.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handleAnswerSelect(option.value)}
                >
                  <RadioGroupItem value={option.value} id={`option-${index}`} />
                  <Label
                    htmlFor={`option-${index}`}
                    className="flex-1 cursor-pointer text-base"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleNext}
                disabled={!selectedAnswer || isSubmitting}
                className="flex-1"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('studentAssessment.submitting')}
                  </>
                ) : currentQuestionIndex === questions.length - 1 ? (
                  t('studentAssessment.finishAssessment')
                ) : (
                  t('studentAssessment.nextQuestion')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentAssessment;
