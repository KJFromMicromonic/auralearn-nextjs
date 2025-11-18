import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, BookOpen, AlertCircle, Brain } from "lucide-react";
import { StudentCategory } from "@/lib/supabase";
import { TeachingGuidePanel } from "@/components/TeachingGuidePanel";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentsForParent, StudentWithClass } from "@/services/student-service";
import ChildSwitcher from "@/components/ChildSwitcher";
import { useToast } from "@/hooks/use-toast";

export default function ParentGuide() {
  const { user, isParent } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [curriculumTopic, setCurriculumTopic] = useState("");
  const [showGuidePanel, setShowGuidePanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch linked students for parent
  useEffect(() => {
    async function loadStudents() {
      if (!user?.email) return;

      try {
        setIsLoading(true);
        const linkedStudents = await getStudentsForParent(user.email);
        setStudents(linkedStudents);

        // Auto-select if only one child
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleGenerateGuide = () => {
    if (!curriculumTopic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a curriculum topic",
        variant: "destructive",
      });
      return;
    }
    setShowGuidePanel(true);
  };

  const handleClosePanel = () => {
    setShowGuidePanel(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your children...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Parent Guide</h1>
              <p className="text-muted-foreground">
                Personalized strategies to support your child's learning at home
              </p>
            </div>
          </div>

          {/* Welcome Card */}
          <Card className="bg-gradient-to-br from-pastel-mint/20 to-pastel-lavender/20 border-none">
            <CardHeader>
              <CardTitle className="text-lg">Welcome, {user?.full_name || 'Parent'}!</CardTitle>
              <CardDescription>
                Here's how you can support your {students.length === 1 ? "child's" : "children's"} unique learning style at home
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every child learns differently. These personalized guides provide practical, easy-to-implement
                strategies based on your child's learning profile and current classroom topics. No complex
                jargon - just simple, effective ways to help your child thrive.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* No Children Linked */}
        {students.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Linked Students</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Your email ({user?.email}) is not linked to any students yet. Please contact your child's teacher
                to have your email added to their student profile.
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

        {/* Cognitive Assessment Card */}
        {selectedStudent && (
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Cognitive Assessment
              </CardTitle>
              <CardDescription>
                Complete a voice or web-based cognitive assessment for {selectedStudent.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Help us understand how {selectedStudent.name} learns best through a quick 15-question assessment.
                Available in voice mode (AuraVoice) or traditional web form.
              </p>
              <Button
                onClick={() => window.location.href = `/parent/cognitive-assessment/${selectedStudent.id}`}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
              >
                <Brain className="w-4 h-4 mr-2" />
                Start Cognitive Assessment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Topic Input and Generate Button */}
        {selectedStudent && (
          <Card>
            <CardHeader>
              <CardTitle>Generate Parent Support Guide</CardTitle>
              <CardDescription>
                Enter the topic your child is currently learning in class
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Curriculum Topic
                </label>
                <Input
                  placeholder="e.g., Fractions and Decimals, Reading Comprehension, etc."
                  value={curriculumTopic}
                  onChange={(e) => setCurriculumTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateGuide()}
                />
              </div>
              <Button
                onClick={handleGenerateGuide}
                disabled={!curriculumTopic.trim()}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90"
              >
                <Heart className="w-4 h-4 mr-2" />
                Generate Support Strategies
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        {students.length > 0 && (
          <Card className="bg-gradient-to-br from-pastel-sky/20 to-pastel-coral/20 border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                What You'll Find in Each Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Simple strategies you can use during homework time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Fun activities using everyday household items</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Helpful videos and articles from trusted education experts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>A weekly checklist of small actions to support your child</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Tips for building confidence and motivation</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Parent Guide Panel */}
      {showGuidePanel && selectedStudent && (
        <TeachingGuidePanel
          category={selectedStudent.primary_category as StudentCategory}
          curriculumTopic={curriculumTopic}
          audience="parent"
          classId={selectedStudent.class_id || ''}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
