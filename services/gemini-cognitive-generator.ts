/**
 * Gemini 2.5 Flash - Learning Profile Generator
 * 
 * Generates research-backed learning profile questions for students (8-12 years, CM1/CM2)
 * to understand classroom learning needs, pacing preferences, engagement patterns, and support preferences.
 * Includes parallel parent observation versions.
 * 
 * Research Framework:
 * - MSLQ (Motivated Strategies for Learning Questionnaire)
 * - BRIEF-2 (Behavior Rating Inventory of Executive Function)
 * - WISC-V (Wechsler Intelligence Scale for Children - behavioral correlates)
 * - UDL (Universal Design for Learning principles)
 * - Self-efficacy scales for children
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

import { getEnvVar } from '@/lib/utils';

// Initialize Gemini API with 2.5 Flash - works in both browser and Node.js
const getApiKey = () => {
  return getEnvVar('VITE_GEMINI_API_KEY', '') || getEnvVar('GEMINI_API_KEY', '');
};

const genAI = new GoogleGenerativeAI(getApiKey());

/**
 * Learning support areas based on validated research instruments
 */
export type CognitiveDomain = 
  | 'processing_speed'
  | 'working_memory'
  | 'attention_focus'
  | 'learning_style'
  | 'self_efficacy'
  | 'motivation_engagement';

/**
 * Individual learning profile question structure
 */
export interface CognitiveQuestion {
  id: number;
  domain: CognitiveDomain;
  student_fr: string;
  student_en: string;
  parent_fr: string;
  parent_en: string;
  reverse: boolean;
  research_basis: string;
}

/**
 * Complete learning profile (15 questions)
 */
export interface CognitiveAssessment {
  questions: CognitiveQuestion[];
  metadata: {
    generated_at: string;
    model: string;
    language: 'en' | 'fr';
    student_age_range: string;
    grade_level: string;
  };
}

/**
 * Domain scoring interpretation
 */
export interface DomainInterpretation {
  domain: CognitiveDomain;
  score_range: string;
  interpretation: string;
  recommendations: string[];
}

/**
 * Generate a complete 15-question learning profile
 * 
 * @param language - Target language for generation context
 * @param gradeLevel - Student grade level (CM1 or CM2)
 * @returns Complete learning profile with 15 questions
 */
export async function generateCognitiveAssessment(
  language: 'en' | 'fr' = 'fr',
  gradeLevel: 'CM1' | 'CM2' = 'CM1'
): Promise<CognitiveAssessment> {
  try {
    // Use Gemini 2.5 Flash for generation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = buildCognitivePrompt(language, gradeLevel);

    console.log('Generating learning profile questions with Gemini 2.5 Flash...');
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse and validate the response
    const questions = parseCognitiveResponse(text);

    // Validate structure
    validateQuestionStructure(questions);

    return {
      questions,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'gemini-2.0-flash-exp',
        language,
        student_age_range: '8-12 years',
        grade_level: gradeLevel,
      },
    };
  } catch (error) {
    console.error('Error generating learning profile:', error);
    throw new Error('Failed to generate learning profile. Please try again.');
  }
}

/**
 * Build the research-backed prompt for Gemini
 */
