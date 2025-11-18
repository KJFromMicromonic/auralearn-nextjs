'use client';

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Zap,
  Eye,
  Volume2,
  Activity,
  Target,
  Hand,
  Heart,
  Focus,
  Repeat,
  Users,
  User,
  Loader2,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { DEFAULT_LEARNING_CATEGORIES, LearningCategory } from "@/lib/learning-categories";

interface StudentWithCategories {
  id: string;
  name: string;
  primary_category: string | null;
  category_scores: Record<string, number>;
  latest_score: number | null;
}

export default function StudentCategories() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [students, setStudents] = useState<StudentWithCategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    slow_processing: Brain,
    fast_processor: Zap,
    visual_learner: Eye,
    auditory_learner: Volume2,
    high_energy: Activity,
    logical_learner: Target,
    kinesthetic_learner: Hand,
    sensitive_low_confidence: Heart,
    easily_distracted: Focus,
    needs_repetition: Repeat,
    social_learner: Users,
    independent_learner: User,
  };

  const categoryColors: Record<string, string> = {
    slow_processing: "bg-blue-100 text-blue-800 border-blue-300",
    fast_processor: "bg-purple-100 text-purple-800 border-purple-300",
    visual_learner: "bg-green-100 text-green-800 border-green-300",
    auditory_learner: "bg-yellow-100 text-yellow-800 border-yellow-300",
    high_energy: "bg-orange-100 text-orange-800 border-orange-300",
    logical_learner: "bg-indigo-100 text-indigo-800 border-indigo-300",
    kinesthetic_learner: "bg-pink-100 text-pink-800 border-pink-300",
    sensitive_low_confidence: "bg-red-100 text-red-800 border-red-300",
    easily_distracted: "bg-teal-100 text-teal-800 border-teal-300",
    needs_repetition: "bg-amber-100 text-amber-800 border-amber-300",
    social_learner: "bg-cyan-100 text-cyan-800 border-cyan-300",
    independent_learner: "bg-slate-100 text-slate-800 border-slate-300",
  };

  const loadCategoriesAndStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load learning categories from database
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("learning_categories")
        .select("*")
        .eq("is_active", true)
        .order("category_name");

      // If table doesn't exist or query fails, use static fallback data
      if (categoriesError) {
        console.warn("Could not load learning categories from database, using fallback data:", categoriesError);
        // Check if it's a table not found error (PGRST205)
        if (categoriesError.code === 'PGRST205' || categoriesError.message?.includes('Could not find the table')) {
          setCategories(DEFAULT_LEARNING_CATEGORIES);
        } else {
          throw categoriesError;
        }
      } else {
        // Transform database data to match interface (handle JSONB arrays)
        const transformedCategories = (categoriesData || []).map((cat: any) => ({
          category_key: cat.category_key,
          category_name: cat.category_name,
          description: cat.description || '',
          characteristics: Array.isArray(cat.characteristics) ? cat.characteristics : [],
          teaching_strategies: Array.isArray(cat.teaching_strategies) ? cat.teaching_strategies : [],
          typical_behaviors: Array.isArray(cat.typical_behaviors) ? cat.typical_behaviors : [],
          improvement_tips: Array.isArray(cat.improvement_tips) ? cat.improvement_tips : [],
        }));
        setCategories(transformedCategories.length > 0 ? transformedCategories : DEFAULT_LEARNING_CATEGORIES);
      }

      // Load students from teacher's classes
      const { data: classes } = await supabase
        .from("classes")
        .select("id")
        .eq("user_id", user?.id);

      if (!classes || classes.length === 0) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      const classIds = classes.map((c) => c.id);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, primary_category, category_scores")
        .in("class_id", classIds)
        .order("name");

      if (studentsError) throw studentsError;

      // Get latest scores for each student
      const studentsWithScores = await Promise.all(
        (studentsData || []).map(async (student) => {
          const { data: assessments } = await supabase
            .from("student_assessments")
            .select("score")
            .eq("student_id", student.id)
            .order("assessment_date", { ascending: false })
            .limit(1);

          return {
            ...student,
            latest_score: assessments?.[0]?.score || null,
            category_scores: student.category_scores || {},
          };
        })
      );

      setStudents(studentsWithScores);
    } catch (error: unknown) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load category data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadCategoriesAndStudents();
    }
  }, [user?.id, loadCategoriesAndStudents]);

  const getStudentsByCategory = (categoryKey: string): StudentWithCategories[] => {
    return students.filter(
      (student) =>
        student.primary_category === categoryKey ||
        (student.category_scores && student.category_scores[categoryKey] >= 50)
    );
  };

  const getStudentCategoryStrength = (student: StudentWithCategories, categoryKey: string): number => {
    if (student.primary_category === categoryKey) return 100;
    return student.category_scores?.[categoryKey] || 0;
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireRole="teacher">
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-lg text-gray-600">Loading learning categories...</p>
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
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Learning Categories</h1>
            <p className="text-muted-foreground">
              Understand your students' learning styles and get personalized teaching strategies
            </p>
          </div>

          {/* Category Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">All Categories</TabsTrigger>
              <TabsTrigger value="students">Students by Category</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Distribution</CardTitle>
                  <CardDescription>How your students are distributed across learning categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {categories.map((category) => {
                      const studentCount = getStudentsByCategory(category.category_key).length;
                      const Icon = categoryIcons[category.category_key] || Brain;

                      return (
                        <Card
                          key={category.category_key}
                          className={`cursor-pointer transition-all hover:shadow-lg ${
                            selectedCategory === category.category_key ? "ring-2 ring-purple-500" : ""
                          }`}
                          onClick={() => setSelectedCategory(category.category_key)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Icon className="h-8 w-8 text-purple-600" />
                              <div className="text-3xl font-bold text-purple-600">{studentCount}</div>
                            </div>
                            <div className="text-sm font-semibold text-gray-800 mb-1">
                              {category.category_name}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-2">{category.description}</div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Category Details */}
              {selectedCategory && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {categories.find((c) => c.category_key === selectedCategory)?.category_name}
                    </CardTitle>
                    <CardDescription>
                      {categories.find((c) => c.category_key === selectedCategory)?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Students in this category */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">
                        Students ({getStudentsByCategory(selectedCategory).length})
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {getStudentsByCategory(selectedCategory).map((student) => {
                          const strength = getStudentCategoryStrength(student, selectedCategory);
                          return (
                            <div
                              key={student.id}
                              onClick={() => router.push(`/student-guide/${student.id}`)}
                              className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer transition-all flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-sm">{student.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Strength: {strength}%
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Teaching Strategies */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Teaching Strategies
                      </h3>
                      <ul className="space-y-2">
                        {categories
                          .find((c) => c.category_key === selectedCategory)
                          ?.teaching_strategies.map((strategy, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="mt-1 h-2 w-2 rounded-full bg-purple-600 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{strategy}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* All Categories Tab */}
            <TabsContent value="categories" className="space-y-4">
              {categories.map((category) => {
                const Icon = categoryIcons[category.category_key] || Brain;
                const studentCount = getStudentsByCategory(category.category_key).length;

                return (
                  <Card key={category.category_key}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${categoryColors[category.category_key]}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle>{category.category_name}</CardTitle>
                            <CardDescription>{category.description}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                          {studentCount} student{studentCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Characteristics */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Characteristics</h4>
                        <div className="flex flex-wrap gap-2">
                          {category.characteristics.map((char, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {char}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Teaching Strategies */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">
                          Teaching Strategies
                        </h4>
                        <ul className="grid grid-cols-2 gap-2">
                          {category.teaching_strategies.slice(0, 4).map((strategy, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-600 flex-shrink-0" />
                              <span className="text-gray-600">{strategy}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* View Students */}
                      {studentCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCategory(category.category_key)}
                          className="w-full"
                        >
                          View {studentCount} Student{studentCount !== 1 ? "s" : ""}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* Students by Category Tab */}
            <TabsContent value="students" className="space-y-6">
              {students.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-gray-500">No students found. Create a class and add students to get started.</p>
                  <Button onClick={() => router.push("/create-class")} className="mt-4">
                    Create Class
                  </Button>
                </Card>
              ) : (
                students.map((student) => {
                  const studentCategories = Object.entries(student.category_scores || {})
                    .filter(([_, score]) => score >= 50)
                    .sort(([_, a], [__, b]) => b - a);

                  const primaryCategory = categories.find(
                    (c) => c.category_key === student.primary_category
                  );

                  return (
                    <Card key={student.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{student.name}</CardTitle>
                            <CardDescription>
                              {studentCategories.length === 0
                                ? "No categories detected yet"
                                : `${studentCategories.length} learning ${
                                    studentCategories.length === 1 ? "style" : "styles"
                                  } detected`}
                            </CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/student-guide/${student.id}`)}
                          >
                            View Profile
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Primary Category */}
                        {primaryCategory && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 text-gray-700">
                              Primary Learning Style
                            </h4>
                            <div
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                                categoryColors[primaryCategory.category_key]
                              } border-2`}
                            >
                              {React.createElement(categoryIcons[primaryCategory.category_key] || Brain, {
                                className: "h-5 w-5",
                              })}
                              <span className="font-semibold">{primaryCategory.category_name}</span>
                            </div>
                          </div>
                        )}

                        {/* All Categories with Strength */}
                        {studentCategories.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3 text-gray-700">
                              All Learning Styles
                            </h4>
                            <div className="space-y-3">
                              {studentCategories.map(([categoryKey, score]) => {
                                const category = categories.find((c) => c.category_key === categoryKey);
                                if (!category) return null;

                                const Icon = categoryIcons[categoryKey] || Brain;

                                return (
                                  <div key={categoryKey} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-gray-600" />
                                        <span className="text-sm font-medium">{category.category_name}</span>
                                      </div>
                                      <span className="text-sm text-gray-600">{score}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-purple-600 transition-all"
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Latest Score */}
                        {student.latest_score !== null && (
                          <div className="pt-2 border-t">
                            <span className="text-sm text-gray-600">
                              Latest Assessment: <strong>{student.latest_score}/10</strong>
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

