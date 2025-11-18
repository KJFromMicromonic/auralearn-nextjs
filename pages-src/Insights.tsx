import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Lightbulb, TrendingUp, Users, Brain, Zap, Eye } from "lucide-react";

const behavioralProfiles = [
  {
    icon: Brain,
    name: "Slow Processing",
    count: 5,
    description: "Students who need more time to process information",
    recommendations: [
      "Provide extra time for tasks and assessments",
      "Break down complex problems into smaller steps",
      "Use visual aids and concrete examples"
    ],
    color: "from-level-attention to-pastel-coral"
  },
  {
    icon: Zap,
    name: "Fast Processor",
    count: 7,
    description: "Quick learners who grasp concepts rapidly",
    recommendations: [
      "Offer enrichment activities and challenges",
      "Encourage peer tutoring opportunities",
      "Provide independent research projects"
    ],
    color: "from-level-advanced to-pastel-sky"
  },
  {
    icon: TrendingUp,
    name: "High Energy / Needs Movement",
    count: 6,
    description: "Kinesthetic learners who learn through physical activity",
    recommendations: [
      "Incorporate movement breaks every 20 minutes",
      "Use hands-on activities and manipulatives",
      "Allow standing desks or flexible seating"
    ],
    color: "from-accent to-pastel-lavender"
  },
  {
    icon: Eye,
    name: "Visual Learner",
    count: 8,
    description: "Students who learn best through visual representations",
    recommendations: [
      "Use diagrams, charts, and graphic organizers",
      "Incorporate color coding and highlighting",
      "Provide video content and demonstrations"
    ],
    color: "from-level-ontrack to-pastel-mint"
  },
  {
    icon: Brain,
    name: "Logical Learner",
    count: 6,
    description: "Students who excel with structured, sequential thinking",
    recommendations: [
      "Present information in logical sequences",
      "Use problem-solving and reasoning activities",
      "Encourage pattern recognition exercises"
    ],
    color: "from-info to-pastel-sky"
  },
  {
    icon: Users,
    name: "Sensitive / Low Confidence",
    count: 4,
    description: "Students who need emotional support and encouragement",
    recommendations: [
      "Provide positive reinforcement frequently",
      "Create a safe, non-judgmental environment",
      "Offer private feedback and one-on-one support"
    ],
    color: "from-level-struggling to-pastel-coral"
  },
  {
    icon: TrendingUp,
    name: "Easily Distracted",
    count: 5,
    description: "Students who struggle with sustained attention",
    recommendations: [
      "Minimize visual and auditory distractions",
      "Use shorter, focused work periods",
      "Provide fidget tools and movement options"
    ],
    color: "from-level-attention to-pastel-lavender"
  },
  {
    icon: Lightbulb,
    name: "Needs Repetition",
    count: 6,
    description: "Students who benefit from repeated practice",
    recommendations: [
      "Review key concepts multiple times",
      "Use spaced repetition techniques",
      "Provide various practice formats"
    ],
    color: "from-warning to-pastel-mint"
  }
];

export default function Insights() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Class Insights</h1>
          <p className="text-muted-foreground">
            Behavioral learning profiles and actionable recommendations
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">30</div>
          <div className="text-sm text-muted-foreground">Students Analyzed</div>
        </div>
      </div>

      <Card className="p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-info/5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Intelligence Summary
            </h2>
            <p className="text-foreground/80 leading-relaxed">
              Your class shows a diverse mix of learning profiles with <span className="font-semibold text-primary">8 visual learners</span> and{" "}
              <span className="font-semibold text-info">7 fast processors</span> leading the distribution. 
              Consider implementing <span className="font-semibold">differentiated instruction</span> with 
              visual aids for conceptual understanding and enrichment activities for advanced learners.
              The presence of <span className="font-semibold text-warning">high-energy learners (6)</span> suggests 
              incorporating movement breaks and hands-on activities will maximize engagement.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {behavioralProfiles.map((profile, index) => {
          const Icon = profile.icon;
          return (
            <Card key={index} className="p-6 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${profile.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-foreground">{profile.name}</h3>
                    <div className="px-3 py-1 rounded-full bg-secondary text-primary text-sm font-bold">
                      {profile.count} students
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.description}</p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <div className="text-sm font-semibold text-foreground mb-2">Recommendations:</div>
                {profile.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-4">
        <Button onClick={() => navigate("/worksheets")} size="lg" className="rounded-xl px-8">
          Generate Worksheets
        </Button>
      </div>
    </div>
  );
}