function buildCognitivePrompt(language: 'en' | 'fr', gradeLevel: string): string {
  const languageInstruction = language === 'fr'
    ? 'Generate all questions in both French and English, with French as the primary language.'
    : 'Generate all questions in both English and French, with English as the primary language.';

  return `You are an expert educational psychologist specializing in understanding children's learning needs and support preferences for ages 8-12 years (French CM1/CM2 level).

${languageInstruction}

Generate EXACTLY 15 learning profile questions to understand classroom learning needs, pacing preferences, engagement patterns, and support preferences. These questions help identify:
- How students learn best in the classroom
- What pacing works for them
- How they stay engaged
- What supports they need (visual aids, step-by-step instructions, examples)
- Balance between challenge and support
- Executive function supports needed

Questions are based on validated research instruments:
- MSLQ (Motivated Strategies for Learning Questionnaire)
- BRIEF-2 (Behavior Rating Inventory of Executive Function)
- WISC-V behavioral correlates
- UDL (Universal Design for Learning) principles
- Self-efficacy scales for children

CRITICAL REQUIREMENTS:

1. EXACTLY 15 QUESTIONS distributed across 6 learning support areas:
   - Processing Speed & Pacing (Q1-3): 3 questions about how quickly they process information and preferred pacing
   - Working Memory & Instructions (Q4-5): 2 questions about remembering instructions and multi-step tasks
   - Attention & Engagement (Q6-8): 3 questions about staying focused and engagement patterns
   - Learning Preferences & Supports (Q9-11): 3 questions about visual aids, examples, demonstrations, and preferred learning approaches
   - Self-Efficacy & Confidence (Q12-13): 2 questions about belief in abilities and willingness to try challenges
   - Motivation & Persistence (Q14-15): 2 questions about interest in learning and persistence with challenges

2. PARALLEL VERSIONS:
   - Student version: First person ("I understand quickly when the teacher explains")
   - Parent version: Third person ("My child understands quickly when the teacher explains")
   - MUST be identical in meaning, only pronoun changes

3. CHILD-FRIENDLY LANGUAGE:
   - Age-appropriate for 8-12 year olds
   - Simple, clear sentences
   - Avoid complex vocabulary
   - Use concrete examples from school life
   - Focus on learning experiences, not diagnostic language

4. LIKERT SCALE (same for all questions):
   1 = Not at all like me / Pas du tout comme moi
   2 = A bit like me / Un peu comme moi
   3 = Sometimes like me / Parfois comme moi
   4 = Mostly like me / Souvent comme moi
   5 = Exactly like me / Exactement comme moi

5. REVERSE SCORING:
   - Include 3-4 reverse-scored items (marked with "reverse": true)
   - Example: "I need extra time to finish my work" (higher score = needs more time/support)

6. RESEARCH BASIS:
   - Each question must cite its research foundation
   - Use validated constructs from the instruments listed above

7. BILINGUAL OUTPUT:
   - Provide both French and English versions
   - Maintain semantic equivalence
   - Use natural, idiomatic language in both

EXAMPLE QUESTION FORMAT:
{
  "id": 1,
  "domain": "processing_speed",
  "student_fr": "Quand la maîtresse explique quelque chose, je comprends vite.",
  "student_en": "When the teacher explains something, I understand quickly.",
  "parent_fr": "Quand la maîtresse explique quelque chose, mon enfant comprend vite.",
  "parent_en": "When the teacher explains something, my child understands quickly.",
  "reverse": false,
  "research_basis": "WISC-V Processing Speed Index - identifies pacing preferences for classroom instruction"
}

LEARNING SUPPORT AREA GUIDELINES:

Processing Speed & Pacing (Q1-3):
- How quickly they understand new information in class
- Time needed to complete tasks
- Preference for quick pace vs. careful, methodical work
- Classroom pacing needs
Research: WISC-V Processing Speed, BRIEF-2 Processing Speed

Working Memory & Instructions (Q4-5):
- Remembering multi-step instructions
- Holding information while working on tasks
- Need for written instructions vs. verbal only
- Support needs for following directions
Research: WISC-V Working Memory Index, BRIEF-2 Working Memory

Attention & Engagement (Q6-8):
- Staying focused during lessons
- Distractibility in classroom settings
- Sustained attention patterns
- Engagement strategies that work
Research: BRIEF-2 Inhibit/Shift scales, ADHD rating scales

Learning Preferences & Supports (Q9-11):
- Preference for visual aids, examples, demonstrations
- Learning through doing vs. listening vs. seeing
- Support preferences (step-by-step, visual aids, concrete examples)
- How they learn best
Research: UDL principles, Learning styles research

Self-Efficacy & Confidence (Q12-13):
- Belief in own learning abilities
- Confidence when facing new challenges
- Willingness to try difficult tasks
- Support needed to build confidence
Research: Bandura's self-efficacy scales, Academic self-concept measures

Motivation & Persistence (Q14-15):
- Interest in learning and school
- Persistence when work is challenging
- Intrinsic vs. extrinsic motivation patterns
- What keeps them engaged
Research: MSLQ Motivation scales, Self-Determination Theory

Return ONLY a valid JSON array with exactly 15 questions. No markdown, no code blocks, no explanations.

[
  {
    "id": 1,
    "domain": "processing_speed",
    "student_fr": "...",
    "student_en": "...",
    "parent_fr": "...",
    "parent_en": "...",
    "reverse": false,
    "research_basis": "..."
  },
  ... (14 more questions)
]`;
}

/**
 * Normalize domain value to match TypeScript type
 * Maps variations like "learning_style_preference" to "learning_style"
 */
