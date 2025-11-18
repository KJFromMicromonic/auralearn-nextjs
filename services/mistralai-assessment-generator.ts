/**
 * MistralAI Assessment Generator
 *
 * Generates adaptive assessment questions using MistralAI
 * based on curriculum context (subject, grade level, language)
 * and previous student performance.
 */

import { SubjectType, GradeLevelType } from '@/contexts/AuthContext';
import { callMistralAI, generateStructuredResponse } from './mistralai-client';

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
 * This provides context for MistralAI to generate appropriate questions
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
 * Generate assessment questions using MistralAI
 *
 * @param context - Curriculum context (subject, grade level, language)
 * @param numberOfQuestions - Number of questions to generate (default: 10)
 * @returns Array of assessment questions
 */
export async function generateAssessmentQuestions(
  context: CurriculumContext,
  numberOfQuestions: number = 10
): Promise<AssessmentQuestion[]> {
  try {
    const subjectName = SUBJECT_TRANSLATIONS[context.language][context.subject];
    const curriculumInfo = CURRICULUM_STANDARDS[context.gradeLevel]?.[context.subject] || {
      topics: ['General knowledge'],
      skills: ['Understanding', 'Applying', 'Analyzing'],
    };

    // Build the prompt
    const prompt = buildAssessmentPrompt(context, subjectName, curriculumInfo, numberOfQuestions);
    const systemPrompt = buildSystemPrompt(context.language);

    console.log('🤖 Generating assessment questions with MistralAI:', {
      subject: subjectName,
      gradeLevel: context.gradeLevel,
      language: context.language,
      numberOfQuestions,
    });

    // Use structured response generation - prompt already requests wrapped format
    const response = await generateStructuredResponse<{ questions: Array<Record<string, unknown>> }>(
      prompt,
      systemPrompt,
      {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' },
                      label: { type: 'string' },
                    },
                    required: ['value', 'label'],
                  },
                },
                correct_answer: { type: 'string' },
                explanation: { type: 'string' },
                difficulty_level: { type: 'number' },
                category: { type: 'string' },
              },
              required: ['question', 'options', 'correct_answer', 'explanation', 'difficulty_level', 'category'],
            },
          },
        },
        required: ['questions'],
      }
    );

    // Extract questions from response
    const questions = response.questions || [];

    // Add IDs and context to questions
    const questionsWithIds: AssessmentQuestion[] = questions.map((q: Record<string, unknown>, index: number) => ({
      id: `mistral-${Date.now()}-${index}`,
      question: String(q.question ?? ''),
      options: Array.isArray(q.options) ? q.options as { value: string; label: string }[] : [],
      correct_answer: String(q.correct_answer ?? ''),
      explanation: String(q.explanation ?? ''),
      difficulty_level: typeof q.difficulty_level === 'number' ? q.difficulty_level : 5,
      category: String(q.category ?? 'understanding'),
      subject: context.subject,
      grade_level: context.gradeLevel,
    }));

    return questionsWithIds;
  } catch (error) {
    console.error('Error generating assessment questions:', error);
    throw new Error('Failed to generate assessment questions. Please try again.');
  }
}

/**
 * Build system prompt for MistralAI
 */
function buildSystemPrompt(language: 'en' | 'fr'): string {
  if (language === 'fr') {
    return `Vous êtes un expert en conception d'évaluations pédagogiques pour le curriculum français.
Vous générez des questions d'évaluation adaptatives, alignées sur les standards nationaux français.
Vous devez toujours répondre avec un JSON valide, sans markdown, sans blocs de code.`;
  } else {
    return `You are an expert educational assessment designer for the French curriculum.
You generate adaptive assessment questions aligned with French national standards.
You must always respond with valid JSON, no markdown, no code blocks.`;
  }
}

/**
 * Build the prompt for MistralAI
 */
function buildAssessmentPrompt(
  context: CurriculumContext,
  subjectName: string,
  curriculumInfo: Record<string, unknown> | null,
  numberOfQuestions: number
): string {
  const languageInstruction =
    context.language === 'fr'
      ? 'Générez toutes les questions, options et explications en français.'
      : 'Generate all questions, options, and explanations in English.';

  const curriculumContext = context.curriculumData
    ? `\n\nAdditional Curriculum Context:\n${JSON.stringify(context.curriculumData, null, 2)}`
    : '';

  if (context.language === 'fr') {
    return `Vous êtes un expert en conception d'évaluations pédagogiques pour le curriculum français (niveau ${context.gradeLevel}).

${languageInstruction}

Générez ${numberOfQuestions} questions d'évaluation adaptatives pour:
- Matière: ${subjectName}
- Niveau: ${context.gradeLevel}
- Sujets: ${Array.isArray(curriculumInfo?.topics) ? curriculumInfo.topics.join(', ') : 'N/A'}
- Compétences à évaluer: ${Array.isArray(curriculumInfo?.skills) ? curriculumInfo.skills.join(', ') : 'N/A'}
${curriculumContext}

Exigences:
1. Créez des questions avec des niveaux de difficulté variables (échelle 1-10)
2. Commencez avec une difficulté moyenne (niveau 5-6)
3. Incluez 4 options à choix multiples par question
4. Fournissez la bonne réponse
5. Incluez une brève explication de la bonne réponse
6. Alignez-vous sur les standards du curriculum national français
7. Les questions doivent évaluer différentes compétences cognitives (mémorisation, compréhension, application, analyse)
8. Rendez les questions adaptées à l'âge et engageantes

Répondez UNIQUEMENT avec un objet JSON valide avec cette structure exacte (pas de markdown, pas de blocs de code):
{
  "questions": [
    {
      "question": "Texte de la question ici",
      "options": [
        {"value": "A", "label": "Texte de l'option A"},
        {"value": "B", "label": "Texte de l'option B"},
        {"value": "C", "label": "Texte de l'option C"},
        {"value": "D", "label": "Texte de l'option D"}
      ],
      "correct_answer": "A",
      "explanation": "Explication de pourquoi c'est correct",
      "difficulty_level": 5,
      "category": "comprehension"
    }
  ]
}

Catégories à utiliser: "memoire", "comprehension", "application", "analyse", "synthese", "evaluation"`;
  } else {
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

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "questions": [
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
}

Categories to use: "recall", "understanding", "application", "analysis", "synthesis", "evaluation"`;
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
 *
 * @param context - Curriculum context
 * @param previousAnswers - Array of previous answer results
 * @returns Single adaptive assessment question
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

