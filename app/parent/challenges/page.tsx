'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  Clock, 
  Filter,
  Sparkles,
  CheckCircle2,
  Trophy,
  Flame,
  Brain,
  Heart,
  Lightbulb,
  Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentsForParent, StudentWithClass } from "@/services/student-service";
import { getLearningProfileSummary, LearningProfileSummary } from "@/services/parent-dashboard-service";
import ChildSwitcher from "@/components/ChildSwitcher";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AdaptabilityChallenge,
  ChallengePillar,
  ChallengeLevel,
  ChallengeFormat,
  ChallengeMood,
  getChallengesByCriteria,
  getRecommendedWeeklyChallenge,
  getAllPillars,
  getPillarName,
  getPillarDescription,
} from "@/services/adaptability-challenges-service";
import {
  getChallengeOverview,
  assignWeeklyChallenge,
  startChallenge,
  completeChallenge,
  ChallengeStreak,
} from "@/services/challenge-progress-service";
import {
  createChallengeSession,
  getActiveChallengeSession,
  completeChallengeSession,
  ChallengeSession,
} from "@/services/adaptability-challenge-session-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PILLAR_ICONS: Record<ChallengePillar, typeof Target> = {
  strategy_switching: Target,
  productive_struggle: TrendingUp,
  slow_thinking: Brain,
  fast_thinking: Zap,
  creativity: Lightbulb,
  emotional_adaptability: Heart,
};

const PILLAR_COLORS: Record<ChallengePillar, string> = {
  strategy_switching: 'from-blue-500 to-cyan-500',
  productive_struggle: 'from-orange-500 to-red-500',
  slow_thinking: 'from-purple-500 to-indigo-500',
  fast_thinking: 'from-yellow-500 to-amber-500',
  creativity: 'from-pink-500 to-rose-500',
  emotional_adaptability: 'from-green-500 to-emerald-500',
};

