/**
 * Student Cognitive Assessment Page
 * 
 * Voice-based or web-based cognitive assessment for students
 * 15 questions with 5-point Likert scale
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
import { GradeLevelType } from '@/contexts/AuthContext';
import { 
  getLiveKitToken, 
  dispatchAuraVoiceAgent, 
  connectToLiveKitRoom, 
  setupRoomHandlers 
} from '@/services/livekit-service';
import { Room, Track, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';

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

export default function StudentCognitiveAssessment() {
  const params = useParams();
  const sessionId = params?.token as string | undefined;
  const router = useRouter();
  
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

  const loadAssessmentSession = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Loading assessment for token:', sessionId);
      
      // First, try to find student by assessment token
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, classes(grade_level)')
        .eq('assessment_token', sessionId)
        .single();

      if (studentError) {
        console.error('Student lookup error:', studentError);
        toast.error(`Student not found: ${studentError.message}`);
        setSession(null);
        setIsLoading(false);
        return;
      }

      console.log('Student found:', studentData);

      // Check if cognitive assessment already exists for this student
      const { data: existingAssessments, error: assessmentError } = await supabase
        .from('learning_profiles')
        .select('*, learning_profile_questions(questions)')
        .eq('student_id', studentData.id)
        .eq('assessment_type', 'student')
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('Existing assessments:', existingAssessments);

      let existingAssessment = existingAssessments && existingAssessments.length > 0 ? existingAssessments[0] : null;

      // If assessment exists and is completed, show completion screen
      if (existingAssessment && existingAssessment.status === 'completed') {
        console.log('Assessment already completed');
        setIsComplete(true);
        setIsLoading(false);
        return;
      }

      // If no assessment exists or it's pending, create/use it
      if (!existingAssessment) {
        console.log('Creating new assessment...');
        try {
          // Generate questions using API route
          const { generateCognitiveAssessment } = await import('@/services/assessment-api-client');
          const assessment = await generateCognitiveAssessment(
            'fr', 
            (studentData.classes?.grade_level as GradeLevelType) || 'CM1'
          );

          console.log('Generated assessment:', assessment);

          // Save questions to database
          const { data: questionsRecord, error: questionsError } = await supabase
            .from('learning_profile_questions')
            .insert({
              student_id: studentData.id,
              questions: assessment.questions,
              generation_metadata: {
                language: 'fr',
                grade_level: studentData.classes?.grade_level || 'CM1',
                generated_by: 'gemini-2.0-flash-exp',
                generated_at: new Date().toISOString()
              }
            })
            .select()
            .single();

          if (questionsError) {
            console.error('Error saving questions:', questionsError);
            throw questionsError;
          }

          console.log('Questions saved:', questionsRecord);

          // Create cognitive assessment record
          const { data: newAssessment, error: newAssessmentError } = await supabase
            .from('learning_profiles')
            .insert({
              student_id: studentData.id,
              assessment_type: 'student',
              questions_id: questionsRecord.id,
              language: 'fr',
              status: 'in_progress'
            })
            .select()
            .single();

          if (newAssessmentError) {
            console.error('Error creating assessment:', newAssessmentError);
            throw newAssessmentError;
          }

          console.log('Assessment created:', newAssessment);

          existingAssessment = {
            ...newAssessment,
            learning_profile_questions: questionsRecord
          };
        } catch (genError) {
          console.error('Error generating assessment:', genError);
          toast.error(`Failed to generate assessment: ${genError instanceof Error ? genError.message : 'Unknown error'}`);
          throw genError;
        }
      } else {
        console.log('Using existing assessment:', existingAssessment);
        // Mark existing assessment as in progress
        await supabase
          .from('learning_profiles')
          .update({ status: 'in_progress' })
          .eq('id', existingAssessment.id);
      }

      if (!existingAssessment.learning_profile_questions) {
        console.error('No questions found in assessment');
        toast.error('Assessment questions not found');
        setSession(null);
        setIsLoading(false);
        return;
      }

      console.log('Setting session with questions:', existingAssessment.learning_profile_questions.questions);

      setSession({
        id: existingAssessment.id,
        student_id: studentData.id,
        student_name: studentData.name,
        questions: existingAssessment.learning_profile_questions.questions,
        language: existingAssessment.language as 'en' | 'fr',
      });

      toast.success('Assessment loaded successfully!');

    } catch (error) {
      console.error('Error loading assessment:', error);
      toast.error(`Failed to load assessment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadAssessmentSession();
    }
  }, [sessionId, loadAssessmentSession]);

  const handleResponseChange = (value: number) => {
    if (!session) return;
    
    const currentQuestion = session.questions[currentQuestionIndex];
    setResponses({
      ...responses,
      [currentQuestion.id]: value,
    });
  };

  const handleNext = async () => {
    if (!session) return;

    const currentQuestion = session.questions[currentQuestionIndex];
    const response = responses[currentQuestion.id];

    if (!response) {
      toast.error('Please select an answer before continuing');
      return;
    }

    // Save response to database
    try {
      await submitResponse(session.id, {
        question_id: currentQuestion.id,
        domain: currentQuestion.domain,
        response_value: response,
        response_time_ms: undefined,
        voice_transcript: undefined,
      });

      // Move to next question or complete
      if (currentQuestionIndex < session.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        await handleComplete();
      }
    } catch (error) {
      console.error('Error saving response:', error);
      toast.error('Failed to save response');
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
      // Disconnect from LiveKit if connected
      if (liveKitRoom) {
        await handleDisconnectVoice();
      }
      
      await completeAssessment(session.id);
      setIsComplete(true);
      toast.success('Assessment completed! Thank you!');
    } catch (error) {
      console.error('Error completing assessment:', error);
      toast.error('Failed to complete assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartVoiceSession = async () => {
    if (!session || !sessionId) {
      toast.error('Session not loaded');
      return;
    }

    setIsConnecting(true);
    try {
      // Generate unique room name dynamically for this session
      // Format: aura-{student_id}-{timestamp}
      const roomName = `aura-${session.student_id}-${Date.now()}`;
      
      // Get LiveKit server URL from environment or config
      const liveKitUrl = getEnvVar('VITE_LIVEKIT_URL', 'ws://localhost:7880');
      
      // Generate LiveKit access token dynamically on-demand
      // The token is generated server-side and scoped to this specific room and student
      toast.info('Generating secure connection token...');
      const token = await getLiveKitToken(roomName, session.student_id);
      
      // Dispatch agent worker with assessment token (sessionId is the assessment token from URL)
      // This is the token from the assessment link: /cognitive-assessment/{token}
      const dispatchResult = await dispatchAuraVoiceAgent({
        room_name: roomName,
        assessment_token: sessionId, // Legacy flow: assessment token from URL
      });
      if (dispatchResult.success) {
        toast.info('Starting AuraVoice agent...');
      } else {
        toast.warning('Agent dispatch initiated, but confirmation pending...');
      }
      
      // Connect to LiveKit room
      const room = await connectToLiveKitRoom(liveKitUrl, token, roomName);
      
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
      try {
        await liveKitRoom.disconnect();
        setLiveKitRoom(null);
        setIsAgentConnected(false);
        toast.info('Disconnected from AuraVoice');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
            <CardDescription className="text-lg mt-2">
              Thank you for completing the cognitive assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your teacher will review your responses and provide personalized learning strategies.
            </p>
            <Button onClick={() => router.push('/')} size="lg">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Not Found</CardTitle>
            <CardDescription>
              This assessment session could not be found or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;
  const likertScale = session.language === 'fr' ? LIKERT_SCALE_FR : LIKERT_SCALE_EN;
  const questionText = session.language === 'fr' ? currentQuestion.student_fr : currentQuestion.student_en;

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Cognitive Assessment
          </h1>
          <div className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {session.questions.length}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Voice/Text Toggle */}
      <div className="flex justify-center gap-2 mb-6">
        <Button
          variant={!useVoice ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUseVoice(false)}
        >
          <Type className="w-4 h-4 mr-2" />
          Text Mode
        </Button>
        <Button
          variant={useVoice ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUseVoice(true)}
          disabled={!session}
        >
          <Mic className="w-4 h-4 mr-2" />
          Voice Mode
        </Button>
      </div>

      {/* Voice Mode - LiveKit AuraVoice Agent */}
      {useVoice ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              AuraVoice - Voice Assessment
            </CardTitle>
            <CardDescription>
              Speak with Aura to complete your cognitive assessment. She'll ask you questions and listen to your responses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!liveKitRoom ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                {isConnecting ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Connecting to AuraVoice...</p>
                  </>
                ) : (
                  <>
                    <Mic className="w-16 h-16 text-muted-foreground" />
                    <p className="text-muted-foreground">Ready to start voice assessment</p>
                    <Button
                      onClick={handleStartVoiceSession}
                      disabled={!session || isConnecting}
                      size="lg"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Start Voice Session
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Connected to AuraVoice</span>
                  </div>
                  {isAgentConnected ? (
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Aura is ready! Start speaking when you hear the prompt.
                    </p>
                  ) : (
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Waiting for Aura to join...
                    </p>
                  )}
                </div>
                
                {/* Audio visualization/controls */}
                <div className="relative w-full bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-8 min-h-[300px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Mic className="w-12 h-12 text-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      {isAgentConnected 
                        ? "Aura is listening. Speak naturally!"
                        : "Connecting to Aura..."}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleDisconnectVoice}
                  variant="outline"
                  className="w-full"
                >
                  Disconnect
                </Button>
              </div>
            )}
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>How it works:</strong> Aura will guide you through {session?.questions.length || 15} questions about how you learn. 
                Speak naturally and honestly - there are no wrong answers!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !useVoice ? (
        /* Text Mode - Question Card */
        <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardDescription className="text-xs uppercase tracking-wide mb-2">
                {currentQuestion.domain.replace(/_/g, ' ')}
              </CardDescription>
              <CardTitle className="text-xl leading-relaxed">
                {questionText}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={responses[currentQuestion.id]?.toString()}
            onValueChange={(value) => handleResponseChange(parseInt(value))}
            className="space-y-3"
          >
            {likertScale.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-3 p-4 rounded-lg border-2 hover:border-primary transition-colors cursor-pointer"
              >
                <RadioGroupItem value={option.value.toString()} id={`option-${option.value}`} />
                <Label
                  htmlFor={`option-${option.value}`}
                  className="flex-1 cursor-pointer flex items-center gap-3"
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-base">{option.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
      ) : null}

      {/* Navigation - Only show in text mode */}
      {!useVoice && (
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!responses[currentQuestion.id] || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : currentQuestionIndex === session.questions.length - 1 ? (
            <>
              Complete
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
      )}

      {/* Help Text - Only show in text mode */}
      {!useVoice && (
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Take your time and answer honestly. There are no right or wrong answers.</p>
      </div>
      )}
    </div>
  );
}

