/**
 * AI Insight Generation using MistralAI
 *
 * Generates teaching insights and strategies using MistralAI
 * based on student profiles, web resources, and YouTube transcripts.
 */

import { StudentCategory, categoryDisplayNames, Strategy, Activity, ResourceLink, ChecklistItem } from '../lib/supabase';
import { BraveSearchResult, YouTubeTranscriptResult } from './internet-intelligence';
import { generateStructuredResponse } from './mistralai-client';
import { RagieChunk } from './ragie-service';

export interface GenerateInsightParams {
  studentCategory: StudentCategory;
  curriculumTopic: string;
  webResources: BraveSearchResult[];
  youtubeTranscripts: YouTubeTranscriptResult[];
  ragChunks?: RagieChunk[];
  audience: 'teacher' | 'parent';
  gradeLevel?: string;
  studentCount?: number;
}

export interface InsightResponse {
  summary: string;
  strategies: Strategy[];
  activities: Activity[];
  strengthActivities?: Activity[];      // NEW: Activities that reinforce what works
  supportStrategies?: Strategy[];       // Existing strategies (for clarity)
  flexibilityChallenges?: Activity[];   // NEW: Activities that build adaptability
  resources: ResourceLink[];
  lessonPlan?: string;
  homeSupportChecklist?: ChecklistItem[];
}

/**
 * Generate AI-powered teaching insights using MistralAI
 */
