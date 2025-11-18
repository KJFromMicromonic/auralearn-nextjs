import { StudentWithClass } from '@/services/student-service';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface ChildSwitcherProps {
  students: StudentWithClass[];
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
}

const categoryColors: Record<string, string> = {
  slow_processing: 'from-blue-500 to-cyan-500',
  fast_processor: 'from-yellow-500 to-orange-500',
  high_energy: 'from-green-500 to-emerald-500',
  visual_learner: 'from-purple-500 to-pink-500',
  auditory_learner: 'from-indigo-500 to-purple-500',
  reading_writing: 'from-rose-500 to-pink-500',
  kinesthetic_learner: 'from-teal-500 to-green-500',
  adhd_traits: 'from-amber-500 to-red-500',
};

const categoryLabels: Record<string, string> = {
  slow_processing: 'Slow Processing',
  fast_processor: 'Fast Processor',
  high_energy: 'High Energy',
  visual_learner: 'Visual Learner',
  auditory_learner: 'Auditory Learner',
  reading_writing: 'Reading/Writing',
  kinesthetic_learner: 'Kinesthetic',
  adhd_traits: 'ADHD Traits',
};

export default function ChildSwitcher({
  students,
  selectedStudentId,
  onSelectStudent,
}: ChildSwitcherProps) {
  // Get initials from student name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // If only one child, show a single card
  if (students.length === 1) {
    const student = students[0];
    const color = categoryColors[student.primary_category || 'slow_processing'];
    const categoryLabel = categoryLabels[student.primary_category || 'slow_processing'];

    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl",
            color
          )}>
            {getInitials(student.name)}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground">{student.name}</h3>
            {student.class_name && (
              <p className="text-sm text-muted-foreground">Class: {student.class_name}</p>
            )}
            <div className="mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {categoryLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple children - show horizontal selector
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Select a child to view their profile:</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {students.map((student) => {
          const isSelected = student.id === selectedStudentId;
          const color = categoryColors[student.primary_category || 'slow_processing'];
          const categoryLabel = categoryLabels[student.primary_category || 'slow_processing'];

          return (
            <button
              key={student.id}
              onClick={() => onSelectStudent(student.id)}
              className={cn(
                "relative bg-card border-2 rounded-xl p-5 shadow-sm transition-all duration-300 text-left",
                isSelected
                  ? "border-primary shadow-lg scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:shadow-md"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg",
                  color
                )}>
                  {getInitials(student.name)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{student.name}</h3>
                  {student.class_name && (
                    <p className="text-sm text-muted-foreground">Class: {student.class_name}</p>
                  )}
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {categoryLabel}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
