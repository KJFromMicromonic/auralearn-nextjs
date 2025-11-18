/**
 * AI Insight Generation using BlackBox AI
 *
 * Generates teaching insights and strategies using BlackBox AI
 * based on student profiles, web resources, and YouTube transcripts.
 */

import { StudentCategory, categoryDisplayNames, Strategy, Activity, ResourceLink, ChecklistItem } from '../lib/supabase';
import { BraveSearchResult, YouTubeTranscriptResult } from './internet-intelligence';
import { generateStructuredResponse } from './blackbox-client';

export interface GenerateInsightParams {
  studentCategory: StudentCategory;
  curriculumTopic: string;
  webResources: BraveSearchResult[];
  youtubeTranscripts: YouTubeTranscriptResult[];
  audience: 'teacher' | 'parent';
  gradeLevel?: string;
  studentCount?: number;
}

export interface InsightResponse {
  summary: string;
  strategies: Strategy[];
  activities: Activity[];
  resources: ResourceLink[];
  lessonPlan?: string;
  homeSupportChecklist?: ChecklistItem[];
}

/**
 * Generate AI-powered teaching insights using BlackBox AI
 */
export async function generateTeachingInsight(
  params: GenerateInsightParams
): Promise<InsightResponse> {
  const {
    studentCategory,
    curriculumTopic,
    webResources,
    youtubeTranscripts,
    audience,
    gradeLevel = 'elementary/middle school',
    studentCount,
  } = params;

  const categoryName = categoryDisplayNames[studentCategory];

  // Build the prompt
  const systemPrompt = buildSystemPrompt(audience);
  const userPrompt = buildUserPrompt(
    categoryName,
    curriculumTopic,
    webResources,
    youtubeTranscripts,
    gradeLevel,
    studentCount,
    audience
  );

  console.log('🤖 Generating AI insights with BlackBox AI for:', {
    category: categoryName,
    topic: curriculumTopic,
    audience,
  });

  try {
    const response = await generateStructuredResponse<InsightResponse>(
      userPrompt,
      systemPrompt,
      getResponseSchema(audience)
    );

    return response;
  } catch (error) {
    console.error('Error generating AI insights:', error);

    // Return fallback response
    return generateFallbackResponse(categoryName, curriculumTopic, audience);
  }
}

/**
 * Build system prompt based on audience
 */
function buildSystemPrompt(audience: 'teacher' | 'parent'): string {
  if (audience === 'teacher') {
    return `You are an expert educational consultant specializing in differentiated instruction and special education.

Your role is to help teachers create effective learning experiences for students with diverse learning needs.

You will receive:
- A student learning profile (e.g., "Visual Learner", "Slow Processing")
- A curriculum topic they're teaching
- Web articles and research about teaching strategies
- YouTube video transcripts with teaching tips

Generate a comprehensive teaching guide with:
1. A summary of this learning profile (2-3 sentences)
2. 3-5 key strategies with clear explanations of why they work
3. 3-4 practical classroom activities with step-by-step instructions
4. Recommended resources (from the provided web links)
5. A brief lesson plan outline for Support, Core, and Advanced groups

Focus on classroom management, lesson planning, grouping strategies, and assessment methods.`;
  } else {
    return `You are a compassionate educational consultant specializing in helping parents support their children's learning at home.

Your role is to provide practical, encouraging advice for parents whose children have specific learning needs.

You will receive:
- A description of how their child learns (e.g., "Visual Learner", "Needs Repetition")
- A subject/topic the child is working on
- Research articles and videos about teaching strategies
- YouTube transcripts with educational advice

Generate a helpful parent guide with:
1. A warm, reassuring summary of their child's learning style (2-3 sentences)
2. 3-5 key strategies parents can use at home (simple, specific, encouraging)
3. 3-4 practical home activities (using everyday materials)
4. Recommended resources for parents (articles, videos)
5. A weekly home support checklist with small, doable actions

Focus on home routines, motivation, communication with the child, homework support, and building confidence. Use warm, encouraging language. Avoid jargon.`;
  }
}

/**
 * Build user prompt with all context
 */
function buildUserPrompt(
  categoryName: string,
  curriculumTopic: string,
  webResources: BraveSearchResult[],
  youtubeTranscripts: YouTubeTranscriptResult[],
  gradeLevel: string,
  studentCount: number | undefined,
  audience: 'teacher' | 'parent'
): string {
  const studentInfo =
    audience === 'teacher' && studentCount
      ? `You have ${studentCount} students in this category in your class.\n\n`
      : '';

  const resourcesText = webResources
    .map(
      (r, i) =>
        `${i + 1}. "${r.title}"\n   URL: ${r.url}\n   Summary: ${r.snippet}\n   Type: ${r.type}\n`
    )
    .join('\n');

  const transcriptsText = youtubeTranscripts
    .map(
      (t, i) =>
        `${i + 1}. Video: "${t.title}"\n   URL: ${t.videoUrl}\n   Transcript:\n   ${t.transcript.substring(0, 800)}...\n`
    )
    .join('\n');

  return `Learning Profile: ${categoryName}
Curriculum Topic: ${curriculumTopic}
Grade Level: ${gradeLevel}
${studentInfo}
WEB RESOURCES:
${resourcesText}

YOUTUBE VIDEO TRANSCRIPTS:
${transcriptsText}

Based on the above information, generate a comprehensive ${audience === 'teacher' ? 'teaching guide' : 'parent support guide'} that combines research-based strategies from the web resources and practical tips from the video transcripts.

Make it specific to helping ${categoryName} students learn ${curriculumTopic}.

Return your response as a JSON object with this structure:
${JSON.stringify(getResponseSchema(audience), null, 2)}`;
}

