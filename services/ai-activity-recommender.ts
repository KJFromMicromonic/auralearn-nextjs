/**
 * AI Activity Recommender Service
 * 
 * Uses MistralAI to provide intelligent, personalized activity recommendations
 * based on student profile, completion history, and context.
 */

import { generateStructuredResponse } from './mistralai-client';
import { ActivityWithSource, ActivityLog, getActivityHistory, getActivityStats } from './parent-activity-service';
import { AssessmentResult, getAssessmentResult } from './cognitive-assessment-service';
import { StudentWithClass } from './student-service';

export interface ActivityRecommendationParams {
  studentId: string;
  student: StudentWithClass;
  clerkId: string; // Required for authentication
  currentTime?: Date;
  availableTime?: number; // minutes
  preferredTypes?: ('strength' | 'support' | 'flexibility' | 'general')[];
  avoidTypes?: ('strength' | 'support' | 'flexibility' | 'general')[];
  limit?: number;
}

export interface PersonalizedActivityRecommendation {
  activity: ActivityWithSource;
  confidence: number; // 0-1
  reasoning: string;
  expectedOutcome: string;
  bestTimeOfDay: string;
  estimatedEngagement: number; // 1-5
  whyNow: string;
  expectedDuration: number; // minutes
}

export interface ActivityRecommendationResponse {
  recommendations: PersonalizedActivityRecommendation[];
  summary: string;
  insights: string[];
  alternativeSuggestions?: {
    ifMoreTime: ActivityWithSource[];
    ifLessTime: ActivityWithSource[];
    ifDifferentMood: ActivityWithSource[];
  };
}

/**
 * Get AI-powered personalized activity recommendations
 */
export async function getAIActivityRecommendations(
  params: ActivityRecommendationParams,
  availableActivities: ActivityWithSource[]
): Promise<ActivityRecommendationResponse> {
  const {
    studentId,
    student,
    clerkId,
    currentTime = new Date(),
    availableTime = 30,
    preferredTypes,
    avoidTypes,
    limit = 5,
  } = params;

  try {
    // Gather context data
    const [activityHistory, activityStats, assessmentResult] = await Promise.all([
      getActivityHistory(studentId, 20),
      getActivityStats(studentId),
      getAssessmentResult(studentId, clerkId),
    ]);

    // Filter activities based on preferences
    let filteredActivities = availableActivities;
    if (preferredTypes && preferredTypes.length > 0) {
      filteredActivities = filteredActivities.filter(a => 
        preferredTypes.includes(a.type || 'general')
      );
    }
    if (avoidTypes && avoidTypes.length > 0) {
      filteredActivities = filteredActivities.filter(a => 
        !avoidTypes.includes(a.type || 'general')
      );
    }

    // Build AI prompt
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      student,
      activities: filteredActivities,
      activityHistory,
      activityStats,
      assessmentResult,
      currentTime,
      availableTime,
      limit,
    });

    // Get AI recommendations
    const aiResponse = await generateStructuredResponse<ActivityRecommendationResponse>(
      userPrompt,
      systemPrompt,
      getResponseSchema()
    );

    // Map AI recommendations back to actual activities
    const recommendations: PersonalizedActivityRecommendation[] = aiResponse.recommendations
      .map(rec => {
        const activity = filteredActivities.find(a => a.name === rec.activity.name);
        if (!activity) return null;
        
        return {
          activity,
          confidence: rec.confidence,
          reasoning: rec.reasoning,
          expectedOutcome: rec.expectedOutcome,
          bestTimeOfDay: rec.bestTimeOfDay,
          estimatedEngagement: rec.estimatedEngagement,
          whyNow: rec.whyNow,
          expectedDuration: rec.expectedDuration,
        };
      })
      .filter((rec): rec is PersonalizedActivityRecommendation => rec !== null)
      .slice(0, limit);

    return {
      recommendations,
      summary: aiResponse.summary,
      insights: aiResponse.insights,
      alternativeSuggestions: aiResponse.alternativeSuggestions,
    };
  } catch (error) {
    console.error('Error generating AI activity recommendations:', error);
    
    // Fallback: return top activities by type
    const fallbackActivities = availableActivities.slice(0, limit);
    return {
      recommendations: fallbackActivities.map(activity => ({
        activity,
        confidence: 0.5,
        reasoning: 'Recommended based on student profile',
        expectedOutcome: 'Engagement and learning',
        bestTimeOfDay: 'Afternoon',
        estimatedEngagement: 3,
        whyNow: 'Good time for this activity',
        expectedDuration: 15,
      })),
      summary: 'Activity recommendations based on your child\'s learning profile',
      insights: [],
    };
  }
}

/**
 * Build system prompt for activity recommendations
 */
function buildSystemPrompt(): string {
  return `You are an expert educational consultant specializing in personalized learning recommendations for children.

Your task is to analyze a student's learning profile, activity completion history, and current context to recommend the most suitable activities.

Key considerations:
1. **Student Profile**: Consider their learning category, strengths, and areas for support
2. **Completion Patterns**: Analyze what activities they've completed, when, and how effective they were
3. **Time Context**: Consider time of day, day of week, and available time
4. **Engagement**: Predict which activities will be most engaging based on past patterns
5. **Learning Goals**: Balance strength reinforcement, support needs, and flexibility building
6. **Progression**: Suggest activities that build on previous completions

Provide:
- Top recommendations with confidence scores (0-1)
- Clear reasoning for each recommendation
- Expected outcomes and engagement levels
- Best time of day for each activity
- Why this activity is recommended now
- Alternative suggestions for different contexts

Be specific, actionable, and encouraging.`;
}

