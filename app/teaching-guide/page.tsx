'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Zap,
  Activity,
  Eye,
  Brain,
  Heart,
  Target,
  Repeat,
  BookOpen,
  Loader2,
  Volume2,
  Hand,
  Users,
  User,
} from "lucide-react";
import { StudentCategory, categoryDisplayNames } from "@/lib/supabase";
import { TeachingGuidePanel } from "@/components/TeachingGuidePanel";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Base category configuration with icons, colors, and descriptions
// Student counts will be populated dynamically from the database
const baseCategoryConfig: Record<
  StudentCategory,
  { icon: typeof Clock; color: string; description: string }
> = {
  slow_processing: {
    icon: Clock,
    color: "from-blue-500 to-cyan-500",
    description: "Students who need extra time to process information and complete tasks",
  },
  fast_processor: {
    icon: Zap,
    color: "from-yellow-500 to-orange-500",
    description: "Students who grasp concepts quickly and need enrichment",
  },
  high_energy: {
    icon: Activity,
    color: "from-green-500 to-emerald-500",
    description: "Students who learn best through movement and hands-on activities",
  },
  visual_learner: {
    icon: Eye,
    color: "from-purple-500 to-pink-500",
    description: "Students who learn best through visual representations and diagrams",
  },
  auditory_learner: {
    icon: Volume2,
    color: "from-yellow-500 to-amber-500",
    description: "Students who learn best through listening and verbal instruction",
  },
  kinesthetic_learner: {
    icon: Hand,
    color: "from-pink-500 to-rose-500",
    description: "Students who learn through touch, movement, and doing",
  },
  logical_learner: {
    icon: Brain,
    color: "from-indigo-500 to-blue-500",
    description: "Students who excel with structured, sequential thinking",
  },
  sensitive_low_confidence: {
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    description: "Students who need emotional support and confidence building",
  },
  easily_distracted: {
    icon: Target,
    color: "from-red-500 to-orange-500",
    description: "Students who struggle with sustained attention and focus",
  },
  needs_repetition: {
    icon: Repeat,
    color: "from-teal-500 to-cyan-500",
    description: "Students who benefit from repeated practice and review",
  },
  social_learner: {
    icon: Users,
    color: "from-cyan-500 to-blue-500",
    description: "Students who learn best through interaction and collaboration",
  },
  independent_learner: {
    icon: User,
    color: "from-slate-500 to-gray-500",
    description: "Students who prefer to work alone and self-direct learning",
  },
};

