import { GoogleGenerativeAI } from '@google/generative-ai';
import { SubjectType, GradeLevelType } from '@/contexts/AuthContext';
import { getEnvVar } from '@/lib/utils';

// Initialize Gemini API
// Prioritize server-side key (GEMINI_API_KEY) over client-side (VITE_GEMINI_API_KEY)
const getApiKey = () => {
  return getEnvVar('GEMINI_API_KEY', '') || getEnvVar('VITE_GEMINI_API_KEY', '');
};

const genAI = new GoogleGenerativeAI(getApiKey());

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: { value: string; label: string }[];
  correct_answer: string;
  explanation: string;
  difficulty_level: number;
  category: string;
  subject: string;
  grade_level: string;
}

export interface CurriculumContext {
  subject: SubjectType;
  gradeLevel: GradeLevelType;
  language: 'en' | 'fr';
  curriculumData?: Record<string, unknown>; // Future: JSON from Supabase Storage
}

/**
 * Subject translations for curriculum context
 */
const SUBJECT_TRANSLATIONS = {
  en: {
    francais: 'French Language',
    langues_vivantes: 'Modern Languages',
    arts_plastiques: 'Visual Arts',
    education_musicale: 'Music Education',
    histoire_des_arts: 'Art History',
    education_physique_sportive: 'Physical Education and Sports',
    enseignement_moral_civique: 'Moral and Civic Education',
    histoire_geographie: 'History and Geography',
    sciences_technologie: 'Science and Technology',
    mathematiques: 'Mathematics',
  },
  fr: {
    francais: 'Français',
    langues_vivantes: 'Langues Vivantes',
    arts_plastiques: 'Arts Plastiques',
    education_musicale: 'Éducation Musicale',
    histoire_des_arts: 'Histoire des Arts',
    education_physique_sportive: 'Éducation Physique et Sportive',
    enseignement_moral_civique: 'Enseignement Moral et Civique',
    histoire_geographie: 'Histoire et Géographie',
    sciences_technologie: 'Sciences et Technologie',
    mathematiques: 'Mathématiques',
  },
};

/**
 * French curriculum standards for each subject and grade level
 * This provides context for Gemini to generate appropriate questions
 */
const CURRICULUM_STANDARDS = {
  CM1: {
    francais: {
      topics: [
        'Lecture et compréhension de textes',
        'Grammaire (classes de mots, fonctions)',
        'Conjugaison (présent, futur, imparfait)',
        'Orthographe et vocabulaire',
        'Expression écrite',
      ],
      skills: ['Comprendre', 'Analyser', 'Rédiger', 'Argumenter'],
    },
    mathematiques: {
      topics: [
        'Nombres et calculs (jusqu\'à 1 000 000)',
        'Fractions simples',
        'Géométrie (figures planes, solides)',
        'Mesures (longueur, masse, temps)',
        'Problèmes arithmétiques',
      ],
      skills: ['Calculer', 'Raisonner', 'Représenter', 'Modéliser'],
    },
    sciences_technologie: {
      topics: [
        'Le vivant (nutrition, reproduction)',
        'La matière (états, mélanges)',
        'L\'énergie',
        'Objets techniques',
        'Planète Terre',
      ],
      skills: ['Observer', 'Expérimenter', 'Analyser', 'Conclure'],
    },
    histoire_geographie: {
      topics: [
        'Préhistoire et Antiquité',
        'Moyen Âge',
        'Géographie de la France',
        'Espaces urbains et ruraux',
      ],
      skills: ['Se repérer', 'Comprendre', 'Raisonner', 'S\'informer'],
    },
  },
  CM2: {
    francais: {
      topics: [
        'Lecture et compréhension de textes complexes',
        'Grammaire avancée',
        'Conjugaison (tous les temps)',
        'Orthographe grammaticale',
        'Expression écrite structurée',
      ],
      skills: ['Comprendre', 'Analyser', 'Synthétiser', 'Argumenter'],
    },
    mathematiques: {
      topics: [
        'Nombres décimaux',
        'Fractions et opérations',
        'Proportionnalité',
        'Géométrie (symétrie, angles)',
        'Résolution de problèmes complexes',
      ],
      skills: ['Calculer', 'Raisonner', 'Modéliser', 'Communiquer'],
    },
    sciences_technologie: {
      topics: [
        'Le vivant (classification, évolution)',
        'La matière (transformations)',
        'L\'énergie (sources, conversions)',
        'Technologie et informatique',
        'Environnement et développement durable',
      ],
      skills: ['Observer', 'Expérimenter', 'Modéliser', 'Communiquer'],
    },
    histoire_geographie: {
      topics: [
        'Temps modernes',
        'Révolution et XIXe siècle',
        'Géographie de l\'Europe',
        'Mobilités et migrations',
      ],
      skills: ['Se repérer', 'Analyser', 'Raisonner', 'Coopérer'],
    },
  },
};

/**
 * Generate assessment questions using Gemini 2.5 Flash
 */
export async function generateAssessmentQuestions(
  context: CurriculumContext,
  numberOfQuestions: number = 10
): Promise<AssessmentQuestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const subjectName = SUBJECT_TRANSLATIONS[context.language][context.subject];
    const curriculumInfo = CURRICULUM_STANDARDS[context.gradeLevel]?.[context.subject] || {
      topics: ['General knowledge'],
      skills: ['Understanding', 'Applying', 'Analyzing'],
    };

    // Build the prompt
    const prompt = buildAssessmentPrompt(context, subjectName, curriculumInfo, numberOfQuestions);

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    const questions = parseGeminiResponse(text, context);

    return questions;
  } catch (error) {
    console.error('Error generating assessment questions:', error);
    throw new Error('Failed to generate assessment questions. Please try again.');
  }
}