function normalizeDomain(domain: string): CognitiveDomain {
  const domainLower = domain.toLowerCase().trim();
  
  // Map variations to correct enum values
  const domainMap: Record<string, CognitiveDomain> = {
    'processing_speed': 'processing_speed',
    'processing': 'processing_speed',
    'speed': 'processing_speed',
    'working_memory': 'working_memory',
    'memory': 'working_memory',
    'working': 'working_memory',
    'attention_focus': 'attention_focus',
    'attention': 'attention_focus',
    'focus': 'attention_focus',
    'learning_style': 'learning_style',
    'learning_style_preference': 'learning_style',
    'learning': 'learning_style',
    'style': 'learning_style',
    'self_efficacy': 'self_efficacy',
    'self_efficacy_confidence': 'self_efficacy',
    'efficacy': 'self_efficacy',
    'confidence': 'self_efficacy',
    'motivation_engagement': 'motivation_engagement',
    'motivation': 'motivation_engagement',
    'engagement': 'motivation_engagement',
  };
  
  const normalized = domainMap[domainLower];
  if (!normalized) {
    console.warn(`Unknown domain value: "${domain}", defaulting to "processing_speed"`);
    return 'processing_speed';
  }
  
  if (normalized !== domainLower) {
    console.log(`Domain normalized: "${domain}" -> "${normalized}"`);
  }
  
  return normalized;
}

/**
 * Parse Gemini's JSON response
 * 
 * Handles various response formats from Gemini including:
 * - Plain JSON arrays
 * - JSON wrapped in markdown code blocks
 * - Text before/after JSON
 * - Multiple code blocks
 */