/**
 * Get response schema based on audience
 */
function getResponseSchema(audience: 'teacher' | 'parent') {
  const baseSchema = {
    summary: 'string',
    strategies: [
      {
        title: 'string',
        description: 'string',
        why_it_works: 'string',
      },
    ],
    activities: [
      {
        name: 'string',
        duration: 'string',
        materials: ['string'],
        steps: ['string'],
        differentiation: 'string (optional)',
      },
    ],
    resources: [
      {
        title: 'string',
        url: 'string',
        type: 'string',
        description: 'string',
      },
    ],
  };

  if (audience === 'teacher') {
    return {
      ...baseSchema,
      lessonPlan: 'string (markdown format with Support/Core/Advanced sections)',
    };
  } else {
    return {
      ...baseSchema,
      homeSupportChecklist: [
        {
          task: 'string',
          frequency: 'string',
          tips: ['string'],
        },
      ],
    };
  }
}

/**
 * Generate fallback response if AI fails
 */
function generateFallbackResponse(
  categoryName: string,
  curriculumTopic: string,
  audience: 'teacher' | 'parent'
): InsightResponse {
  if (audience === 'teacher') {
    return {
      summary: `${categoryName} students benefit from specialized teaching approaches for ${curriculumTopic}. These strategies help accommodate their learning style while building confidence and skills.`,
      strategies: [
        {
          title: 'Differentiated Instruction',
          description: `Adapt your ${curriculumTopic} lessons to match the pace and style that works for ${categoryName} students.`,
          why_it_works: 'Tailoring instruction to learning style increases engagement and retention.',
        },
        {
          title: 'Multi-Sensory Learning',
          description: `Use visual, auditory, and kinesthetic approaches when teaching ${curriculumTopic}.`,
          why_it_works: 'Engaging multiple senses helps students process and remember information.',
        },
        {
          title: 'Scaffolded Support',
          description: 'Break down complex concepts into smaller, manageable steps.',
          why_it_works: 'Incremental learning builds confidence and prevents overwhelm.',
        },
      ],
      activities: [
        {
          name: `${curriculumTopic} Stations`,
          duration: '30-45 minutes',
          materials: ['Visual aids', 'Manipulatives', 'Worksheets', 'Digital resources'],
          steps: [
            'Set up 4 learning stations around the room',
            'Rotate students through stations every 10 minutes',
            'Include hands-on, visual, and collaborative activities',
            'Provide differentiated materials at each station',
          ],
          differentiation: 'Adjust complexity and support level at each station',
        },
      ],
      resources: [
        {
          title: 'Understood.org - Learning Differences Resources',
          url: 'https://www.understood.org',
          type: 'website',
          description: 'Evidence-based strategies for diverse learners',
        },
      ],
      lessonPlan: `# ${curriculumTopic} Lesson Plan

## Support Group
- Focus: Foundational skills with heavy scaffolding
- Activities: Hands-on manipulatives, visual guides
- Assessment: Verbal check-ins, simple demonstrations

## Core Group
- Focus: Grade-level concepts with moderate support
- Activities: Collaborative problem-solving, guided practice
- Assessment: Written work, short presentations

## Advanced Group
- Focus: Extension and enrichment
- Activities: Independent research, creative projects
- Assessment: Complex problem-solving, peer teaching`,
    };
  } else {
    return {
      summary: `Your child learns best when ${categoryName.toLowerCase()} approaches are used. With the right support at home, they can thrive in ${curriculumTopic}!`,
      strategies: [
        {
          title: 'Create a Supportive Environment',
          description: `Set up a quiet, organized study space where your child can focus on ${curriculumTopic}.`,
          why_it_works: 'A consistent environment helps children feel secure and ready to learn.',
        },
        {
          title: 'Celebrate Small Wins',
          description: 'Praise effort and progress, not just final results.',
          why_it_works: 'Positive reinforcement builds confidence and motivation.',
        },
        {
          title: 'Make It Relevant',
          description: `Connect ${curriculumTopic} to your child's interests and daily life.`,
          why_it_works: 'Children engage more when they see real-world connections.',
        },
      ],
      activities: [
        {
          name: `Daily ${curriculumTopic} Practice`,
          duration: '15-20 minutes',
          materials: ['Household items', 'Paper and pencils', 'Online resources'],
          steps: [
            'Set aside a regular time each day',
            'Start with a quick warm-up activity',
            'Work on 2-3 practice problems together',
            'End with something fun and hands-on',
          ],
        },
      ],
      resources: [
        {
          title: 'Parent Support Resources',
          url: 'https://www.understood.org/parents',
          type: 'website',
          description: 'Tips and strategies for supporting your child',
        },
      ],
      homeSupportChecklist: [
        {
          task: 'Review homework together',
          frequency: 'Daily (15 minutes)',
          tips: [
            'Ask your child to explain what they learned',
            'Help them break big tasks into smaller steps',
            'Celebrate their effort and persistence',
          ],
        },
        {
          task: 'Communicate with teacher',
          frequency: 'Weekly',
          tips: [
            'Ask about upcoming topics and skills',
            'Share what strategies work at home',
            'Discuss any concerns early',
          ],
        },
      ],
    };
  }
}
