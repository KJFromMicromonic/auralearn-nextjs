import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Brain,
  FileText,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Assessment {
  id: string;
  assessment_date: string;
  score: number;
  total_questions: number;
  category_determined: string;
  confidence_score: number;
  time_taken: number;
}

interface StudentData {
  id: string;
  name: string;
  parent_email: string | null;
  parent_email_2: string | null;
  primary_category: string | null;
  assessments: Assessment[];
}

interface StudentNote {
  id: string;
  note_text: string;
  note_type: string;
  created_at: string;
  updated_at: string;
}

export default function StudentGuide() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [student, setStudent] = useState<StudentData | null>(null);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<string>("observation");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const loadStudentData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load student info
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, name, parent_email, parent_email_2, primary_category")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      // Load all assessments for this student
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from("student_assessments")
        .select("*")
        .eq("student_id", studentId)
        .order("assessment_date", { ascending: false });

      if (assessmentsError) throw assessmentsError;

      setStudent({
        ...studentData,
        assessments: assessmentsData || [],
      });
    } catch (error: unknown) {
      console.error("Error loading student data:", error);
      toast({
        title: "Error",
        description: "Failed to load student information.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, user?.id]);

  const loadNotes = useCallback(async () => {
    try {
      const { data: notesData, error: notesError } = await supabase
        .from("student_notes")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_id", user?.id)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);
    } catch (error: unknown) {
      console.error("Error loading notes:", error);
    }
  }, [studentId, user?.id]);

  useEffect(() => {
    if (studentId && user?.id) {
      loadStudentData();
      loadNotes();
    }
  }, [studentId, user?.id, loadStudentData, loadNotes]);

  const saveNote = async () => {
    if (!newNote.trim()) {
      toast({
        title: "Note is empty",
        description: "Please enter a note before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingNote(true);
    try {
      const { data, error } = await supabase
        .from("student_notes")
        .insert({
          student_id: studentId,
          teacher_id: user?.id,
          note_text: newNote.trim(),
          note_type: noteType,
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNote("");
      toast({
        title: "Note saved",
        description: "Your note has been saved successfully.",
      });
    } catch (error: unknown) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const getCategoryDisplayName = (category: string | null): string => {
    if (!category) return "Not yet assessed";
    const categoryNames: Record<string, string> = {
      slow_processing: "Slow Processing",
      fast_processor: "Fast Processor",
      high_energy: "High Energy",
      visual_learner: "Visual Learner",
      logical_learner: "Logical Learner",
      sensitive_low_confidence: "Sensitive/Low Confidence",
      easily_distracted: "Easily Distracted",
      needs_repetition: "Needs Repetition",
      average_learner: "Average Learner",
    };
    return categoryNames[category] || category;
  };

  const getCategoryStrategies = (category: string | null): string[] => {
    const strategies: Record<string, string[]> = {
      slow_processing: [
        "Break down tasks into smaller, manageable steps",
        "Provide extra time for processing information",
        "Use visual aids and hands-on materials",
        "Repeat instructions in different ways",
        "Check for understanding frequently",
      ],
      fast_processor: [
        "Provide advanced materials and enrichment activities",
        "Encourage leadership roles in group work",
        "Offer independent study projects",
        "Challenge with higher-order thinking questions",
        "Assign mentoring roles to help other students",
      ],
      high_energy: [
        "Incorporate movement breaks into lessons",
        "Use active learning strategies (games, group work)",
        "Provide fidget tools or flexible seating",
        "Channel energy into leadership activities",
        "Break lessons into shorter, focused segments",
      ],
      visual_learner: [
        "Use diagrams, charts, and graphic organizers",
        "Incorporate videos and demonstrations",
        "Color-code materials and notes",
        "Use mind maps for complex concepts",
        "Provide written instructions alongside verbal",
      ],
      logical_learner: [
        "Present information in a structured, sequential manner",
        "Use problem-solving activities and puzzles",
        "Connect lessons to real-world applications",
        "Encourage pattern recognition and categorization",
        "Provide opportunities for analysis and reasoning",
      ],
      sensitive_low_confidence: [
        "Build confidence through small, achievable goals",
        "Provide frequent, specific positive feedback",
        "Create a supportive, low-pressure environment",
        "Use private check-ins instead of public questioning",
        "Celebrate effort and progress, not just results",
      ],
      easily_distracted: [
        "Seat near the front, away from distractions",
        "Use clear, concise instructions",
        "Break tasks into shorter intervals with breaks",
        "Provide fidget tools or sensory breaks",
        "Use visual and auditory cues to regain focus",
      ],
      needs_repetition: [
        "Review previous lessons before introducing new material",
        "Use spaced repetition for key concepts",
        "Provide multiple examples of the same concept",
        "Incorporate regular practice and review sessions",
        "Use different modalities (visual, auditory, kinesthetic)",
      ],
    };

    return strategies[category || ""] || [
      "Continue assessing to determine best teaching strategies",
      "Observe learning preferences and adapt accordingly",
      "Maintain consistent communication with parents",
    ];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getNoteTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      observation: "bg-blue-100 text-blue-800",
      behavior: "bg-yellow-100 text-yellow-800",
      academic: "bg-green-100 text-green-800",
      parent_contact: "bg-purple-100 text-purple-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors.other;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-12 text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-700 mb-2">Student Not Found</h3>
          <p className="text-gray-500 mb-6">
            We couldn't find this student in your classes.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const latestAssessment = student.assessments[0];
  const improvementTrend =
    student.assessments.length >= 2
      ? student.assessments[0].score > student.assessments[1].score
        ? "up"
        : student.assessments[0].score < student.assessments[1].score
        ? "down"
        : "stable"
      : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-foreground">{student.name}</h1>
            <p className="text-muted-foreground">
              {getCategoryDisplayName(student.primary_category)}
            </p>
          </div>
        </div>
        {latestAssessment && (
          <div className="flex items-center gap-2">
            {improvementTrend === "up" && <TrendingUp className="h-6 w-6 text-green-600" />}
            {improvementTrend === "down" && <TrendingDown className="h-6 w-6 text-red-600" />}
            {improvementTrend === "stable" && <Minus className="h-6 w-6 text-gray-600" />}
          </div>
        )}
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {student.parent_email && (
            <div>
              <span className="text-sm text-muted-foreground">Primary Parent: </span>
              <a href={`mailto:${student.parent_email}`} className="text-blue-600 hover:underline">
                {student.parent_email}
              </a>
            </div>
          )}
          {student.parent_email_2 && (
            <div>
              <span className="text-sm text-muted-foreground">Secondary Parent: </span>
              <a
                href={`mailto:${student.parent_email_2}`}
                className="text-blue-600 hover:underline"
              >
                {student.parent_email_2}
              </a>
            </div>
          )}
          {!student.parent_email && !student.parent_email_2 && (
            <p className="text-sm text-muted-foreground">No parent contact information on file</p>
          )}
        </CardContent>
      </Card>

      {/* Latest Assessment Summary */}
      {latestAssessment ? (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {latestAssessment.score}/{latestAssessment.total_questions}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Latest Score</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(latestAssessment.confidence_score * 100)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Confidence</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {student.assessments.length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Assessments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatTime(latestAssessment.time_taken)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Time Taken</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center bg-yellow-50">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Assessments Yet</h3>
          <p className="text-gray-600 text-sm">
            This student hasn't completed an assessment. Have them visit the student assessment
            portal to get started.
          </p>
        </Card>
      )}

      {/* Teaching Strategies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Recommended Teaching Strategies
          </CardTitle>
          <CardDescription>
            Based on {student.primary_category ? "learning profile" : "general best practices"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {getCategoryStrategies(student.primary_category).map((strategy, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-purple-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{strategy}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Assessment History */}
      {student.assessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Assessment History
            </CardTitle>
            <CardDescription>{student.assessments.length} assessment(s) completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {student.assessments.map((assessment, index) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-600">
                        {assessment.score}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold">
                        {getCategoryDisplayName(assessment.category_determined)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(assessment.assessment_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(assessment.time_taken)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {assessment.score}/{assessment.total_questions}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((assessment.score / assessment.total_questions) * 100)}%
                    </div>
                  </div>
                  {index === 0 && (
                    <Badge variant="secondary" className="ml-2">
                      Latest
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Teacher Notes
          </CardTitle>
          <CardDescription>Track observations and important information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Note */}
          <div className="space-y-3">
            <div className="flex gap-2">
              {["observation", "behavior", "academic", "parent_contact", "other"].map((type) => (
                <Badge
                  key={type}
                  variant={noteType === type ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setNoteType(type)}
                >
                  {type.replace("_", " ")}
                </Badge>
              ))}
            </div>
            <Textarea
              placeholder="Add a new note about this student..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button onClick={saveNote} disabled={isSavingNote}>
              {isSavingNote ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Note
                </>
              )}
            </Button>
          </div>

          {/* Display Existing Notes */}
          {notes.length > 0 ? (
            <div className="space-y-3 mt-6">
              {notes.map((note) => (
                <div key={note.id} className="p-4 rounded-lg bg-secondary">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getNoteTypeColor(note.note_type)}>
                      {note.note_type.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note_text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notes yet. Add your first note above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
