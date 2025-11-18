import { useState } from "react";
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
} from "lucide-react";
import { StudentCategory, categoryDisplayNames } from "@/lib/supabase";
import { TeachingGuidePanel } from "@/components/TeachingGuidePanel";

// Category configuration with icons and colors
const categoryConfig: Record<
  StudentCategory,
  { icon: typeof Clock; color: string; description: string; studentCount: number }
> = {
  slow_processing: {
    icon: Clock,
    color: "from-blue-500 to-cyan-500",
    description: "Students who need extra time to process information and complete tasks",
    studentCount: 5,
  },
  fast_processor: {
    icon: Zap,
    color: "from-yellow-500 to-orange-500",
    description: "Students who grasp concepts quickly and need enrichment",
    studentCount: 7,
  },
  high_energy: {
    icon: Activity,
    color: "from-green-500 to-emerald-500",
    description: "Students who learn best through movement and hands-on activities",
    studentCount: 6,
  },
  visual_learner: {
    icon: Eye,
    color: "from-purple-500 to-pink-500",
    description: "Students who learn best through visual representations and diagrams",
    studentCount: 8,
  },
  logical_learner: {
    icon: Brain,
    color: "from-indigo-500 to-blue-500",
    description: "Students who excel with structured, sequential thinking",
    studentCount: 6,
  },
  sensitive_low_confidence: {
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    description: "Students who need emotional support and confidence building",
    studentCount: 4,
  },
  easily_distracted: {
    icon: Target,
    color: "from-red-500 to-orange-500",
    description: "Students who struggle with sustained attention and focus",
    studentCount: 5,
  },
  needs_repetition: {
    icon: Repeat,
    color: "from-teal-500 to-cyan-500",
    description: "Students who benefit from repeated practice and review",
    studentCount: 6,
  },
};

export default function TeachingGuide() {
  const [selectedCategory, setSelectedCategory] = useState<StudentCategory | null>(null);
  const [curriculumTopic, setCurriculumTopic] = useState("mathematics");

  // Get class data from localStorage (in production, fetch from Supabase)
  const classData = JSON.parse(localStorage.getItem("currentClass") || "{}");
  const totalStudents = classData.students?.length || 30;

  const handleOpenGuide = (category: StudentCategory) => {
    setSelectedCategory(category);
  };

  const handleClosePanel = () => {
    setSelectedCategory(null);
  };

  return (
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
                          {categoryDisplayNames[category]}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {config.studentCount} students
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
          classId={classData.id || "demo-class"}
          studentCount={categoryConfig[selectedCategory].studentCount}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