function parseCognitiveResponse(text: string): CognitiveQuestion[] {
  try {
    let cleanedText = text.trim();

    // Strategy 1: Try to extract JSON from markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
    const codeBlockMatches = [...cleanedText.matchAll(codeBlockRegex)];
    
    if (codeBlockMatches.length > 0) {
      // Use the first code block that contains JSON
      for (const match of codeBlockMatches) {
        const blockContent = match[1].trim();
        try {
          const parsed = JSON.parse(blockContent);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cleanedText = blockContent;
            break;
          }
        } catch {
          // Try next code block
          continue;
        }
      }
    }

    // Strategy 2: Try to find JSON array in the text
    if (!cleanedText.startsWith('[')) {
      // Look for array start
      const arrayStart = cleanedText.indexOf('[');
      const arrayEnd = cleanedText.lastIndexOf(']');
      
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        cleanedText = cleanedText.substring(arrayStart, arrayEnd + 1);
      }
    }

    // Strategy 3: Remove any remaining markdown artifacts
    cleanedText = cleanedText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```\s*$/, '')
      .trim();

    // Strategy 4: Fix common JSON issues
    // Remove trailing commas before closing brackets/braces
    cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1');

    // Parse JSON
    const questions = JSON.parse(cleanedText);

    if (!Array.isArray(questions)) {
      throw new Error('Response is not a JSON array');
    }

    if (questions.length === 0) {
      throw new Error('Response contains an empty array');
    }

    // Normalize domain values in all questions
    const normalizedQuestions = questions.map((q: any) => {
      // Validate required fields
      if (!q.id || !q.domain || !q.student_fr || !q.student_en || 
          !q.parent_fr || !q.parent_en || q.reverse === undefined) {
        throw new Error(`Question ${q.id || 'unknown'} is missing required fields`);
      }

      return {
        ...q,
        domain: normalizeDomain(q.domain),
      };
    });

    return normalizedQuestions;
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    console.error('Raw response (first 500 chars):', text.substring(0, 500));
    console.error('Raw response (last 500 chars):', text.substring(Math.max(0, text.length - 500)));
    
    // Provide more helpful error message
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON from Gemini response: ${error.message}`);
    }
    throw new Error(`Failed to parse learning profile questions from Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate question structure
 */
function validateQuestionStructure(questions: CognitiveQuestion[]): void {
  // Check total count
  if (questions.length !== 15) {
    throw new Error(`Expected exactly 15 questions, got ${questions.length}`);
  }

  // Check domain distribution
  const domainCounts: Record<string, number> = {};
  const expectedDistribution: Record<CognitiveDomain, number> = {
    processing_speed: 3,
    working_memory: 2,
    attention_focus: 3,
    learning_style: 3,
    self_efficacy: 2,
    motivation_engagement: 2,
  };

  questions.forEach((q, index) => {
    // Validate required fields
    if (!q.id || !q.domain || !q.student_fr || !q.student_en || 
        !q.parent_fr || !q.parent_en || q.reverse === undefined) {
      throw new Error(`Question ${index + 1} is missing required fields`);
    }

    // Count domains
    domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1;
  });

  // Validate domain distribution
  Object.entries(expectedDistribution).forEach(([domain, expectedCount]) => {
    const actualCount = domainCounts[domain] || 0;
    if (actualCount !== expectedCount) {
      console.warn(
        `Domain ${domain}: expected ${expectedCount} questions, got ${actualCount}`
      );
    }
  });

  console.log('✓ Question structure validated successfully');
}

/**
 * Get domain scoring interpretation
 */
export function getDomainInterpretation(
  domain: CognitiveDomain,
  averageScore: number
): DomainInterpretation {
  const interpretations: Record<CognitiveDomain, {
    high: { interpretation: string; recommendations: string[] };
    medium: { interpretation: string; recommendations: string[] };
    low: { interpretation: string; recommendations: string[] };
  }> = {
    processing_speed: {
      high: {
        interpretation: 'Fast processor - understands new information quickly and completes tasks efficiently.',
        recommendations: [
          'Provide advanced or enrichment materials',
          'Offer opportunities for independent work',
          'Challenge with complex problems',
          'Avoid repetitive practice',
        ],
      },
      medium: {
        interpretation: 'Average processing speed - learns at a typical pace for age group.',
        recommendations: [
          'Maintain balanced pacing',
          'Provide adequate time for processing',
          'Use varied teaching methods',
          'Check for understanding regularly',
        ],
      },
      low: {
        interpretation: 'Needs extra time - benefits from slower pacing and additional processing time.',
        recommendations: [
          'Allow extended time for tasks',
          'Break down complex information',
          'Use step-by-step instructions',
          'Provide visual supports',
          'Check understanding frequently',
        ],
      },
    },
    working_memory: {
      high: {
        interpretation: 'Strong working memory - can hold and manipulate multiple pieces of information.',
        recommendations: [
          'Give multi-step instructions',
          'Encourage mental math strategies',
          'Use complex problem-solving tasks',
          'Develop organizational skills',
        ],
      },
      medium: {
        interpretation: 'Average working memory - can handle typical classroom demands.',
        recommendations: [
          'Provide written instructions alongside verbal',
          'Use visual aids and organizers',
          'Break tasks into manageable chunks',
          'Teach memory strategies',
        ],
      },
      low: {
        interpretation: 'Needs memory support - benefits from external aids and simplified instructions.',
        recommendations: [
          'Provide written instructions',
          'Use visual reminders and checklists',
          'Simplify multi-step tasks',
          'Allow use of notes and aids',
          'Teach mnemonic strategies',
        ],
      },
    },
    attention_focus: {
      high: {
        interpretation: 'Strong sustained attention - can focus for extended periods without distraction.',
        recommendations: [
          'Provide engaging, challenging work',
          'Allow for independent study',
          'Use as peer helper/model',
          'Encourage leadership roles',
        ],
      },
      medium: {
        interpretation: 'Average attention span - typical focus abilities for age group.',
        recommendations: [
          'Use varied activities',
          'Provide movement breaks',
          'Minimize distractions',
          'Use attention-grabbing techniques',
        ],
      },
      low: {
        interpretation: 'Easily distracted - needs structured environment and frequent redirection.',
        recommendations: [
          'Minimize environmental distractions',
          'Use preferential seating',
          'Provide frequent breaks',
          'Use timers and schedules',
          'Teach self-monitoring strategies',
          'Consider fidget tools',
        ],
      },
    },
    learning_style: {
      high: {
        interpretation: 'Strong learning style preference - clear preference for specific modalities.',
        recommendations: [
          'Honor preferred learning style',
          'Provide materials in preferred format',
          'Gradually introduce other modalities',
          'Use strengths to build confidence',
        ],
      },
      medium: {
        interpretation: 'Flexible learner - can adapt to various teaching methods.',
        recommendations: [
          'Use multimodal instruction',
          'Vary presentation formats',
          'Encourage exploration of different approaches',
          'Build metacognitive awareness',
        ],
      },
      low: {
        interpretation: 'Unclear learning preference - may benefit from explicit strategy instruction.',
        recommendations: [
          'Experiment with different approaches',
          'Teach learning strategies explicitly',
          'Help identify what works best',
          'Provide structured guidance',
        ],
      },
    },
    self_efficacy: {
      high: {
        interpretation: 'High confidence - believes in own abilities and willing to take on challenges.',
        recommendations: [
          'Provide appropriately challenging tasks',
          'Encourage peer mentoring',
          'Foster growth mindset',
          'Celebrate effort and persistence',
        ],
      },
      medium: {
        interpretation: 'Moderate confidence - generally positive but may need encouragement.',
        recommendations: [
          'Provide positive reinforcement',
          'Set achievable goals',
          'Celebrate small successes',
          'Build on strengths',
        ],
      },
      low: {
        interpretation: 'Low confidence - needs significant support and encouragement.',
        recommendations: [
          'Create safe, supportive environment',
          'Set very achievable goals',
          'Provide frequent positive feedback',
          'Focus on effort over outcome',
          'Build confidence gradually',
          'Avoid public comparisons',
        ],
      },
    },
    motivation_engagement: {
      high: {
        interpretation: 'Highly motivated - intrinsically interested in learning and persistent.',
        recommendations: [
          'Provide autonomy and choice',
          'Offer enrichment opportunities',
          'Encourage self-directed learning',
          'Foster natural curiosity',
        ],
      },
      medium: {
        interpretation: 'Moderately engaged - interested but may need external motivation.',
        recommendations: [
          'Connect to personal interests',
          'Use varied activities',
          'Provide clear goals and feedback',
          'Balance challenge and support',
        ],
      },
      low: {
        interpretation: 'Needs motivation support - requires external incentives and engagement strategies.',
        recommendations: [
          'Find personal interests and connections',
          'Use immediate, concrete rewards',
          'Make learning relevant and fun',
          'Provide frequent encouragement',
          'Break tasks into small steps',
          'Celebrate all progress',
        ],
      },
    },
  };

  const level = averageScore >= 4 ? 'high' : averageScore >= 2.5 ? 'medium' : 'low';
  const domainData = interpretations[domain][level];

  return {
    domain,
    score_range: `${averageScore.toFixed(1)}/5.0`,
    interpretation: domainData.interpretation,
    recommendations: domainData.recommendations,
  };
}

/**
 * Calculate domain scores from responses
 */
export function calculateDomainScores(
  responses: Array<{ domain: CognitiveDomain; value: number; reverse: boolean }>
): Record<CognitiveDomain, number> {
  const domainScores: Record<string, number[]> = {};

  responses.forEach(({ domain, value, reverse }) => {
    if (!domainScores[domain]) {
      domainScores[domain] = [];
    }
    // Apply reverse scoring if needed
    const score = reverse ? 6 - value : value;
    domainScores[domain].push(score);
  });

  // Calculate averages
  const averages = {} as Record<CognitiveDomain, number>;
  Object.entries(domainScores).forEach(([domain, scores]) => {
    averages[domain as CognitiveDomain] = 
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });

  return averages;
}

/**
 * Generate a summary profile based on domain scores
 */
export function generateCognitiveProfile(
  domainScores: Record<CognitiveDomain, number>
): {
  overall_score: number;
  strengths: CognitiveDomain[];
  areas_for_support: CognitiveDomain[];
  profile_summary: string;
} {
  const scores = Object.entries(domainScores);
  const overall_score = scores.reduce((sum, [, score]) => sum + score, 0) / scores.length;

  // Identify strengths (score >= 4)
  const strengths = scores
    .filter(([, score]) => score >= 4)
    .map(([domain]) => domain as CognitiveDomain);

  // Identify areas for support (score < 2.5)
  const areas_for_support = scores
    .filter(([, score]) => score < 2.5)
    .map(([domain]) => domain as CognitiveDomain);

  // Generate summary
  let profile_summary = '';
  if (overall_score >= 4) {
    profile_summary = 'Strong overall cognitive profile with excellent learning capabilities.';
  } else if (overall_score >= 3) {
    profile_summary = 'Good cognitive profile with balanced learning abilities.';
  } else if (overall_score >= 2) {
    profile_summary = 'Developing cognitive profile with some areas needing support.';
  } else {
    profile_summary = 'Cognitive profile indicating need for significant support and intervention.';
  }

  return {
    overall_score,
    strengths,
    areas_for_support,
    profile_summary,
  };
}
