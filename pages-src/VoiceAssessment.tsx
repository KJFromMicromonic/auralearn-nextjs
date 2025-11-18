/**
 * AuraVoice Assessment Management Page (Teacher Interface)
 * 
 * Allows teachers to:
 * - Initiate voice-based cognitive assessments
 * - Monitor live voice sessions
 * - View real-time voice insights
 * - Compare voice vs parent triangulation
 * - Access voice session recordings and transcripts
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
  Mic,
  Users,
  Play,
  Pause,
  Eye,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Volume2,
  Brain,
  Activity,
  MessageSquare,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  class_id: string;
}

interface Class {
  id: string;
  name: string;
  grade_level: string;
  students: Student[];
}

interface VoiceSession {
  id: string;
  student_id: string;
  room_name: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  metadata: Record<string, unknown>;
}

interface VoiceInsight {
  id: string;
  student_id: string;
  session_id: string;
  question_id: number;
  transcript: string;
  language: string;
  filler_count: number;
  word_count: number;
  confidence_score: number;
  hesitation_score: number;
  voice_likert: number;
  parent_score?: number;
  triangulated_score: number;
  created_at: string;
}

export default function VoiceAssessment() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<VoiceSession | null>(null);
  const [insights, setInsights] = useState<VoiceInsight[]>([]);
  const [showInsightsDialog, setShowInsightsDialog] = useState(false);
  const [startingSession, setStartingSession] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: classesData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('name');

      if (classError) throw classError;

      const classesWithStudents = await Promise.all(
        (classesData || []).map(async (cls) => {
          const { data: studentsData } = await supabase
            .from('students')
            .select('*')
            .eq('class_id', cls.id)
            .order('name');

          return {
            ...cls,
            students: studentsData || [],
          };
        })
      );

      setClasses(classesWithStudents);
      if (classesWithStudents.length > 0) {
        setSelectedClass(classesWithStudents[0]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('voice_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadClasses();
      loadSessions();
    }
  }, [user?.id, loadClasses, loadSessions]);

  useEffect(() => {
    if (selectedSession) {
      loadInsights(selectedSession.id);
    }
  }, [selectedSession]);

  const loadInsights = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('live_voice_insights')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at');

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const handleStartVoiceSession = async (student: Student) => {
    setStartingSession(student.id);
    try {
      const roomName = `aura-${student.id}-${Date.now()}`;
      
      // Create session in database
      const { data: session, error } = await supabase
        .from('voice_sessions')
        .insert({
          student_id: student.id,
          room_name: roomName,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Voice session started for ${student.name}`);
      toast.info(`Room: ${roomName}`, {
        description: 'Share this room name with the student to join',
        duration: 10000,
      });

      // Copy room name to clipboard
      await navigator.clipboard.writeText(roomName);
      toast.success('Room name copied to clipboard!');

      // Reload sessions
      await loadSessions();
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start voice session');
    } finally {
      setStartingSession(null);
    }
  };

  const handleViewInsights = (session: VoiceSession) => {
    setSelectedSession(session);
    setShowInsightsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600 animate-pulse"><Activity className="w-3 h-3 mr-1" />Live</Badge>;
      case 'completed':
        return <Badge className="bg-blue-600"><CheckCircle2 className="w-3 h-3 mr-1" />Complete</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStudentName = (studentId: string) => {
    for (const cls of classes) {
      const student = cls.students.find(s => s.id === studentId);
      if (student) return student.name;
    }
    return 'Unknown Student';
  };

  const calculateProgress = (session: VoiceSession) => {
    const sessionInsights = insights.filter(i => i.session_id === session.id);
    return (sessionInsights.length / 15) * 100; // 15 questions total
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireRole="teacher">
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (classes.length === 0) {
    return (
      <ProtectedRoute requireRole="teacher">
        <Layout>
          <div className="container mx-auto p-6">
            <Card>
              <CardHeader>
                <CardTitle>No Classes Found</CardTitle>
                <CardDescription>
                  Create a class first to start voice assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/create-class')}>
                  Create Class
                </Button>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole="teacher">
      <Layout>
        <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mic className="w-8 h-8 text-primary" />
            AuraVoice Assessments
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered voice cognitive assessment with real-time analysis
          </p>
        </div>
        <Button onClick={loadSessions} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5" />
            About AuraVoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Real-time Voice Analysis:</strong> Aura, a friendly 10-year-old AI, conducts natural conversations 
            with students, analyzing speech patterns, confidence, and hesitation in real-time.
          </p>
          <p>
            <strong>15 Questions:</strong> Same validated cognitive domains as text assessments, but delivered through 
            natural conversation in French or English.
          </p>
          <p>
            <strong>Advanced Metrics:</strong> Filler word detection, audio confidence scoring, AI hesitation analysis, 
            and triangulation with parent assessments.
          </p>
          <p>
            <strong>Technology:</strong> LiveKit for voice, Deepgram for STT, ElevenLabs for TTS, and Gemini AI for analysis.
          </p>
        </CardContent>
      </Card>

      {/* Class Tabs */}
      <Tabs value={selectedClass?.id} onValueChange={(id) => {
        const cls = classes.find(c => c.id === id);
        if (cls) setSelectedClass(cls);
      }}>
        <TabsList>
          {classes.map((cls) => (
            <TabsTrigger key={cls.id} value={cls.id}>
              {cls.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {classes.map((cls) => (
          <TabsContent key={cls.id} value={cls.id} className="space-y-4">
            {/* Students List */}
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold">Start New Voice Session</h2>
              {cls.students.map((student) => {
                const studentSessions = sessions.filter(s => s.student_id === student.id);
                const activeSession = studentSessions.find(s => s.status === 'active');
                const lastSession = studentSessions[0];

                return (
                  <Card key={student.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{student.name}</h3>
                            {activeSession && getStatusBadge('active')}
                          </div>
                          {lastSession && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Last session: {new Date(lastSession.started_at).toLocaleString()}
                              {lastSession.status === 'completed' && ` - ${insights.filter(i => i.session_id === lastSession.id).length}/15 questions`}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleStartVoiceSession(student)}
                            disabled={startingSession === student.id || !!activeSession}
                            variant="default"
                          >
                            {startingSession === student.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Starting...
                              </>
                            ) : activeSession ? (
                              <>
                                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                                Session Active
                              </>
                            ) : (
                              <>
                                <Mic className="w-4 h-4 mr-2" />
                                Start Voice Session
                              </>
                            )}
                          </Button>

                          {lastSession && (
                            <Button
                              onClick={() => handleViewInsights(lastSession)}
                              variant="outline"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Insights
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Sessions */}
            <div className="space-y-4 mt-8">
              <h2 className="text-xl font-semibold">Recent Voice Sessions</h2>
              {sessions.slice(0, 10).map((session) => {
                const sessionInsights = insights.filter(i => i.session_id === session.id);
                const progress = (sessionInsights.length / 15) * 100;

                return (
                  <Card key={session.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Volume2 className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <h3 className="font-semibold">{getStudentName(session.student_id)}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(session.started_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(session.status)}
                            <Button
                              onClick={() => handleViewInsights(session)}
                              variant="ghost"
                              size="sm"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {session.status === 'active' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{sessionInsights.length}/15 questions</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Insights Dialog */}
      <Dialog open={showInsightsDialog} onOpenChange={setShowInsightsDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Voice Session Insights - {selectedSession && getStudentName(selectedSession.student_id)}
            </DialogTitle>
            <DialogDescription>
              Real-time voice analysis with AI-powered cognitive insights
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <Card key={insight.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Question {insight.question_id}
                          <Badge variant="outline">{insight.language.toUpperCase()}</Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                          <strong>Transcript:</strong> "{insight.transcript}"
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Filler Words</p>
                        <p className="font-semibold">{insight.filler_count} / {insight.word_count} words</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-semibold">{(insight.confidence_score * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Hesitation</p>
                        <p className="font-semibold">{(insight.hesitation_score * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Voice Score</p>
                        <p className="font-semibold">{insight.voice_likert}/5</p>
                      </div>
                    </div>
                    {insight.parent_score && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Parent Score</p>
                            <p className="font-semibold">{insight.parent_score}/5</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Triangulated</p>
                            <p className="font-semibold">{insight.triangulated_score.toFixed(1)}/5</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Discrepancy</p>
                            <p className="font-semibold">
                              {Math.abs(insight.voice_likert - (insight.parent_score || 0)).toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {insights.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No insights recorded yet for this session
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowInsightsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
