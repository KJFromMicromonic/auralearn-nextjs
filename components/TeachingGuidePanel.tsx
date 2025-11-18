import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Video,
  FileText,
  Lightbulb,
  Target,
  RefreshCw,
  TrendingUp,
  Heart,
} from "lucide-react";
import { StudentCategory, categoryDisplayNames } from "@/lib/supabase";
import { useTeachingGuide } from "@/hooks/useTeachingGuide";

interface TeachingGuidePanelProps {
  category: StudentCategory;
  curriculumTopic: string;
  audience: "teacher" | "parent";
  classId: string;
  studentCount?: number;
  gradeLevel?: string;
  onClose: () => void;
}

export function TeachingGuidePanel({
  category,
  curriculumTopic,
  audience,
  classId,
  studentCount,
  gradeLevel = "elementary",
  onClose,
}: TeachingGuidePanelProps) {
  const { data: guide, isLoading, error, refetch } = useTeachingGuide({
    classId,
    studentCategory: category,
    curriculumTopic,
    audience,
    studentCount,
    gradeLevel,
  });

  const handleRegenerate = () => {
    refetch();
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            {categoryDisplayNames[category]} - Teaching Guide
          </SheetTitle>
          <SheetDescription>
            AI-powered strategies for teaching {curriculumTopic} to this learning profile
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="font-medium text-lg">Generating your teaching guide...</p>
                <p className="text-sm text-muted-foreground">
                  Searching educational resources and analyzing best practices
                </p>
              </div>
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error Loading Guide</CardTitle>
                <CardDescription>{error.message}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleRegenerate} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {guide && !isLoading && (
            <div className="space-y-6 pb-6">
              {/* Summary */}
              <Card className="bg-gradient-to-br from-pastel-mint/20 to-pastel-sky/20 border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Profile Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{guide.summary}</p>
                </CardContent>
              </Card>

              {/* Tabs for different sections */}
              <Tabs defaultValue={audience === 'parent' ? "strengths" : "strategies"} className="w-full">
                <TabsList className={audience === 'parent' 
                  ? "grid w-full grid-cols-5" 
                  : "grid w-full grid-cols-4"}>
                  {audience === 'parent' && (
                    <>
                      <TabsTrigger value="strengths">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Strengths
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="support">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          Support
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="flexibility">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Flexibility
                        </span>
                      </TabsTrigger>
                    </>
                  )}
                  {audience === 'teacher' && (
                    <TabsTrigger value="strategies">Strategies</TabsTrigger>
                  )}
                  <TabsTrigger value="activities">Activities</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                  {audience === 'teacher' && (
                    <TabsTrigger value="lesson">Lesson Plan</TabsTrigger>
                  )}
                  {audience === 'parent' && (
                    <TabsTrigger value="checklist">Checklist</TabsTrigger>
                  )}
                </TabsList>

                {/* Strengths Tab (Parent) */}
                {audience === 'parent' && (
                  <TabsContent value="strengths" className="space-y-4 mt-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 mb-4">
                      <p className="text-sm text-green-800">
                        <strong>Strengths Activities:</strong> These activities reinforce what your child does well, building confidence and mastery.
                      </p>
                    </div>
                    {(guide as any).strengthActivities && (guide as any).strengthActivities.length > 0 ? (
                      (guide as any).strengthActivities.map((activity: any, index: number) => (
                        <Card key={index} className="border-green-200">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  Strength
                                </Badge>
                                {activity.name}
                              </CardTitle>
                              <Badge variant="outline">{activity.duration}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {activity.materials && activity.materials.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Materials Needed:
                                </p>
                                <ul className="text-sm space-y-1">
                                  {activity.materials.map((material: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <CheckCircle2 className="w-3 h-3 text-green-500" />
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
                                <ol className="text-sm space-y-2">
                                  {activity.steps.map((step: string, idx: number) => (
                                    <li key={idx} className="flex gap-2">
                                      <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center shrink-0 bg-green-100 text-green-800">
                                        {idx + 1}
                                      </Badge>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No strength activities available. Generating recommendations...
                      </p>
                    )}
                  </TabsContent>
                )}

                {/* Support Tab (Parent) */}
                {audience === 'parent' && (
                  <TabsContent value="support" className="space-y-4 mt-4">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Support Strategies:</strong> These strategies help scaffold challenges and provide the support your child needs.
                      </p>
                    </div>
                    {((guide as any).supportStrategies || guide.strategies) && ((guide as any).supportStrategies || guide.strategies).length > 0 ? (
                      ((guide as any).supportStrategies || guide.strategies).map((strategy: any, index: number) => (
                        <Card key={index} className="border-blue-200">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                <Heart className="w-3 h-3 mr-1" />
                                Support
                              </Badge>
                              {strategy.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">{strategy.description}</p>
                            <div className="bg-secondary/50 p-3 rounded-lg">
                              <p className="text-xs font-medium text-foreground mb-1">
                                Why it works:
                              </p>
                              <p className="text-xs text-muted-foreground">{strategy.why_it_works}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No support strategies available
                      </p>
                    )}
                  </TabsContent>
                )}

                {/* Flexibility Tab (Parent) */}
                {audience === 'parent' && (
                  <TabsContent value="flexibility" className="space-y-4 mt-4">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200 mb-4">
                      <p className="text-sm text-purple-800">
                        <strong>Flexibility Challenges:</strong> These activities gently stretch your child's comfort zone, building adaptability and preventing over-reliance on preferred learning styles. Frame these as "growth opportunities"!
                      </p>
                    </div>
                    {(guide as any).flexibilityChallenges && (guide as any).flexibilityChallenges.length > 0 ? (
                      (guide as any).flexibilityChallenges.map((activity: any, index: number) => (
                        <Card key={index} className="border-purple-200">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                  <Target className="w-3 h-3 mr-1" />
                                  Growth
                                </Badge>
                                {activity.name}
                              </CardTitle>
                              <Badge variant="outline">{activity.duration}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {activity.materials && activity.materials.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Materials Needed:
                                </p>
                                <ul className="text-sm space-y-1">
                                  {activity.materials.map((material: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <CheckCircle2 className="w-3 h-3 text-purple-500" />
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
                                <ol className="text-sm space-y-2">
                                  {activity.steps.map((step: string, idx: number) => (
                                    <li key={idx} className="flex gap-2">
                                      <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center shrink-0 bg-purple-100 text-purple-800">
                                        {idx + 1}
                                      </Badge>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {activity.differentiation && (
                              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <p className="text-xs font-medium text-purple-800 mb-1">
                                  Growth Tip:
                                </p>
                                <p className="text-xs text-purple-700">
                                  {activity.differentiation}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No flexibility challenges available. Generating recommendations...
                      </p>
                    )}
                  </TabsContent>
                )}

                {/* Strategies Tab (Teacher) */}
                {audience === 'teacher' && (
                  <TabsContent value="strategies" className="space-y-4 mt-4">
                    {guide.strategies && guide.strategies.length > 0 ? (
                      guide.strategies.map((strategy, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge variant="secondary">{index + 1}</Badge>
                              {strategy.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">{strategy.description}</p>
                            <div className="bg-secondary/50 p-3 rounded-lg">
                              <p className="text-xs font-medium text-foreground mb-1">
                                Why it works:
                              </p>
                              <p className="text-xs text-muted-foreground">{strategy.why_it_works}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No strategies available
                      </p>
                    )}
                  </TabsContent>
                )}

                {/* Activities Tab */}
                <TabsContent value="activities" className="space-y-4 mt-4">
                  {guide.activities && guide.activities.length > 0 ? (
                    guide.activities.map((activity, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{activity.name}</CardTitle>
                            <Badge variant="outline">{activity.duration}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {activity.materials && activity.materials.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Materials Needed:
                              </p>
                              <ul className="text-sm space-y-1">
                                {activity.materials.map((material, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
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
                              <ol className="text-sm space-y-2">
                                {activity.steps.map((step, idx) => (
                                  <li key={idx} className="flex gap-2">
                                    <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center shrink-0">
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
                                Differentiation Tip:
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {activity.differentiation}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activities available
                    </p>
                  )}
                </TabsContent>

                {/* Resources Tab */}
                <TabsContent value="resources" className="space-y-4 mt-4">
                  {guide.resources && guide.resources.length > 0 ? (
                    guide.resources.map((resource, index) => (
                      <Card key={index} className="group hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            {resource.type === "video" && <Video className="w-4 h-4 text-red-500" />}
                            {resource.type === "article" && <FileText className="w-4 h-4 text-blue-500" />}
                            {resource.type === "blog" && <BookOpen className="w-4 h-4 text-purple-500" />}
                            {resource.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {resource.type}
                            </Badge>
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {resource.description}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          >
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-2" />
                              Open Resource
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No resources available
                    </p>
                  )}
                </TabsContent>

                {/* Checklist Tab (Parent) */}
                {audience === 'parent' && (
                  <TabsContent value="checklist" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          Weekly Home Support Checklist
                        </CardTitle>
                        <CardDescription>
                          Small, doable actions to support your child this week
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {guide.home_support_checklist && guide.home_support_checklist.length > 0 ? (
                          <div className="space-y-4">
                            {guide.home_support_checklist.map((item, index) => (
                              <Card key={index} className="bg-secondary/50">
                                <CardHeader>
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                    {item.task}
                                  </CardTitle>
                                  <CardDescription>{item.frequency}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  {item.tips && item.tips.length > 0 && (
                                    <ul className="space-y-2">
                                      {item.tips.map((tip, tipIdx) => (
                                        <li key={tipIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                          <span className="text-primary mt-1">•</span>
                                          <span>{tip}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No checklist available
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Lesson Plan Tab (Teacher) */}
                {audience === 'teacher' && (
                  <TabsContent value="lesson" className="mt-4">
                    <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Lesson Plan Outline
                      </CardTitle>
                      <CardDescription>
                        3-tier differentiation for this learning profile
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {guide.lesson_plan ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none 
                          prose-headings:font-semibold prose-headings:text-foreground
                          prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-4
                          prose-h2:text-xl prose-h2:mt-5 prose-h2:mb-3
                          prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
                          prose-h4:text-base prose-h4:mt-3 prose-h4:mb-2
                          prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground prose-p:mb-3
                          prose-ul:text-sm prose-ul:text-foreground prose-ul:my-3
                          prose-ol:text-sm prose-ol:text-foreground prose-ol:my-3
                          prose-li:text-sm prose-li:text-foreground prose-li:my-1
                          prose-strong:text-foreground prose-strong:font-semibold
                          prose-code:text-xs prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-foreground
                          prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-pre:text-foreground
                          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                          prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {guide.lesson_plan}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No lesson plan available
                        </p>
                      )}
                    </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>

              <Separator />

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleRegenerate} disabled={isLoading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Guide
                </Button>
                <Button onClick={onClose}>Close</Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