/**
 * Build the prompt for Gemini
 */
function buildAssessmentPrompt(
  context: CurriculumContext,
  subjectName: string,
  curriculumInfo: Record<string, unknown> | null,
  numberOfQuestions: number
): string {
  const languageInstruction =
    context.language === 'fr'
      ? 'Generate all questions, options, and explanations in French.'
      : 'Generate all questions, options, and explanations in English.';

  const curriculumContext = context.curriculumData
    ? `\n\nAdditional Curriculum Context:\n${JSON.stringify(context.curriculumData, null, 2)}`
    : '';

  return `You are an expert educational assessment designer for the French curriculum (${context.gradeLevel} level).

${languageInstruction}

Generate ${numberOfQuestions} adaptive assessment questions for:
- Subject: ${subjectName}
- Grade Level: ${context.gradeLevel}
- Topics: ${Array.isArray(curriculumInfo?.topics) ? curriculumInfo.topics.join(', ') : 'N/A'}
- Skills to assess: ${Array.isArray(curriculumInfo?.skills) ? curriculumInfo.skills.join(', ') : 'N/A'}
${curriculumContext}

Requirements:
1. Create questions with varying difficulty levels (1-10 scale)
2. Start with medium difficulty (level 5-6)
3. Include 4 multiple-choice options per question
4. Provide the correct answer
5. Include a brief explanation for the correct answer
6. Align with French national curriculum standards
7. Questions should assess different cognitive skills (recall, understanding, application, analysis)
8. Make questions age-appropriate and engaging

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "question": "Question text here",
    "options": [
      {"value": "A", "label": "Option A text"},
      {"value": "B", "label": "Option B text"},
      {"value": "C", "label": "Option C text"},
      {"value": "D", "label": "Option D text"}
    ],
    "correct_answer": "A",
    "explanation": "Explanation of why this is correct",
    "difficulty_level": 5,
    "category": "understanding"
  }
]

Categories to use: "recall", "understanding", "application", "analysis", "synthesis", "evaluation"`;
}

/**
 * Parse Gemini's response and convert to AssessmentQuestion format
 * 
 * Handles various response formats from Gemini including:
 * - Plain JSON arrays
 * - JSON wrapped in markdown code blocks
 * - Text before/after JSON
 * - Multiple code blocks
 */
function parseGeminiResponse(
  text: string,
  context: CurriculumContext
): AssessmentQuestion[] {
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
    const parsedQuestions = JSON.parse(cleanedText);

    if (!Array.isArray(parsedQuestions)) {
      throw new Error('Response is not a JSON array');
    }

    if (parsedQuestions.length === 0) {
      throw new Error('Response contains an empty array');
    }

    // Convert to AssessmentQuestion format with IDs
    const questions: AssessmentQuestion[] = parsedQuestions.map((q: Record<string, unknown>, index: number) => {
      // Validate required fields
      if (!q.question || !q.options || !q.correct_answer) {
        throw new Error(`Question ${index + 1} is missing required fields (question, options, or correct_answer)`);
      }

      return {
        id: `gemini-${Date.now()}-${index}`,
        question: String(q.question ?? ''),
        options: Array.isArray(q.options) ? q.options as { value: string; label: string }[] : [],
        correct_answer: String(q.correct_answer ?? ''),
        explanation: String(q.explanation ?? ''),
        difficulty_level: typeof q.difficulty_level === 'number' ? q.difficulty_level : 5,
        category: String(q.category ?? 'understanding'),
        subject: context.subject,
        grade_level: context.gradeLevel,
      };
    });

    return questions;
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    console.error('Raw response (first 500 chars):', text.substring(0, 500));
    console.error('Raw response (last 500 chars):', text.substring(Math.max(0, text.length - 500)));
    
    // Provide more helpful error message
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON from Gemini response: ${error.message}`);
    }
    throw new Error(`Failed to parse assessment questions from Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load curriculum data from Supabase Storage (future implementation)
 * This function is a placeholder for when curriculum JSON documents are stored in Supabase
 */
export async function loadCurriculumFromStorage(
  subject: SubjectType,
  gradeLevel: GradeLevelType
): Promise<Record<string, unknown> | null> {
  try {
    // Future implementation:
    // const { data, error } = await supabase.storage
    //   .from('curriculum')
    //   .download(`${gradeLevel}/${subject}.json`);
    //
    // if (error) throw error;
    // return JSON.parse(await data.text());

    console.log('Curriculum storage not yet implemented. Using default standards.');
    return null;
  } catch (error) {
    console.error('Error loading curriculum from storage:', error);
    return null;
  }
}

/**
 * Generate adaptive questions based on student performance
 * This adjusts difficulty based on previous answers
 */
export async function generateAdaptiveQuestion(
  context: CurriculumContext,
  previousAnswers: { isCorrect: boolean; difficulty: number }[]
): Promise<AssessmentQuestion> {
  // Calculate suggested difficulty based on performance
  const recentAnswers = previousAnswers.slice(-3); // Last 3 answers
  const correctCount = recentAnswers.filter(a => a.isCorrect).length;
  const avgDifficulty = recentAnswers.reduce((sum, a) => sum + a.difficulty, 0) / recentAnswers.length;

  let targetDifficulty = avgDifficulty;
  if (correctCount === 3) {
    targetDifficulty = Math.min(10, avgDifficulty + 2); // Increase difficulty
  } else if (correctCount === 0) {
    targetDifficulty = Math.max(1, avgDifficulty - 2); // Decrease difficulty
  }

  // Generate a single question at the target difficulty
  const questions = await generateAssessmentQuestions(context, 1);
  
  // Adjust the difficulty level of the generated question
  if (questions.length > 0) {
    questions[0].difficulty_level = Math.round(targetDifficulty);
  }

  return questions[0];
}