export default function TeachingGuide() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<StudentCategory | null>(null);
  const [curriculumTopic, setCurriculumTopic] = useState("mathematics");
  const [categoryCounts, setCategoryCounts] = useState<Record<StudentCategory, number>>({} as Record<StudentCategory, number>);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  /**
   * Fetches real student counts for each learning category from the database.
   * Counts students based on primary_category or category_scores >= 50.
   */
  const loadStudentCounts = async () => {
    if (!user?.id) return;

    setIsLoadingCounts(true);
    try {
      // Get all classes for this teacher
      const { data: classes, error: classesError } = await supabase
        .from("classes")
        .select("id")
        .eq("user_id", user.id);

      if (classesError) throw classesError;

      if (!classes || classes.length === 0) {
        // Initialize all counts to 0
        const emptyCounts = {} as Record<StudentCategory, number>;
        (Object.keys(baseCategoryConfig) as StudentCategory[]).forEach(cat => {
          emptyCounts[cat] = 0;
        });
        setCategoryCounts(emptyCounts);
        setTotalStudents(0);
        setIsLoadingCounts(false);
        return;
      }

      const classIds = classes.map(c => c.id);

      // Get all students from teacher's classes
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, primary_category, category_scores")
        .in("class_id", classIds);

      if (studentsError) throw studentsError;

      setTotalStudents(students?.length || 0);

      // Count students for each category
      const counts = {} as Record<StudentCategory, number>;
      
      // Initialize all counts to 0
      (Object.keys(baseCategoryConfig) as StudentCategory[]).forEach(cat => {
        counts[cat] = 0;
      });

      // Count students for each category
      (students || []).forEach(student => {
        // Count primary category
        if (student.primary_category && student.primary_category in baseCategoryConfig) {
          counts[student.primary_category as StudentCategory]++;
        }

        // Count categories from category_scores (score >= 50)
        if (student.category_scores && typeof student.category_scores === 'object') {
          Object.entries(student.category_scores).forEach(([categoryKey, score]) => {
            if (
              categoryKey in baseCategoryConfig &&
              typeof score === 'number' &&
              score >= 50 &&
              student.primary_category !== categoryKey // Don't double-count primary category
            ) {
              counts[categoryKey as StudentCategory]++;
            }
          });
        }
      });

      setCategoryCounts(counts);
    } catch (error) {
      console.error("Error loading student counts:", error);
      // Initialize all counts to 0 on error
      const emptyCounts = {} as Record<StudentCategory, number>;
      (Object.keys(baseCategoryConfig) as StudentCategory[]).forEach(cat => {
        emptyCounts[cat] = 0;
      });
      setCategoryCounts(emptyCounts);
    } finally {
      setIsLoadingCounts(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadStudentCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Create categoryConfig with dynamic counts
  const categoryConfig: Record<
    StudentCategory,
    { icon: typeof Clock; color: string; description: string; studentCount: number }
  > = {} as any;

  (Object.keys(baseCategoryConfig) as StudentCategory[]).forEach(category => {
    categoryConfig[category] = {
      ...baseCategoryConfig[category],
      studentCount: categoryCounts[category] || 0,
    };
  });

  const handleOpenGuide = (category: StudentCategory) => {
    setSelectedCategory(category);
  };

  const handleClosePanel = () => {
    setSelectedCategory(null);
  };

  return (
    <ProtectedRoute requireRole="teacher">
      <Layout>
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">Teaching Guide</h1>
                  <p className="text-muted-foreground">
                    AI-powered strategies for every learning profile
                  </p>
                </div>
              </div>

              {/* Class Summary */}
              <Card className="bg-gradient-to-br from-pastel-mint/20 to-pastel-sky/20 border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Class Intelligence Summary</CardTitle>
                  <CardDescription>
                    Your class has {totalStudents} students with diverse learning profiles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This guide combines research from educational websites, teaching blogs, and YouTube
                    expert videos to provide you with the most effective strategies for each student
                    category. Each guide is generated based on current best practices.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Category Cards Grid */}
            {isLoadingCounts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading student counts...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Object.keys(categoryConfig) as StudentCategory[]).map((category) => {
                  const config = categoryConfig[category];
                  const Icon = config.icon;

                  return (
                    <Card
                      key={category}
                      className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}
                            >
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {categoryDisplayNames[category] || category.replace(/_/g, ' ')}
                              </CardTitle>
                              <Badge variant="secondary" className="mt-1">
                                {config.studentCount} {config.studentCount === 1 ? 'student' : 'students'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <CardDescription className="mt-3">{config.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => handleOpenGuide(category)}
                          className="w-full bg-gradient-to-r from-primary to-info hover:opacity-90"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          View Teaching Guide
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Info Card */}
            <Card className="bg-gradient-to-br from-pastel-lavender/20 to-pastel-coral/20 border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Powered by AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Each teaching guide is generated in real-time using:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• Latest educational research and articles</li>
                  <li>• Expert teaching videos and demonstrations</li>
                  <li>• AI powered insight generation</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Teaching Guide Panel (Drawer/Modal) */}
          {selectedCategory && (
            <TeachingGuidePanel
              category={selectedCategory}
              curriculumTopic={curriculumTopic}
              audience="teacher"
              classId={user?.id ? `teacher-${user.id}` : "demo-class"}
              studentCount={categoryConfig[selectedCategory].studentCount}
              onClose={handleClosePanel}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

