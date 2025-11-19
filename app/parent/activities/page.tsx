'use client';

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  AlertCircle,
  Target,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentsForParent, StudentWithClass } from "@/services/student-service";
import {
  getActivitiesFromTeachingGuides,
  logActivityCompletion,
  getActivityHistory,
  ActivityWithSource,
} from "@/services/parent-activity-service";
import {
  getAIActivityRecommendations,
  PersonalizedActivityRecommendation,
} from "@/services/ai-activity-recommender";
import ChildSwitcher from "@/components/ChildSwitcher";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ParentActivitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [availableActivities, setAvailableActivities] = useState<ActivityWithSource[]>([]);
  const [recommendations, setRecommendations] = useState<PersonalizedActivityRecommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<PersonalizedActivityRecommendation[]>([]);
  const [summary, setSummary] = useState("");
  const [insights, setInsights] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());
  const [activityHistory, setActivityHistory] = useState<any[]>([]);

  // Filters
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch linked students
  useEffect(() => {
    async function loadStudents() {
      if (!user?.email) return;

      try {
        setIsLoadingStudents(true);
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
        setIsLoadingStudents(false);
      }
    }

    loadStudents();
  }, [user?.email, toast]);

  const parseDurationToMinutes = (duration?: string): number => {
    if (!duration) return 15;
    const match = duration.match(/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return 15;
  };

  const buildFallbackRecommendations = (activities: ActivityWithSource[]): PersonalizedActivityRecommendation[] => {
    return activities.slice(0, 6).map((activity) => ({
      activity,
      confidence: 0.5,
      reasoning: "Recommendation based on teaching guide strategies for this profile.",
      expectedOutcome: "Keeps your child practicing core skills.",
      bestTimeOfDay: "afternoon",
      estimatedEngagement: 3,
      whyNow: "Matches current learning focus.",
      expectedDuration: parseDurationToMinutes(activity.duration),
    }));
  };

  const generatePersonalizedActivities = useCallback(
    async (
      studentId: string,
      options?: {
        preferredType?: "strength" | "support" | "flexibility" | "general";
        availableTimeLabel?: string;
        showToast?: boolean;
      }
    ) => {
      if (!user?.email || !user?.clerk_id) {
        toast({
          title: "Missing account information",
          description: "Please sign in again to refresh your parent profile.",
          variant: "destructive",
        });
        return;
      }

      const student = students.find((s) => s.id === studentId);
      if (!student) {
        toast({
          title: "Student not found",
          description: "Please select a child to continue.",
          variant: "destructive",
        });
        return;
      }

      setIsGenerating(true);
      let latestGuideActivities: ActivityWithSource[] = [];
      try {
        const [guideActivities, history] = await Promise.all([
          getActivitiesFromTeachingGuides(studentId, user.email),
          getActivityHistory(studentId),
        ]);
        latestGuideActivities = guideActivities;
        setAvailableActivities(guideActivities);

        const completedSet = new Set(history.map((a) => a.activity_name));
        setCompletedActivities(completedSet);
        setActivityHistory(history);

        if (guideActivities.length === 0) {
          setRecommendations([]);
          setFilteredRecommendations([]);
          setSummary("");
          setInsights([]);
          setGenerationError("We couldn't find activities for this profile yet. Please check back soon.");
          return;
        }

        const availableTimeLabel = options?.availableTimeLabel;
        const availableTime =
          availableTimeLabel === "short"
            ? 10
            : availableTimeLabel === "medium"
            ? 20
            : availableTimeLabel === "long"
            ? 35
            : 30;

        const response = await getAIActivityRecommendations(
          {
            studentId,
            student,
            clerkId: user.clerk_id,
            availableTime,
            preferredTypes: options?.preferredType ? [options.preferredType] : undefined,
            limit: 6,
          },
          guideActivities
        );

        setRecommendations(response.recommendations);
        setSummary(response.summary);
        setInsights(response.insights || []);
        setGenerationError(null);
        setLastGeneratedAt(new Date());

        if (options?.showToast) {
          toast({
            title: "New recommendations ready",
            description: "We generated fresh, personalized activities for your child.",
          });
        }
      } catch (error) {
        console.error("Error generating activities:", error);
        setGenerationError("We couldn't personalize activities right now. Showing standard ideas instead.");
        const fallbackSource = latestGuideActivities.length > 0 ? latestGuideActivities : availableActivities;
        if (fallbackSource.length > 0) {
          const fallbackRecommendations = buildFallbackRecommendations(fallbackSource);
          setRecommendations(fallbackRecommendations);
          setSummary("Activities pulled from your child's teaching guide.");
          setInsights([]);
        } else {
          setRecommendations([]);
          setSummary("");
          setInsights([]);
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [availableActivities, students, toast, user?.clerk_id, user?.email]
  );

  useEffect(() => {
    if (!selectedStudentId || !user?.email || students.length === 0) {
      setRecommendations([]);
      setFilteredRecommendations([]);
      return;
    }

    void generatePersonalizedActivities(selectedStudentId);
  }, [generatePersonalizedActivities, selectedStudentId, students.length, user?.email]);

  // Apply filters
  useEffect(() => {
    let filtered = [...recommendations];

    // Time filter
    if (timeFilter !== 'all') {
      filtered = filtered.filter(rec => {
        const minutes = parseDurationToMinutes(rec.activity.duration);
        if (timeFilter === 'short') return minutes <= 12;
        if (timeFilter === 'medium') return minutes > 12 && minutes <= 25;
        if (timeFilter === 'long') return minutes > 25;
        return true;
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(rec => (rec.activity.type || 'general') === typeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec => 
        rec.activity.name.toLowerCase().includes(query) ||
        rec.activity.materials?.some(m => m.toLowerCase().includes(query)) ||
        rec.activity.steps?.some(s => s.toLowerCase().includes(query))
      );
    }

    setFilteredRecommendations(filtered);
  }, [recommendations, timeFilter, typeFilter, searchQuery]);

  const handleMarkComplete = async (activity: ActivityWithSource) => {
    if (!user?.id || !selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select a child first",
        variant: "destructive",
      });
      return;
    }

    try {
      const isCompleted = completedActivities.has(activity.name);
      
      if (isCompleted) {
        // Unmark - in production, you might want to delete the log entry
        setCompletedActivities(prev => {
          const newSet = new Set(prev);
          newSet.delete(activity.name);
          return newSet;
        });
        toast({
          title: "Activity unmarked",
          description: "You can try this activity again!",
        });
      } else {
        // Mark as completed and log it
        await logActivityCompletion(
          user.id,
          selectedStudentId,
          activity
        );
        
        setCompletedActivities(prev => {
          const newSet = new Set(prev);
          newSet.add(activity.name);
          return newSet;
        });
        
        // Refresh activity history
        const history = await getActivityHistory(selectedStudentId);
        setActivityHistory(history);
        
        toast({
          title: "Activity completed! 🎉",
          description: "Great job supporting your child's learning!",
        });
      }
    } catch (error) {
      console.error('Error marking activity complete:', error);
      toast({
        title: "Error",
        description: "Failed to save activity completion",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateClick = () => {
    if (!selectedStudentId) return;
    const preferredType =
      typeFilter !== "all" ? (typeFilter as "strength" | "support" | "flexibility" | "general") : undefined;
    void generatePersonalizedActivities(selectedStudentId, {
      preferredType,
      availableTimeLabel: timeFilter,
      showToast: true,
    });
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'strength':
        return <Badge className="bg-green-100 text-green-800">Strength</Badge>;
      case 'support':
        return <Badge className="bg-blue-100 text-blue-800">Support</Badge>;
      case 'flexibility':
        return <Badge className="bg-purple-100 text-purple-800">Flexibility</Badge>;
      default:
        return <Badge variant="secondary">General</Badge>;
    }
  };

  if (isLoadingStudents && students.length === 0) {
    return (
      <ProtectedRoute requireRole="parent">
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading activities...</p>
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">Daily Activities</h1>
                  <p className="text-muted-foreground">
                    Find fun, educational activities to support your child's learning at home
                  </p>
                </div>
              </div>
            </div>

            {/* No Children */}
            {students.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Linked Students</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Your email ({user?.email}) is not linked to any students yet.
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

            {/* Filters and Search */}
            {selectedStudentId && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filter Activities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search activities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Time</label>
                        <Select value={timeFilter} onValueChange={setTimeFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All times" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Times</SelectItem>
                            <SelectItem value="short">5-10 minutes</SelectItem>
                            <SelectItem value="medium">15-20 minutes</SelectItem>
                            <SelectItem value="long">30+ minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="strength">Strengths</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                            <SelectItem value="flexibility">Flexibility</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Activities Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {filteredRecommendations.length} Activity{filteredRecommendations.length !== 1 ? 'ies' : ''} Ready
                      </h2>
                      {lastGeneratedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last updated {lastGeneratedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handleRegenerateClick} disabled={isGenerating}>
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-4 h-4 mr-2" />
                            Generate New Activities
                          </>
                        )}
                      </Button>
                      {selectedStudentId && (
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/parent/learning-snapshot/${selectedStudentId}`)}
                        >
                          View Learning Profile
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => router.push('/parent/challenges')}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Try Adaptability Challenges
                      </Button>
                    </div>
                  </div>

                  {generationError && (
                    <Card>
                      <CardContent className="py-4">
                        <p className="text-sm text-yellow-800">{generationError}</p>
                      </CardContent>
                    </Card>
                  )}

                  {summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Personalized Summary</CardTitle>
                        <CardDescription>{summary}</CardDescription>
                      </CardHeader>
                      {insights && insights.length > 0 && (
                        <CardContent>
                          <p className="text-sm font-medium mb-2">Key insights:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {insights.map((insight, idx) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {filteredRecommendations.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Activities Found</h3>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                          Try adjusting your filters or tap “Generate New Activities” to refresh personalized ideas.
                        </p>
                        <Button onClick={handleRegenerateClick} disabled={isGenerating}>
                          Generate Activities
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRecommendations.map((recommendation, index) => {
                        const { activity } = recommendation;
                        const isCompleted = completedActivities.has(activity.name);
                        return (
                          <Card 
                            key={index} 
                            className={`hover:shadow-md transition-shadow ${
                              isCompleted ? 'bg-green-50 border-green-200' : ''
                            }`}
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg flex items-center gap-2 mb-2">
                                    {activity.name}
                                    {isCompleted && (
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    )}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {activity.duration}
                                    </Badge>
                                    {getTypeBadge(activity.type)}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex flex-wrap gap-3 text-xs uppercase tracking-wide text-foreground/70">
                                  <span>Confidence {(recommendation.confidence * 100).toFixed(0)}%</span>
                                  <span>Best time: {recommendation.bestTimeOfDay}</span>
                                  <span>Engagement {recommendation.estimatedEngagement}/5</span>
                                  <span>Duration ~{recommendation.expectedDuration} min</span>
                                </div>
                                <p>{recommendation.reasoning}</p>
                                <p className="text-xs">
                                  <strong>Why now:</strong> {recommendation.whyNow}
                                </p>
                                <p className="text-xs">
                                  <strong>Expected outcome:</strong> {recommendation.expectedOutcome}
                                </p>
                              </div>

                              {activity.materials && activity.materials.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Materials Needed:
                                  </p>
                                  <ul className="text-sm space-y-1">
                                    {activity.materials.map((material, idx) => (
                                      <li key={idx} className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-primary" />
                                        {material}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {activity.steps && activity.steps.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Steps:
                                  </p>
                                  <ol className="text-sm space-y-1">
                                    {activity.steps.map((step, idx) => (
                                      <li key={idx} className="flex gap-2">
                                        <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center shrink-0 text-xs">
                                          {idx + 1}
                                        </Badge>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              {activity.differentiation && (
                                <div className="bg-secondary/50 p-3 rounded-lg">
                                  <p className="text-xs font-medium text-foreground mb-1">
                                    Tip:
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {activity.differentiation}
                                  </p>
                                </div>
                              )}

                              <Button
                                variant={isCompleted ? "outline" : "default"}
                                className="w-full"
                                onClick={() => handleMarkComplete(activity)}
                              >
                                {isCompleted ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Mark as Completed
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