/**
 * Build user prompt with all context
 */
function buildUserPrompt(context: {
  student: StudentWithClass;
  activities: ActivityWithSource[];
  activityHistory: ActivityLog[];
  activityStats: Awaited<ReturnType<typeof getActivityStats>>;
  assessmentResult: AssessmentResult | null;
  currentTime: Date;
  availableTime: number;
  limit: number;
}): string {
  const {
    student,
    activities,
    activityHistory,
    activityStats,
    assessmentResult,
    currentTime,
    availableTime,
    limit,
  } = context;

  const hour = currentTime.getHours();
  const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  let prompt = `Recommend ${limit} personalized activities for this student:

**Student Profile:**
- Name: ${student.name}
- Learning Category: ${student.primary_category || 'not specified'}

`;

  if (assessmentResult) {
    prompt += `**Learning Assessment:**
- Overall Score: ${assessmentResult.overall_score.toFixed(1)}/5.0
- Strengths: ${assessmentResult.strengths?.join(', ') || 'none identified'}
- Areas for Support: ${assessmentResult.areas_for_support?.join(', ') || 'none identified'}
- Profile Summary: ${assessmentResult.profile_summary}

`;
  }

  prompt += `**Activity History:**
- Total Completed: ${activityStats.totalCompleted}
- By Type: ${JSON.stringify(activityStats.byType)}
- Average Effectiveness Rating: ${activityStats.averageRating.toFixed(1)}/5.0
- Recent Completions: ${activityHistory.slice(0, 5).map(a => `${a.activity_name} (${a.activity_type})`).join(', ') || 'none'}

**Current Context:**
- Current Time: ${timeOfDay} (${dayOfWeek})
- Available Time: ${availableTime} minutes
- Hour of Day: ${hour}:00

**Available Activities (${activities.length} total):**
${activities.slice(0, 20).map((activity, idx) => {
  const duration = activity.duration || '15-20 min';
  const materials = activity.materials?.join(', ') || 'none';
  const steps = activity.steps?.slice(0, 3).join('; ') || 'N/A';
  return `${idx + 1}. "${activity.name}" (${activity.type || 'general'})
   - Duration: ${duration}
   - Materials: ${materials}
   - Steps: ${steps}`;
}).join('\n')}

**Task:**
Analyze this student's profile, history, and context to recommend the ${limit} most suitable activities right now.

For each recommendation, provide:
1. Activity name (must match exactly from available activities)
2. Confidence score (0-1)
3. Reasoning (2-3 sentences explaining why this activity is recommended)
4. Expected outcome (what the child will gain)
5. Best time of day (morning/afternoon/evening)
6. Estimated engagement (1-5)
7. Why now (why this is a good time for this activity)
8. Expected duration in minutes

Also provide:
- A brief summary (2-3 sentences) of the recommendations
- 2-3 key insights about the student's learning patterns
- Alternative suggestions for different contexts (if more/less time, different mood)

Focus on activities that:
- Match the student's current needs and profile
- Build on their strengths while addressing support areas
- Are appropriate for the available time
- Are likely to be engaging based on past patterns
- Fit the current time of day and context`;

  return prompt;
}

/**
 * Get response schema for structured output
 */
function getResponseSchema(): Record<string, unknown> {
  return {
    recommendations: [
      {
        activity: {
          name: 'string',
        },
        confidence: 'number',
        reasoning: 'string',
        expectedOutcome: 'string',
        bestTimeOfDay: 'string',
        estimatedEngagement: 'number',
        whyNow: 'string',
        expectedDuration: 'number',
      },
    ],
    summary: 'string',
    insights: ['string'],
    alternativeSuggestions: {
      ifMoreTime: [
        {
          name: 'string',
        },
      ],
      ifLessTime: [
        {
          name: 'string',
        },
      ],
      ifDifferentMood: [
        {
          name: 'string',
        },
      ],
    },
  };
}

/**
 * Get quick recommendation (simpler, faster version)
 */
export async function getQuickActivityRecommendation(
  studentId: string,
  student: StudentWithClass,
  clerkId: string,
  availableActivities: ActivityWithSource[],
  limit: number = 3
): Promise<PersonalizedActivityRecommendation[]> {
  try {
    const recommendations = await getAIActivityRecommendations(
      {
        studentId,
        student,
        clerkId,
        limit,
      },
      availableActivities
    );
    return recommendations.recommendations;
  } catch (error) {
    console.error('Error in quick recommendation:', error);
    // Fallback: return first activities
    return availableActivities.slice(0, limit).map(activity => ({
      activity,
      confidence: 0.5,
      reasoning: 'Recommended based on student profile',
      expectedOutcome: 'Learning and engagement',
      bestTimeOfDay: 'Afternoon',
      estimatedEngagement: 3,
      whyNow: 'Good time for this activity',
      expectedDuration: 15,
    }));
  }
}