export async function generateTeachingInsight(
  params: GenerateInsightParams
): Promise<InsightResponse> {
  const {
    studentCategory,
    curriculumTopic,
    webResources,
    youtubeTranscripts,
    ragChunks = [],
    audience,
    gradeLevel = 'elementary/middle school',
    studentCount,
  } = params;

  const categoryName = categoryDisplayNames[studentCategory];

  // Build the prompt
  const systemPrompt = buildSystemPrompt(audience, ragChunks.length > 0);
  const userPrompt = buildUserPrompt(
    categoryName,
    curriculumTopic,
    webResources,
    youtubeTranscripts,
    ragChunks,
    gradeLevel,
    studentCount,
    audience
  );

  console.log('🤖 Generating AI insights with MistralAI for:', {
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
 * 
 * @param audience - Target audience (teacher or parent)
 * @param hasRAGContent - Whether RAG-retrieved content is available
 * @returns System prompt string
 */
function buildSystemPrompt(audience: 'teacher' | 'parent', hasRAGContent: boolean): string {
  const ragContext = hasRAGContent
    ? '\n- Relevant teaching guides retrieved from a curated knowledge base (RAG)'
    : '';

  if (audience === 'teacher') {
    return `You are an expert educational consultant specializing in differentiated instruction and special education.

Your role is to help teachers create effective learning experiences for students with diverse learning needs.

You will receive:
- A student learning profile (e.g., "Visual Learner", "Slow Processing")
- A curriculum topic they're teaching
- Web articles and research about teaching strategies
- YouTube video transcripts with teaching tips${ragContext}

Generate a comprehensive teaching guide with THREE TIERS of recommendations:
1. A summary of this learning profile (2-3 sentences)
2. STRENGTH ACTIVITIES (3-4): Activities that reinforce and build on what this student does well
3. SUPPORT STRATEGIES (3-5): Strategies that scaffold challenges and provide needed support
4. FLEXIBILITY CHALLENGES (3-4): Activities that stretch comfort zones and build adaptability (crucial for growth)
5. Recommended resources (from the provided web links)
6. A brief lesson plan outline for Support, Core, and Advanced groups

IMPORTANT: The flexibility challenges should help students practice skills outside their comfort zone while still being achievable. This builds adaptability and prevents over-reliance on preferred learning styles.

${hasRAGContent ? 'Prioritize and integrate insights from the retrieved teaching guides when they are relevant. Use them to enhance the strategies and activities you recommend.' : ''}

Focus on classroom management, lesson planning, grouping strategies, and assessment methods.`;
  } else {
    return `You are a compassionate educational consultant specializing in helping parents support their children's learning at home.

Your role is to provide practical, encouraging advice for parents whose children have specific learning needs.

You will receive:
- A description of how their child learns (e.g., "Visual Learner", "Needs Repetition")
- A subject/topic the child is working on
- Research articles and videos about teaching strategies
- YouTube transcripts with educational advice${ragContext}

Generate a helpful parent guide with THREE TIERS of recommendations:
1. A warm, reassuring summary of their child's learning style (2-3 sentences)
2. STRENGTH ACTIVITIES (3-4): Home activities that reinforce what their child does well (builds confidence)
3. SUPPORT STRATEGIES (3-5): Simple strategies parents can use to help with challenges (scaffolding)
4. FLEXIBILITY CHALLENGES (3-4): Activities that gently stretch their child's comfort zone (builds adaptability - essential for growth)
5. Recommended resources for parents (articles, videos)
6. A weekly home support checklist with small, doable actions

IMPORTANT: Include flexibility challenges that help children practice different learning approaches. This prevents over-reliance on preferred styles and builds adaptability. Frame these as "growth opportunities" not "weaknesses."

${hasRAGContent ? 'Incorporate relevant insights from the retrieved teaching guides to provide more comprehensive and proven strategies.' : ''}

Focus on home routines, motivation, communication with the child, homework support, and building confidence. Use warm, encouraging language. Avoid jargon.`;
  }
}

/**
 * Build user prompt with all context including RAG content
 * 
 * @param categoryName - Display name of student category
 * @param curriculumTopic - Subject/topic being taught
 * @param webResources - Web search results
 * @param youtubeTranscripts - YouTube video transcripts
 * @param ragChunks - RAG-retrieved teaching guide chunks
 * @param gradeLevel - Grade level
 * @param studentCount - Number of students (for teachers)
 * @param audience - Target audience
 * @returns User prompt string
 */
function buildUserPrompt(
  categoryName: string,
  curriculumTopic: string,
  webResources: BraveSearchResult[],
  youtubeTranscripts: YouTubeTranscriptResult[],
  ragChunks: RagieChunk[],
  gradeLevel: string,
  studentCount: number | undefined,
  audience: 'teacher' | 'parent'
): string {
  const studentInfo =
    audience === 'teacher' && studentCount
      ? `You have ${studentCount} students in this category in your class.\n\n`
      : '';

  // Format RAG chunks
  const ragText = ragChunks.length > 0
    ? ragChunks
        .map((chunk, index) => {
          const score = chunk.score ? ` (relevance: ${chunk.score.toFixed(2)})` : '';
          const source = chunk.metadata?.source || chunk.document_id || 'teaching guide';
          return `\n${index + 1}. [${source}]${score}\n${chunk.content}`;
        })
        .join('\n\n')
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

  const ragSection = ragText
    ? `\n\nRETRIEVED TEACHING GUIDES (RAG):\n${ragText}\n`
    : '';

  return `Learning Profile: ${categoryName}
Curriculum Topic: ${curriculumTopic}
Grade Level: ${gradeLevel}
${studentInfo}${ragSection}WEB RESOURCES:
${resourcesText}

YOUTUBE VIDEO TRANSCRIPTS:
${transcriptsText}

Based on the above information, generate a comprehensive ${audience === 'teacher' ? 'teaching guide' : 'parent support guide'} with THREE TIERS:
${ragText ? '- Proven strategies and insights from the retrieved teaching guides (prioritize these when relevant)\n' : ''}- Research-based strategies from the web resources
- Practical tips from the video transcripts

CRITICAL: You must provide THREE distinct types of recommendations:
1. STRENGTH ACTIVITIES: Activities that reinforce what ${categoryName} students do well
2. SUPPORT STRATEGIES: Strategies that scaffold challenges and provide needed support
3. FLEXIBILITY CHALLENGES: Activities that build adaptability by stretching comfort zones (this is essential for growth)

Make it specific to helping ${categoryName} students learn ${curriculumTopic}.

${ragText ? 'When the retrieved teaching guides contain relevant information, integrate those insights into your recommendations. Use them to enhance the strategies, activities, and lesson plans you generate.' : ''}

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
    supportStrategies: [
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
    strengthActivities: [
      {
        name: 'string',
        duration: 'string',
        materials: ['string'],
        steps: ['string'],
        differentiation: 'string (optional)',
      },
    ],
    flexibilityChallenges: [
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
      supportStrategies: [
        {
          title: 'Scaffolded Support',
          description: 'Break down complex concepts into smaller, manageable steps.',
          why_it_works: 'Incremental learning builds confidence and prevents overwhelm.',
        },
        {
          title: 'Visual Aids and Organizers',
          description: 'Provide graphic organizers, charts, and visual representations.',
          why_it_works: 'Visual supports help students organize information and see connections.',
        },
      ],
      strengthActivities: [
        {
          name: `${curriculumTopic} Strengths Practice`,
          duration: '20-30 minutes',
          materials: ['Preferred learning materials', 'Visual aids'],
          steps: [
            'Identify what the student does well',
            'Create activities that build on these strengths',
            'Provide positive reinforcement',
          ],
        },
      ],
      flexibilityChallenges: [
        {
          name: `${curriculumTopic} Adaptability Exercise`,
          duration: '15-20 minutes',
          materials: ['Mixed learning materials'],
          steps: [
            'Introduce a slightly different approach',
            'Provide gentle support and encouragement',
            'Celebrate effort and growth',
          ],
          differentiation: 'Start small and gradually increase challenge',
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
      supportStrategies: [
        {
          title: 'Break It Down',
          description: `Help your child break ${curriculumTopic} into smaller, manageable steps.`,
          why_it_works: 'Small steps reduce overwhelm and build confidence.',
        },
        {
          title: 'Provide Visual Aids',
          description: 'Use charts, diagrams, or drawings to support understanding.',
          why_it_works: 'Visual supports help children process and remember information.',
        },
      ],
      strengthActivities: [
        {
          name: `${curriculumTopic} Confidence Builder`,
          duration: '15-20 minutes',
          materials: ['Household items', 'Paper and pencils'],
          steps: [
            'Start with what your child does well',
            'Build on their strengths',
            'Celebrate their success',
          ],
        },
      ],
      flexibilityChallenges: [
        {
          name: `${curriculumTopic} Growth Opportunity`,
          duration: '10-15 minutes',
          materials: ['Mixed materials', 'Encouragement'],
          steps: [
            'Try a slightly different approach together',
            'Provide gentle support',
            'Focus on effort and trying new things',
          ],
          differentiation: 'Keep it fun and low-pressure',
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

