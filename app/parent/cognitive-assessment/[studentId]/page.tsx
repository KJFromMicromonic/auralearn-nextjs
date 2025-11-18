/**
 * Parent Cognitive Assessment Page
 * 
 * Cognitive assessment accessible from parent portal
 * Student ID is resolved from parent's selected child (no token needed)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getEnvVar } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Brain,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mic,
  Type,
} from 'lucide-react';
import { submitResponse, completeAssessment } from '@/services/learning-profile-service';
import type { CognitiveQuestion } from '@/services/gemini-cognitive-generator';
import { 
  getLiveKitToken, 
  connectToLiveKitRoom, 
  setupRoomHandlers,
  dispatchAuraVoiceAgent
} from '@/services/livekit-service';
import { 
  generateAgentJWT, 
  postJWTToAgentWorker 
} from '@/services/agent-jwt-service';
import { Room, Track } from 'livekit-client';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentsForParent, StudentWithClass } from '@/services/student-service';
import ChildSwitcher from '@/components/ChildSwitcher';

interface AssessmentSession {
  id: string;
  student_id: string;
  student_name: string;
  questions: CognitiveQuestion[];
  language: 'en' | 'fr';
}

const LIKERT_SCALE_FR = [
  { value: 1, label: 'Pas du tout comme moi', emoji: '😟' },
  { value: 2, label: 'Un peu comme moi', emoji: '😐' },
  { value: 3, label: 'Parfois comme moi', emoji: '🙂' },
  { value: 4, label: 'Souvent comme moi', emoji: '😊' },
  { value: 5, label: 'Exactement comme moi', emoji: '😄' },
];

const LIKERT_SCALE_EN = [
  { value: 1, label: 'Not at all like me', emoji: '😟' },
  { value: 2, label: 'A bit like me', emoji: '😐' },
  { value: 3, label: 'Sometimes like me', emoji: '🙂' },
  { value: 4, label: 'Mostly like me', emoji: '😊' },
  { value: 5, label: 'Exactly like me', emoji: '😄' },
];

export default function ParentCognitiveAssessment() {
  const params = useParams();
  const urlStudentId = params?.studentId as string | undefined;
  const router = useRouter();
  const { user, isParent } = useAuth();
  
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [assessmentType, setAssessmentType] = useState<'student' | 'parent'>('parent'); // Default to parent assessment
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const [liveKitRoom, setLiveKitRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAgentConnected, setIsAgentConnected] = useState(false);

  // Load students for parent
  useEffect(() => {
    async function loadStudents() {
      if (!user?.email || !isParent) {
        toast.error('Parent access required');
        router.push('/parent-guide');
        return;
      }

      try {
        const linkedStudents = await getStudentsForParent(user.email);
        setStudents(linkedStudents);

        // Determine selected student: URL param > auto-select single child
        if (urlStudentId) {
          setSelectedStudentId(urlStudentId);
        } else if (linkedStudents.length === 1) {
          setSelectedStudentId(linkedStudents[0].id);
        } else if (linkedStudents.length > 1) {
          // Multiple children - require selection
          toast.info('Please select a child to start the assessment');
        } else {
          toast.error('No linked students found');
          router.push('/parent-guide');
        }
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load students');
        router.push('/parent-guide');
      }
    }

    loadStudents();
  }, [user?.email, isParent, urlStudentId, router]);

  const loadAssessmentSession = useCallback(async () => {
    if (!selectedStudentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Loading ${assessmentType} assessment for student:`, selectedStudentId);
      
      // Get student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, classes(grade_level)')
        .eq('id', selectedStudentId)
        .single();

      if (studentError) {
        console.error('Student lookup error:', studentError);
        toast.error(`Student not found: ${studentError.message}`);
        setSession(null);
        setIsLoading(false);
        return;
      }

      console.log('Student found:', studentData);

      // Check if questions already exist for this student (can be reused for both student and parent assessments)
      const { data: existingQuestions, error: questionsError } = await supabase
        .from('learning_profile_questions')
        .select('*')
        .eq('student_id', selectedStudentId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let questionsId: string;
      let questions: CognitiveQuestion[];

      if (existingQuestions && !questionsError) {
        // Use existing questions
        questionsId = existingQuestions.id;
        questions = existingQuestions.questions as CognitiveQuestion[];
        console.log('Using existing questions for student:', selectedStudentId);
      } else {
              // Generate new questions using API route
              console.log('Generating new cognitive assessment questions...');
              const { generateCognitiveAssessment } = await import('@/services/assessment-api-client');
              const assessment = await generateCognitiveAssessment(
          'fr',
          (studentData.classes?.grade_level as 'CM1' | 'CM2') || 'CM1'
        );
        questions = assessment.questions;

        // Save questions to learning_profile_questions table
        const { data: questionsRecord, error: questionsInsertError } = await supabase
          .from('learning_profile_questions')
          .insert({
            student_id: selectedStudentId,
            questions: questions,
            generation_metadata: {
              language: 'fr',
              grade_level: studentData.classes?.grade_level || 'CM1',
              generated_by: 'gemini-2.0-flash-exp',
              generated_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (questionsInsertError) {
          console.error('Error saving questions:', questionsInsertError);
          throw questionsInsertError;
        }

        questionsId = questionsRecord.id;
        console.log('Questions saved:', questionsId);
      }

      // Check if assessment already exists for this student (student or parent type)
      const { data: existingAssessments, error: assessmentError } = await supabase
        .from('learning_profiles')
        .select('*')
        .eq('student_id', selectedStudentId)
        .eq('assessment_type', assessmentType)  // Use the selected assessment type
        .eq('questions_id', questionsId)  // Use the same questions set
        .order('created_at', { ascending: false })
        .limit(1);

      if (assessmentError) {
        console.error('Assessment lookup error:', assessmentError);
      }

      console.log('Existing assessments:', existingAssessments);

      let assessmentId: string;

      if (existingAssessments && existingAssessments.length > 0) {
        // Use existing assessment
        const existing = existingAssessments[0];
        assessmentId = existing.id;
        console.log(`Using existing ${assessmentType} assessment:`, assessmentId);
      } else {
        // Create new assessment (student or parent type)
        const { data: newAssessment, error: createError } = await supabase
          .from('learning_profiles')
          .insert({
            student_id: selectedStudentId,
            questions_id: questionsId,  // Reference to the questions set
            assessment_type: assessmentType,  // Use the selected assessment type
            language: 'fr',
            status: 'in_progress'
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        assessmentId = newAssessment.id;
        console.log(`Created new ${assessmentType} assessment:`, assessmentId);
      }

      // Determine language preference (default to French for CM1/CM2)
      const language: 'en' | 'fr' = 'fr';

      if (!questions || questions.length === 0) {
        throw new Error('No questions available for assessment');
      }

      setSession({
        id: assessmentId,
        student_id: selectedStudentId,
        student_name: studentData.name,
        questions,
        language,
      });

      // Load existing responses if any
      const { data: existingResponses } = await supabase
        .from('learning_profile_responses')
        .select('question_id, response_value')
        .eq('assessment_id', assessmentId);

      if (existingResponses) {
        const responseMap: Record<number, number> = {};
        existingResponses.forEach((r) => {
          responseMap[r.question_id] = r.response_value;
        });
        setResponses(responseMap);
        
        // Set current question to first unanswered
        const unansweredIndex = questions.findIndex((_, idx) => !responseMap[idx + 1]);
        if (unansweredIndex >= 0) {
          setCurrentQuestionIndex(unansweredIndex);
        } else {
          setIsComplete(true);
        }
      }
    } catch (error) {
      console.error('Error loading assessment:', error);
      toast.error('Failed to load assessment');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudentId, assessmentType]);

  useEffect(() => {
    loadAssessmentSession();
  }, [loadAssessmentSession]);

  const handleStartVoiceSession = async () => {
    if (!session || !selectedStudentId) {
      toast.error('Session not loaded');
      return;
    }

    setIsConnecting(true);
    try {
      // Generate unique room name dynamically for this session
      const roomName = `aura-${selectedStudentId}-${Date.now()}`;
      
      // Get LiveKit server URL from environment or config
      const liveKitUrl = getEnvVar('VITE_LIVEKIT_URL', 'ws://localhost:7880');
      
      const parentId = user?.id;  // Get parent ID from auth context
      const language = 'fr'; // Could be dynamic based on user preference
      const gradeLevel = 'CM1'; // Could be dynamic based on student
      
      // Generate token (without RoomConfiguration - agent will be dispatched manually)
      toast.info('Generating secure connection token...');
      const agentTokenResponse = await generateAgentJWT(
        selectedStudentId,
        parentId || selectedStudentId, // Use parent_id as user_id if available
        roomName,
        language,
        gradeLevel,
        session?.id, // assessment_id
        parentId  // Pass parent_id explicitly for Parent Portal flow
      );
      
      // Extract token and metadata from response
      const token = agentTokenResponse.token;
      let wsUrl = agentTokenResponse.wsUrl || liveKitUrl;
      const metadata = agentTokenResponse.metadata;
      
      // Validate and ensure WebSocket URL format
      if (!wsUrl) {
        throw new Error('LiveKit WebSocket URL is not configured');
      }
      
      // Ensure URL is a WebSocket URL (ws:// or wss://)
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        // If it's an HTTP URL, convert to WebSocket
        if (wsUrl.startsWith('http://')) {
          wsUrl = wsUrl.replace('http://', 'ws://');
        } else if (wsUrl.startsWith('https://')) {
          wsUrl = wsUrl.replace('https://', 'wss://');
        } else {
          // Assume it's a hostname, prepend ws://
          wsUrl = `ws://${wsUrl}`;
        }
      }
      
      console.log('🔗 Connecting to LiveKit:', { wsUrl, roomName });
      
      // Connect to LiveKit room
      toast.info('Connecting to room...');
      const room = await connectToLiveKitRoom(wsUrl, token, roomName);
      
      // Setup event handlers
      setupRoomHandlers(
        room,
        (track, publication, participant) => {
          // Handle audio track from agent
          if (track.kind === Track.Kind.Audio) {
            const audioElement = track.attach();
            document.body.appendChild(audioElement);
            setIsAgentConnected(true);
            toast.success('AuraVoice connected!');
          }
        },
        () => {
          setIsAgentConnected(false);
          toast.info('Disconnected from AuraVoice');
        }
      );

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      
      // Dispatch agent manually after successful connection
      toast.info('Dispatching AuraVoice agent...');
      try {
        await dispatchAuraVoiceAgent({
          room_name: roomName,
          parent_id: parentId,
          student_id: selectedStudentId,
          questions: metadata?.questions,
          language: metadata?.language || language,
          grade_level: metadata?.grade_level || gradeLevel,
          assessment_id: metadata?.assessment_id || session?.id,
        });
        console.log('✅ Agent dispatch initiated');
      } catch (dispatchError) {
        console.error('⚠️ Failed to dispatch agent:', dispatchError);
        // Continue anyway - agent might connect manually in dev mode
        toast.warning('Agent dispatch may need manual start in dev mode');
      }
      
      setLiveKitRoom(room);
      toast.success('Connected to AuraVoice!');
      
    } catch (error) {
      console.error('Error starting voice session:', error);
      toast.error(`Failed to start voice session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectVoice = async () => {
    if (liveKitRoom) {
      liveKitRoom.disconnect();
      setLiveKitRoom(null);
      setIsAgentConnected(false);
    }
  };

  const handleResponse = (value: number) => {
    setResponses((prev) => ({
      ...prev,
      [currentQuestionIndex + 1]: value,
    }));
  };

  const handleNext = async () => {
    if (!session) return;

    const currentQuestion = session.questions[currentQuestionIndex];
    const responseValue = responses[currentQuestionIndex + 1];

    if (!responseValue) {
      toast.error('Please select an answer');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitResponse(session.id, {
        question_id: currentQuestionIndex + 1,
        response_value: responseValue,
        domain: currentQuestion.domain,
      });
      
      if (currentQuestionIndex < session.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        await handleComplete();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to save response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleComplete = async () => {
    if (!session) return;

    setIsSubmitting(true);
    try {
      await completeAssessment(session.id);
      setIsComplete(true);
      toast.success('Assessment completed!');
    } catch (error) {
      console.error('Error completing assessment:', error);
      toast.error('Failed to complete assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
    };
  }, [liveKitRoom]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const currentQuestion = session?.questions[currentQuestionIndex];
  const likertScale = session?.language === 'fr' ? LIKERT_SCALE_FR : LIKERT_SCALE_EN;
  const progress = session ? ((currentQuestionIndex + 1) / session.questions.length) * 100 : 0;

  if (!isParent) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>This page is only accessible to parents.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!selectedStudentId || students.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Child</CardTitle>
            <CardDescription>Please select a child to start the cognitive assessment.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChildSwitcher
              students={students}
              selectedStudentId={selectedStudentId}
              onSelectStudent={(studentId) => {
                setSelectedStudentId(studentId);
                router.push(`/parent/cognitive-assessment/${studentId}`);
              }}
            />
            <Button onClick={() => router.push('/parent-guide')} variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Parent Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              Assessment Complete!
            </CardTitle>
            <CardDescription>
              Thank you for completing the cognitive assessment for {selectedStudent?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/parent-guide')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Parent Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !currentQuestion) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Not Found</CardTitle>
            <CardDescription>Unable to load the assessment session.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/parent-guide')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Parent Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-500" />
              Cognitive Assessment
            </h1>
            <p className="text-muted-foreground mt-1">
              For {selectedStudent?.name} {selectedStudent?.class_name ? `(${selectedStudent.class_name})` : ''}
            </p>
          </div>
          {students.length > 1 && (
            <ChildSwitcher
              students={students}
              selectedStudentId={selectedStudentId}
              onSelectStudent={(studentId) => {
                setSelectedStudentId(studentId);
                router.push(`/parent/cognitive-assessment/${studentId}`);
              }}
            />
          )}
        </div>
        
        {/* Assessment Type Selector */}
        <div className="mb-4">
          <Tabs value={assessmentType} onValueChange={(value) => setAssessmentType(value as 'student' | 'parent')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="parent">
                Parent Assessment
              </TabsTrigger>
              <TabsTrigger value="student">
                Student Assessment
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Progress value={progress} className="mb-4" />
        <p className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {session.questions.length}
        </p>
      </div>

      {/* Voice Mode Toggle */}
      {!useVoice && !liveKitRoom && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Voice Assessment Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Complete the assessment using voice conversation with AuraVoice
                </p>
              </div>
              <Button
                onClick={handleStartVoiceSession}
                disabled={isConnecting}
                variant="outline"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Voice Session
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Session Status */}
      {liveKitRoom && (
        <Card className="mb-6 border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isAgentConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-sm">
                  {isAgentConnected ? 'AuraVoice Connected' : 'Connecting to AuraVoice...'}
                </span>
              </div>
              <Button onClick={handleDisconnectVoice} variant="outline" size="sm">
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {session.language === 'fr' ? currentQuestion.student_fr : currentQuestion.student_en}
          </CardTitle>
          <CardDescription>
            {currentQuestion.domain.replace(/_/g, ' ')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={responses[currentQuestionIndex + 1]?.toString()}
            onValueChange={(value) => handleResponse(parseInt(value))}
          >
            <div className="space-y-3">
              {likertScale.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value.toString()} id={`option-${option.value}`} />
                  <Label
                    htmlFor={`option-${option.value}`}
                    className="flex-1 cursor-pointer flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span>{option.label}</span>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          <div className="flex justify-between mt-6">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!responses[currentQuestionIndex + 1] || isSubmitting}
            >
              {currentQuestionIndex === session.questions.length - 1 ? 'Complete' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

