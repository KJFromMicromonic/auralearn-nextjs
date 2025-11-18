import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Users } from "lucide-react";

const worksheets = [
  {
    group: "Support Group",
    level: "Foundational",
    color: "from-level-struggling to-level-attention",
    students: 8,
    exercises: [
      {
        title: "Visual Pattern Recognition",
        instruction: "Match the shapes with their patterns. Use the color guide provided.",
        scenario: "Sara is organizing her art supplies. Help her sort items by matching patterns."
      },
      {
        title: "Step-by-Step Problem Solving",
        instruction: "Complete each problem by following the numbered steps. Take your time.",
        scenario: "Break down the word problem: 'Tom has 5 apples. He gets 3 more. How many does he have?'"
      },
      {
        title: "Hands-On Counting Activity",
        instruction: "Use physical objects to solve. Draw or count with your fingers.",
        scenario: "Create groups of items and count them together. Show your work with pictures."
      }
    ]
  },
  {
    group: "Core Group",
    level: "Grade-Level",
    color: "from-level-ontrack to-success",
    students: 15,
    exercises: [
      {
        title: "Multi-Step Problem Challenge",
        instruction: "Solve using 2-3 steps. Show your reasoning process.",
        scenario: "A bakery sells 12 cakes in the morning and 18 in the afternoon. If each cake costs $8, what's the total revenue?"
      },
      {
        title: "Pattern Analysis",
        instruction: "Identify the rule and predict the next 3 items in the sequence.",
        scenario: "Sequence: 3, 7, 11, 15, __, __, __. Explain the pattern you discovered."
      },
      {
        title: "Real-World Application",
        instruction: "Apply concepts to everyday situations. Use estimation when appropriate.",
        scenario: "Plan a class party with a $50 budget. Calculate costs for snacks, decorations, and activities."
      }
    ]
  },
  {
    group: "Advanced Group",
    level: "Enrichment",
    color: "from-level-advanced to-info",
    students: 7,
    exercises: [
      {
        title: "Complex Problem Investigation",
        instruction: "Explore multiple solution pathways. Justify your approach.",
        scenario: "Design an efficient seating arrangement for 30 students in groups that optimize collaboration while maintaining focus."
      },
      {
        title: "Abstract Reasoning Challenge",
        instruction: "Create your own problem based on the concept. Teach it to a peer.",
        scenario: "Develop a mathematical model to predict classroom resource needs for the next quarter."
      },
      {
        title: "Cross-Disciplinary Project",
        instruction: "Integrate concepts from multiple subjects. Present your findings.",
        scenario: "Research and propose a sustainability plan for your school using data analysis and logical reasoning."
      }
    ]
  }
];

export default function Worksheets() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Group Worksheets</h1>
        <p className="text-muted-foreground">
          Contextual, engaging exercises tailored to each learning group
        </p>
      </div>

      <div className="grid gap-6">
        {worksheets.map((worksheet, index) => (
          <Card key={index} className="p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${worksheet.color} flex items-center justify-center`}>
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{worksheet.group}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-muted-foreground">{worksheet.level} Level</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {worksheet.students} students
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <div className="space-y-6">
              {worksheet.exercises.map((exercise, exIndex) => (
                <div
                  key={exIndex}
                  className="p-6 rounded-xl bg-secondary/50 border-2 border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${worksheet.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {exIndex + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-2">{exercise.title}</h3>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold mt-0.5">
                            INSTRUCTION
                          </div>
                          <p className="text-sm text-foreground flex-1">{exercise.instruction}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="px-2 py-0.5 rounded bg-info/10 text-info text-xs font-semibold mt-0.5">
                            SCENARIO
                          </div>
                          <p className="text-sm text-muted-foreground flex-1 italic">{exercise.scenario}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-info/5">
        <h3 className="text-lg font-bold text-foreground mb-3">Differentiation Notes</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-semibold text-level-struggling mb-1">Support Group</div>
            <p className="text-muted-foreground">Visual aids, step-by-step guidance, concrete examples, extra time</p>
          </div>
          <div>
            <div className="font-semibold text-level-ontrack mb-1">Core Group</div>
            <p className="text-muted-foreground">Balanced challenge, real-world applications, peer collaboration</p>
          </div>
          <div>
            <div className="font-semibold text-level-advanced mb-1">Advanced Group</div>
            <p className="text-muted-foreground">Open-ended problems, research projects, cross-disciplinary thinking</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