export default function ParentChallengesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyChallenge, setWeeklyChallenge] = useState<AdaptabilityChallenge | null>(null);
  const [allChallenges, setAllChallenges] = useState<AdaptabilityChallenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<AdaptabilityChallenge[]>([]);
  
  // Filters
  const [selectedPillar, setSelectedPillar] = useState<ChallengePillar | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<ChallengeLevel | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<ChallengeFormat | 'all'>('all');
  const [selectedMood, setSelectedMood] = useState<ChallengeMood | 'all'>('all');

  // Streaks from database
  const [streaks, setStreaks] = useState<ChallengeStreak[]>([]);
  const [challengeHistory, setChallengeHistory] = useState<any[]>([]);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChallengeSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<LearningProfileSummary | null>(null);
  
  // Loading states for challenge actions
  const [startingChallengeId, setStartingChallengeId] = useState<string | null>(null);
  const [completingChallengeId, setCompletingChallengeId] = useState<string | null>(null);

  // Fetch linked students
  useEffect(() => {
    async function loadStudents() {
      if (!user?.email) return;

      try {
        setIsLoading(true);
        const linkedStudents = await getStudentsForParent(user.email);
        setStudents(linkedStudents);

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

  // Load weekly challenge, all challenges, streaks, and history
  useEffect(() => {
    if (!selectedStudentId) {
      setWeeklyChallenge(null);
      setAllChallenges([]);
      setStreaks([]);
      setChallengeHistory([]);
      setActiveChallengeId(null);
      setActiveSession(null);
      setSessionError(null);
      setSessionLoading(false);
      return;
    }

    async function loadChallenges() {
      if (!user?.clerk_id) return;
      
      try {
        // Get student profile for recommendations
        const profile = await getLearningProfileSummary(selectedStudentId, user.clerk_id);
        setCurrentProfile(profile);
        
        // Load challenge history and streaks via secure API
        const overview = await getChallengeOverview(selectedStudentId, user.clerk_id);
        const history = overview.history || [];
        setChallengeHistory(history);
        const loadedChallenges: AdaptabilityChallenge[] = getChallengesByCriteria({});
        setAllChallenges(loadedChallenges);
        setFilteredChallenges(loadedChallenges);

        const activeProgress = history.find(
          (entry) => entry.status === "in_progress" || entry.status === "pending"
        );
        setActiveChallengeId(activeProgress?.challenge_id || null);
        if (activeProgress?.id) {
          const existingSession = await loadSessionForProgress(activeProgress.id);
          if (!existingSession) {
            const activeChallenge = loadedChallenges.find((c) => c.id === activeProgress.challenge_id);
            if (activeChallenge) {
              await generateSessionForChallenge(activeChallenge, activeProgress.id);
            }
          }
        } else {
          setActiveSession(null);
          setSessionError(null);
        }
        
        // Get recommended weekly challenge
        const recommended = getRecommendedWeeklyChallenge({
          primaryCategory: profile?.hasAssessment ? 'visual_learner' : undefined, // Placeholder
          strengths: profile?.primaryStrengths,
          areasForSupport: profile?.areasForSupport,
          recentChallenges: history.map(c => c.challenge_id),
        });
        
        setWeeklyChallenge(recommended);

        // Load streaks
        setStreaks(overview.streaks || []);
      } catch (error) {
        console.error('Error loading challenges:', error);
      }
    }

    loadChallenges();
  }, [selectedStudentId, user?.clerk_id]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allChallenges];

    if (selectedPillar !== 'all') {
      filtered = filtered.filter(c => c.pillar === selectedPillar);
    }
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(c => c.level === selectedLevel);
    }
    if (selectedFormat !== 'all') {
      filtered = filtered.filter(c => c.format === selectedFormat);
    }
    if (selectedMood !== 'all') {
      filtered = filtered.filter(c => c.mood === selectedMood);
    }

    setFilteredChallenges(filtered);
  }, [allChallenges, selectedPillar, selectedLevel, selectedFormat, selectedMood]);

  const loadSessionForProgress = async (progressId: string): Promise<ChallengeSession | null> => {
    if (!user?.clerk_id) return null;
    setSessionLoading(true);
    try {
      const session = await getActiveChallengeSession(progressId, user.clerk_id);
      setActiveSession(session);
      setSessionError(null);
      return session;
    } catch (error) {
      console.error('Error loading challenge session:', error);
      setActiveSession(null);
      setSessionError('Unable to load your personalized challenge right now.');
      return null;
    } finally {
      setSessionLoading(false);
    }
  };

  const generateSessionForChallenge = async (challenge: AdaptabilityChallenge, progressId: string) => {
    if (!selectedStudentId || !user?.clerk_id) {
      toast({
        title: "Error",
        description: "Please select a child first",
        variant: "destructive",
      });
      return;
    }

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      toast({
        title: "Error",
        description: "Student not found",
        variant: "destructive",
      });
      return;
    }

    setSessionLoading(true);
    try {
      const session = await createChallengeSession({
        progressId,
        studentId: selectedStudentId,
        studentName: student.name,
        challenge,
        learningProfile: currentProfile,
        clerkId: user.clerk_id,
        language: (language || 'en').split('-')[0],
      });
      setActiveSession(session);
      setSessionError(null);
    } catch (error) {
      console.error('Error generating challenge session:', error);
      setSessionError('We could not generate a personalized challenge. Try again in a moment.');
      setActiveSession(null);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleStartChallenge = async (challenge: AdaptabilityChallenge) => {
    if (!selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select a child first",
        variant: "destructive",
      });
      return;
    }

    if (startingChallengeId) return; // Prevent double-clicks

    try {
      if (!user?.clerk_id) {
        toast({
          title: "Error",
          description: "User authentication required",
          variant: "destructive",
        });
        return;
      }

      setStartingChallengeId(challenge.id);

      // Assign challenge if not already assigned
      const progress = await assignWeeklyChallenge(selectedStudentId, challenge, user.clerk_id);
      const startedProgress = await startChallenge(progress.id, user.clerk_id);
      
      toast({
        title: "Challenge Started! ✅",
        description: `"${challenge.title}" is now active. Scroll to the coaching card for guidance.`,
        duration: 5000,
      });
      
      // Refresh data
      const overview = await getChallengeOverview(selectedStudentId, user.clerk_id);
      setChallengeHistory(overview.history || []);
      setStreaks(overview.streaks || []);
      
      // Update UI immediately - mark challenge as in progress
      setAllChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, isActive: true } : c)));
      setActiveChallengeId(challenge.id);
      await generateSessionForChallenge(challenge, startedProgress.id);
    } catch (error: any) {
      console.error('Error starting challenge:', error);
      const errorMessage = error?.message || error?.details || 'Failed to start challenge';
      const errorCode = error?.code || 'unknown';
      
      toast({
        title: "Error",
        description: errorCode === '42501' 
          ? "Permission denied. Please ensure you have access to this child's challenges."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setStartingChallengeId(null);
    }
  };

  const handleContinueChallenge = async (challenge: AdaptabilityChallenge) => {
    if (!selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select a child first",
        variant: "destructive",
      });
      return;
    }

    const existingProgress = challengeHistory.find(
      (p) => p.challenge_id === challenge.id && (p.status === 'in_progress' || p.status === 'pending')
    );

    if (!existingProgress) {
      toast({
        title: "Challenge not active",
        description: "Please start the challenge first.",
      });
      return;
    }

    setActiveChallengeId(challenge.id);
    await loadSessionForProgress(existingProgress.id);
  };

  const handleCompleteChallenge = async (challenge: AdaptabilityChallenge) => {
    if (!selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select a child first",
        variant: "destructive",
      });
      return;
    }

    if (completingChallengeId) return; // Prevent double-clicks

    try {
      // Find existing progress or create new
      const existingProgress = challengeHistory.find(
        p => p.challenge_id === challenge.id && p.status !== 'completed'
      );

      if (!user?.clerk_id) {
        toast({
          title: "Error",
          description: "User authentication required",
          variant: "destructive",
        });
        return;
      }

      setCompletingChallengeId(challenge.id);

      let progressId = existingProgress?.id;
      if (existingProgress) {
        await completeChallenge(existingProgress.id, user.clerk_id);
      } else {
        // Assign and complete
        const progress = await assignWeeklyChallenge(selectedStudentId, challenge, user.clerk_id);
        await completeChallenge(progress.id, user.clerk_id);
        progressId = progress.id;
      }
      
      toast({
        title: "Challenge Completed! 🎉",
        description: `"${challenge.title}" has been marked as complete. Great work!`,
        duration: 5000,
      });
      
      // Refresh streaks and history
      const overview = await getChallengeOverview(selectedStudentId, user.clerk_id);
      setStreaks(overview.streaks || []);
      setChallengeHistory(overview.history || []);
      
      // Update UI immediately - mark challenge as completed
      setAllChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, isCompleted: true } : c)));
      if (activeChallengeId === challenge.id) {
        setActiveChallengeId(null);
      }

      if (activeSession && progressId && activeSession.progress_id === progressId && user?.clerk_id) {
        await completeChallengeSession(activeSession.id, user.clerk_id);
        setActiveSession(null);
        setSessionError(null);
      }
    } catch (error) {
      console.error('Error completing challenge:', error);
      toast({
        title: "Error",
        description: "Failed to complete challenge",
        variant: "destructive",
      });
    } finally {
      setCompletingChallengeId(null);
    }
  };

  // Helper function to get challenge status from history
  const getChallengeStatus = (challengeId: string): 'not_started' | 'in_progress' | 'completed' | 'pending' => {
    const progress = challengeHistory.find(p => p.challenge_id === challengeId);
    if (!progress) return 'not_started';
    
    if (progress.status === 'completed') return 'completed';
    if (progress.status === 'in_progress') return 'in_progress';
    if (progress.status === 'pending') return 'pending';
    return 'not_started';
  };

  const getLevelBadge = (level: ChallengeLevel) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[level]}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  const getFormatBadge = (format: ChallengeFormat) => {
    const labels = {
      micro_task: 'Quick (2-5 min)',
      mission: 'Mission (10 min)',
      quest: 'Quest (15-20 min)',
      reflection: 'Reflection',
      co_challenge: 'Together',
    };
    return <Badge variant="outline">{labels[format]}</Badge>;
  };

  if (isLoading && students.length === 0) {
    return (
      <ProtectedRoute requireRole="parent">
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading challenges...</p>
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
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">Adaptability Challenges</h1>
                  <p className="text-muted-foreground">
                    Build flexibility, resilience, and executive functions through targeted challenges
                  </p>
                </div>
              </div>
            </div>

            {/* Child Switcher */}
            {students.length > 0 && (
              <ChildSwitcher
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            )}

            {selectedStudentId && (
              <>
                {/* Streaks Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Adaptability Streak</span>
                      </div>
                      <div className="text-3xl font-bold text-orange-900">
                        {streaks.find(s => s.streak_type === 'adaptability')?.current_streak || 0}
                      </div>
                      <p className="text-xs text-orange-700 mt-1">days in a row</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Strategy Switching</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-900">
                        {streaks.find(s => s.streak_type === 'strategy_switching')?.current_streak || 0}
                      </div>
                      <p className="text-xs text-blue-700 mt-1">days in a row</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Focus Streak</span>
                      </div>
                      <div className="text-3xl font-bold text-purple-900">
                        {streaks.find(s => s.streak_type === 'focus')?.current_streak || 0}
                      </div>
                      <p className="text-xs text-purple-700 mt-1">days in a row</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Challenges Accepted</span>
                      </div>
                      <div className="text-3xl font-bold text-green-900">
                        {challengeHistory.filter(c => c.status === 'completed').length}
                      </div>
                      <p className="text-xs text-green-700 mt-1">total completed</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Challenge Tracker */}
                {activeChallengeId && (() => {
                  const activeChallenge = allChallenges.find((c) => c.id === activeChallengeId) || weeklyChallenge;
                  if (!activeChallenge) return null;
                  const session =
                    activeSession &&
                    (activeSession.challenge_id === activeChallenge.id ||
                      activeSession.challenge_id === activeChallenge.title)
                      ? activeSession
                      : null;
                  const progressRecord = challengeHistory.find(
                    (p) => p.challenge_id === activeChallenge.id && (p.status === 'in_progress' || p.status === 'pending')
                  );

                  return (
                    <Card className="border-2 border-blue-200 bg-blue-50/40">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                          Active Challenge Coaching
                        </CardTitle>
                        <CardDescription>
                          Personalized steps for "{activeChallenge.title}"
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {sessionLoading && !session && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            Generating challenge...
                          </div>
                        )}

                        {session ? (
                          <>
                            <p className="text-sm font-medium text-foreground">{session.prompt}</p>
                            {session.problem_statement && (
                              <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
                                <p className="text-sm font-semibold mb-1 text-blue-900">Try this problem:</p>
                                <p className="text-sm text-foreground whitespace-pre-line">{session.problem_statement}</p>
                              </div>
                            )}
                            {session.materials?.length ? (
                              <div>
                                <p className="text-sm font-medium mb-2">Materials</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {session.materials.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {session.child_steps?.length ? (
                              <div>
                                <p className="text-sm font-medium mb-2">Steps for your child</p>
                                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                                  {session.child_steps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            ) : null}
                            {session.parent_tips?.length ? (
                              <div className="bg-white/60 p-3 rounded-lg">
                                <p className="text-sm font-medium mb-1">Coaching Tips</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {session.parent_tips.map((tip, idx) => (
                                    <li key={idx}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {session.reflection_questions?.length ? (
                              <div className="bg-blue-100/60 p-3 rounded-lg">
                                <p className="text-sm font-medium mb-1">Reflection Questions</p>
                                <ul className="list-disc list-inside text-sm text-blue-900 space-y-1">
                                  {session.reflection_questions.map((question, idx) => (
                                    <li key={idx}>{question}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {session.success_criteria?.length ? (
                              <div>
                                <p className="text-sm font-medium mb-1">Success looks like:</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {session.success_criteria.map((criterion, idx) => (
                                    <li key={idx}>{criterion}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              Estimated time: {session.estimated_time || activeChallenge.estimatedTime || '10 minutes'}
                            </p>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Start the challenge to generate a personalized plan for your child.
                          </div>
                        )}

                        {sessionError && !session && (
                          <p className="text-xs text-red-600">{sessionError}</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {progressRecord && (
                            <Button
                              variant="outline"
                              onClick={() => generateSessionForChallenge(activeChallenge, progressRecord.id)}
                              disabled={sessionLoading}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Regenerate Challenge
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => {
                              const challenge = allChallenges.find((c) => c.id === activeChallenge.id);
                              if (challenge) {
                                void handleCompleteChallenge(challenge);
                              }
                            }}
                            className="border-green-500 text-green-700 hover:bg-green-50 flex-1"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark Challenge Complete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Weekly Challenge */}
                {weeklyChallenge && (
                  <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-2xl">
                            <Sparkles className="w-6 h-6 text-purple-600" />
                            This Week's Adaptability Challenge
                          </CardTitle>
                          <CardDescription className="text-base mt-2">
                            Recommended based on your child's learning profile
                          </CardDescription>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                          Recommended
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`bg-gradient-to-r ${PILLAR_COLORS[weeklyChallenge.pillar]} text-white`}>
                          {getPillarName(weeklyChallenge.pillar)}
                        </Badge>
                        {getLevelBadge(weeklyChallenge.level)}
                        {getFormatBadge(weeklyChallenge.format)}
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {weeklyChallenge.estimatedTime}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-semibold">{weeklyChallenge.title}</h3>
                          {(() => {
                        const status = getChallengeStatus(weeklyChallenge.id);
                            if (status === 'completed') {
                              return (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              );
                            }
                            if (status === 'in_progress' || status === 'pending') {
                              return (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  In Progress
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <p className="text-muted-foreground mb-4">{weeklyChallenge.description}</p>
                        
                        <div className="bg-white/50 p-4 rounded-lg mb-4">
                          <p className="text-sm font-medium mb-2">Instructions:</p>
                          <ol className="space-y-2 text-sm">
                            {weeklyChallenge.instructions.map((step, idx) => (
                              <li key={idx} className="flex gap-2">
                                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </Badge>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg mb-4">
                          <p className="text-xs font-medium text-blue-900 mb-1">Why this helps:</p>
                          <p className="text-xs text-blue-800">{weeklyChallenge.whyItHelps}</p>
                        </div>

                        {weeklyChallenge.parentInstructions && (
                          <div className="bg-pink-50 p-3 rounded-lg mb-4">
                            <p className="text-xs font-medium text-pink-900 mb-1">For Parents:</p>
                            <p className="text-xs text-pink-800">{weeklyChallenge.parentInstructions}</p>
                          </div>
                        )}

                        {(() => {
                          const status = getChallengeStatus(weeklyChallenge.id);
                          const isStarting = startingChallengeId === weeklyChallenge.id;
                          const isCompleting = completingChallengeId === weeklyChallenge.id;
                          const isDisabled = isStarting || isCompleting;

                          if (status === 'completed') {
                            return (
                              <Button
                                disabled
                                className="w-full bg-green-100 text-green-800 hover:bg-green-100 cursor-not-allowed"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Completed ✓
                              </Button>
                            );
                          }

                          return (
                            <div className="flex gap-2">
                              <Button
                                onClick={() =>
                                  status === 'in_progress' || status === 'pending'
                                    ? handleContinueChallenge(weeklyChallenge)
                                    : handleStartChallenge(weeklyChallenge)
                                }
                                disabled={isDisabled}
                                className={`flex-1 ${
                                  status === 'in_progress' || status === 'pending'
                                    ? 'bg-blue-500 hover:bg-blue-600'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
                                } disabled:opacity-50`}
                              >
                                {isStarting ? (
                                  <>
                                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Starting...
                                  </>
                                ) : status === 'in_progress' || status === 'pending' ? (
                                  <>
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Continue Challenge
                                  </>
                                ) : (
                                  <>
                                    <Target className="w-4 h-4 mr-2" />
                                    Start Challenge
                                  </>
                                )}
                              </Button>
                              {(status === 'in_progress' || status === 'pending') && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleCompleteChallenge(weeklyChallenge)}
                                  disabled={isDisabled}
                                  className="border-green-500 text-green-700 hover:bg-green-50"
                                >
                                  {isCompleting ? (
                                    <>
                                      <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      Completing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Mark Complete
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Challenge Catalog */}
                <Tabs defaultValue="catalog" className="w-full">
                  <TabsList>
                    <TabsTrigger value="catalog">Challenge Catalog</TabsTrigger>
                    <TabsTrigger value="pillars">By Pillar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="catalog" className="space-y-6 mt-6">
                    {/* Filters */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Filter className="w-5 h-5" />
                          Filter Challenges
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Pillar</label>
                            <Select value={selectedPillar} onValueChange={(v) => setSelectedPillar(v as ChallengePillar | 'all')}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Pillars</SelectItem>
                                {getAllPillars().map(pillar => (
                                  <SelectItem key={pillar} value={pillar}>
                                    {getPillarName(pillar)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Level</label>
                            <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as ChallengeLevel | 'all')}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Format</label>
                            <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ChallengeFormat | 'all')}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Formats</SelectItem>
                                <SelectItem value="micro_task">Quick (2-5 min)</SelectItem>
                                <SelectItem value="mission">Mission (10 min)</SelectItem>
                                <SelectItem value="quest">Quest (15-20 min)</SelectItem>
                                <SelectItem value="reflection">Reflection</SelectItem>
                                <SelectItem value="co_challenge">Together</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Mood</label>
                            <Select value={selectedMood} onValueChange={(v) => setSelectedMood(v as ChallengeMood | 'all')}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Moods</SelectItem>
                                <SelectItem value="fun">Fun</SelectItem>
                                <SelectItem value="focus">Focus</SelectItem>
                                <SelectItem value="challenge">Challenge</SelectItem>
                                <SelectItem value="creative">Creative</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Challenges Grid */}
                    <div>
                      <h2 className="text-2xl font-bold mb-4">
                        {filteredChallenges.length} Challenge{filteredChallenges.length !== 1 ? 's' : ''} Found
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredChallenges.map((challenge) => {
                          const PillarIcon = PILLAR_ICONS[challenge.pillar];
                          return (
                            <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                                      {(() => {
                                        const status = getChallengeStatus(challenge.id);
                                        if (status === 'completed') {
                                          return (
                                            <Badge className="bg-green-100 text-green-800 border-green-300">
                                              <CheckCircle2 className="w-3 h-3 mr-1" />
                                              Completed
                                            </Badge>
                                          );
                                        }
                                        if (status === 'in_progress' || status === 'pending') {
                                          return (
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                              <TrendingUp className="w-3 h-3 mr-1" />
                                              In Progress
                                            </Badge>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                      <Badge className={`bg-gradient-to-r ${PILLAR_COLORS[challenge.pillar]} text-white`}>
                                        <PillarIcon className="w-3 h-3 mr-1" />
                                        {getPillarName(challenge.pillar)}
                                      </Badge>
                                      {getLevelBadge(challenge.level)}
                                      {getFormatBadge(challenge.format)}
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">{challenge.description}</p>
                                
                                <div className="bg-secondary/50 p-3 rounded-lg">
                                  <p className="text-xs font-medium mb-1">Why this helps:</p>
                                  <p className="text-xs text-muted-foreground">{challenge.whyItHelps}</p>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {challenge.estimatedTime}
                                  {challenge.subject && (
                                    <>
                                      <span>•</span>
                                      <span className="capitalize">{challenge.subject}</span>
                                    </>
                                  )}
                                </div>

                                {(() => {
                                  const status = getChallengeStatus(challenge.id);
                                  const isStarting = startingChallengeId === challenge.id;
                                  const isCompleting = completingChallengeId === challenge.id;
                                  const isDisabled = isStarting || isCompleting;

                                  if (status === 'completed') {
                                    return (
                                      <Button
                                        disabled
                                        variant="outline"
                                        className="w-full bg-green-50 text-green-700 border-green-300 hover:bg-green-50 cursor-not-allowed"
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Completed ✓
                                      </Button>
                                    );
                                  }

                                  if (status === 'in_progress' || status === 'pending') {
                                    return (
                                      <div className="space-y-2">
                                        <Button
                                          variant="outline"
                                          className="w-full border-blue-500 text-blue-700 hover:bg-blue-50"
                                          onClick={() => handleContinueChallenge(challenge)}
                                          disabled={isDisabled}
                                        >
                                          {isStarting ? (
                                            <>
                                              <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                              Starting...
                                            </>
                                          ) : (
                                            <>
                                              <TrendingUp className="w-4 h-4 mr-2" />
                                              Continue Challenge
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          className="w-full border-green-500 text-green-700 hover:bg-green-50"
                                          onClick={() => handleCompleteChallenge(challenge)}
                                          disabled={isDisabled}
                                        >
                                          {isCompleting ? (
                                            <>
                                              <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                              Completing...
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle2 className="w-4 h-4 mr-2" />
                                              Mark Complete
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    );
                                  }

                                  return (
                                    <Button
                                      variant="outline"
                                      className="w-full"
                                      onClick={() => handleStartChallenge(challenge)}
                                      disabled={isDisabled}
                                    >
                                      {isStarting ? (
                                        <>
                                          <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                          Starting...
                                        </>
                                      ) : (
                                        <>
                                          <Target className="w-4 h-4 mr-2" />
                                          Start Challenge
                                        </>
                                      )}
                                    </Button>
                                  );
                                })()}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="pillars" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getAllPillars().map((pillar) => {
                        const PillarIcon = PILLAR_ICONS[pillar];
                        const pillarChallenges = allChallenges.filter(c => c.pillar === pillar);
                        return (
                          <Card key={pillar} className={`bg-gradient-to-br ${PILLAR_COLORS[pillar]}/10 border-2`}>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${PILLAR_COLORS[pillar]} flex items-center justify-center`}>
                                  <PillarIcon className="w-5 h-5 text-white" />
                                </div>
                                {getPillarName(pillar)}
                              </CardTitle>
                              <CardDescription>
                                {getPillarDescription(pillar)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  {pillarChallenges.length} challenges available
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPillar(pillar);
                                    // Switch to catalog tab (would need tab state management)
                                  }}
                                >
                                  View Challenges
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

