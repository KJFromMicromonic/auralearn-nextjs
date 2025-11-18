import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AssessmentData, ReportData } from './assessment-report-service';
import { getEnvVar } from '@/lib/utils';

// Get API key - prioritize server-side key (GEMINI_API_KEY) over client-side (VITE_GEMINI_API_KEY)
const getApiKey = () => {
  return getEnvVar('GEMINI_API_KEY', '') || getEnvVar('VITE_GEMINI_API_KEY', '');
};

const genAI = new GoogleGenerativeAI(getApiKey());

export interface SummaryOptions {
  language?: 'en' | 'fr';
  includeRecommendations?: boolean;
  detailLevel?: 'brief' | 'detailed' | 'comprehensive';
}

/**
 * Generate AI-powered assessment summary using Gemini
 */
export async function generateAssessmentSummary(
  reportData: ReportData,
  options: SummaryOptions = {}
): Promise<string> {
  const {
    language = 'en',
    includeRecommendations = true,
    detailLevel = 'detailed',
  } = options;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = buildSummaryPrompt(reportData, language, includeRecommendations, detailLevel);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text();

    return summary;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw new Error('Failed to generate AI summary. Please try again.');
  }
}

/**
 * Build the prompt for Gemini
 */
function buildSummaryPrompt(
  reportData: ReportData,
  language: 'en' | 'fr',
  includeRecommendations: boolean,
  detailLevel: 'brief' | 'detailed' | 'comprehensive'
): string {
  const languageInstruction = language === 'fr' 
    ? 'Respond in French.' 
    : 'Respond in English.';

  const detailInstruction = {
    brief: 'Provide a brief 2-3 sentence summary.',
    detailed: 'Provide a detailed paragraph (4-6 sentences) analyzing the performance.',
    comprehensive: 'Provide a comprehensive analysis (2-3 paragraphs) with specific insights.',
  }[detailLevel];

  // Prepare question-by-question analysis with null checks
  const questionAnalysis = reportData.assessment.answers
    .map((answer, index) => {
      const question = reportData.assessment.questions_data[index] as { 
        category?: string; 
        category_key?: string;
        difficulty_level?: number;
      } | undefined;
      const answerData = answer as { 
        is_correct?: boolean; 
        is_correct_answer?: boolean;
        time_taken?: number;
      } | undefined;
      
      // Skip if question or answer is missing
      if (!question || !answerData) {
        console.warn(`Skipping question ${index + 1} - missing data`, { question, answerData });
        return null;
      }
      
      // Try multiple possible field names
      const category = question.category || question.category_key || 'unknown';
      const difficulty = question.difficulty_level ?? 5; // Default to medium difficulty
      const isCorrect = answerData.is_correct ?? answerData.is_correct_answer ?? false;
      
      return {
        questionNumber: index + 1,
        category,
        difficulty,
        correct: isCorrect,
        timeTaken: answerData.time_taken,
      };
    })
    .filter((q) => q !== null) as Array<{
      questionNumber: number;
      category: string;
      difficulty: number;
      correct: boolean;
      timeTaken?: number;
    }>;

  const correctByCategory: Record<string, { correct: number; total: number }> = {};
  questionAnalysis.forEach((q) => {
    if (!correctByCategory[q.category]) {
      correctByCategory[q.category] = { correct: 0, total: 0 };
    }
    correctByCategory[q.category].total++;
    if (q.correct) {
      correctByCategory[q.category].correct++;
    }
  });

  const prompt = `
You are an educational assessment expert analyzing a student's academic performance. ${languageInstruction}

**Student Information:**
- Name: ${reportData.studentName}
- Grade Level: ${reportData.gradeLevel}
- Subject: ${reportData.subject}
- Class: ${reportData.className}

**Assessment Results:**
- Score: ${reportData.assessment.score}/${reportData.assessment.total_questions} (${reportData.scorePercentage.toFixed(1)}%)
- Time Taken: ${reportData.timeFormatted}
- Learning Profile: ${reportData.categoryName}
- Confidence Score: ${(reportData.assessment.confidence_score * 100).toFixed(1)}%

**Performance by Category:**
${Object.entries(correctByCategory)
  .map(([category, stats]) => {
    const percentage = ((stats.correct / stats.total) * 100).toFixed(1);
    return `- ${category}: ${stats.correct}/${stats.total} (${percentage}%)`;
  })
  .join('\n')}

**Question-by-Question Analysis:**
${questionAnalysis
  .map(
    (q) =>
      `Q${q.questionNumber}: ${q.correct ? '✓' : '✗'} | Category: ${q.category} | Difficulty: ${q.difficulty}/10 | Time: ${q.timeTaken}s`
  )
  .join('\n')}

**Identified Strengths:**
${reportData.strengths.length > 0 ? reportData.strengths.map((s) => `- ${s}`).join('\n') : '- None identified'}

**Areas for Improvement:**
${reportData.weaknesses.length > 0 ? reportData.weaknesses.map((w) => `- ${w}`).join('\n') : '- None identified'}

**Task:**
${detailInstruction}

Focus on:
1. Overall performance assessment
2. Specific strengths demonstrated
3. Areas needing improvement
4. Learning style insights based on the determined category
5. Time management observations
${includeRecommendations ? '6. Specific, actionable recommendations for the teacher and parents' : ''}

Write in a professional, encouraging tone suitable for sharing with teachers and parents. Be specific and reference the data provided.
`;

  return prompt;
}

/**
 * Generate comparative summary for multiple assessments
 */
export async function generateProgressSummary(
  assessments: AssessmentData[],
  studentName: string,
  language: 'en' | 'fr' = 'en'
): Promise<string> {
  if (assessments.length === 0) {
    return language === 'fr'
      ? 'Aucune évaluation disponible pour générer un résumé.'
      : 'No assessments available to generate a summary.';
  }

  if (assessments.length === 1) {
    return language === 'fr'
      ? 'Une seule évaluation disponible. Effectuez plus d\'évaluations pour voir les progrès.'
      : 'Only one assessment available. Complete more assessments to see progress.';
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const languageInstruction = language === 'fr' 
      ? 'Respond in French.' 
      : 'Respond in English.';

    const assessmentSummaries = assessments.map((assessment, index) => {
      const scorePercentage = ((assessment.score / assessment.total_questions) * 100).toFixed(1);
      const date = new Date(assessment.completed_at).toLocaleDateString();
      return `
Assessment ${index + 1} (${date}):
- Score: ${assessment.score}/${assessment.total_questions} (${scorePercentage}%)
- Category: ${assessment.category_determined}
- Time: ${Math.floor(assessment.time_taken / 60)}m ${assessment.time_taken % 60}s
- Confidence: ${(assessment.confidence_score * 100).toFixed(1)}%
`;
    });

    const prompt = `
You are an educational assessment expert analyzing a student's progress over time. ${languageInstruction}

**Student:** ${studentName}

**Assessment History (Most Recent First):**
${assessmentSummaries.join('\n')}

**Task:**
Analyze the student's progress across these ${assessments.length} assessments. Provide a comprehensive summary (2-3 paragraphs) that includes:

1. Overall trend (improving, stable, declining)
2. Consistency in performance
3. Changes in learning profile/category
4. Time management trends
5. Specific areas of growth
6. Areas that need continued focus
7. Recommendations for next steps

Be specific, reference the data, and maintain an encouraging, professional tone suitable for teachers and parents.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating progress summary:', error);
    throw new Error('Failed to generate progress summary. Please try again.');
  }
}

/**
 * Generate class-wide summary
 */
export async function generateClassSummary(
  assessments: AssessmentData[],
  className: string,
  language: 'en' | 'fr' = 'en'
): Promise<string> {
  if (assessments.length === 0) {
    return language === 'fr'
      ? 'Aucune évaluation disponible pour cette classe.'
      : 'No assessments available for this class.';
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const languageInstruction = language === 'fr' 
      ? 'Respond in French.' 
      : 'Respond in English.';

    // Calculate class statistics
    const totalScore = assessments.reduce((sum, a) => sum + a.score, 0);
    const totalQuestions = assessments.reduce((sum, a) => sum + a.total_questions, 0);
    const classAverage = ((totalScore / totalQuestions) * 100).toFixed(1);

    const categoryDistribution: Record<string, number> = {};
    assessments.forEach((a) => {
      categoryDistribution[a.category_determined] = 
        (categoryDistribution[a.category_determined] || 0) + 1;
    });

    const avgTime = Math.floor(
      assessments.reduce((sum, a) => sum + a.time_taken, 0) / assessments.length
    );

    const prompt = `
You are an educational assessment expert analyzing class-wide performance. ${languageInstruction}

**Class:** ${className}
**Number of Students Assessed:** ${assessments.length}

**Class Statistics:**
- Average Score: ${classAverage}%
- Average Time: ${Math.floor(avgTime / 60)}m ${avgTime % 60}s
- Score Range: ${Math.min(...assessments.map(a => (a.score / a.total_questions) * 100)).toFixed(1)}% - ${Math.max(...assessments.map(a => (a.score / a.total_questions) * 100)).toFixed(1)}%

**Learning Profile Distribution:**
${Object.entries(categoryDistribution)
  .map(([category, count]) => `- ${category}: ${count} students (${((count / assessments.length) * 100).toFixed(1)}%)`)
  .join('\n')}

**Task:**
Provide a comprehensive class-wide analysis (2-3 paragraphs) that includes:

1. Overall class performance assessment
2. Distribution of learning profiles and what it means
3. Common strengths across the class
4. Common areas needing improvement
5. Recommendations for differentiated instruction
6. Suggestions for grouping strategies
7. Next steps for the teacher

Be specific, data-driven, and provide actionable insights for the teacher.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating class summary:', error);
    throw new Error('Failed to generate class summary. Please try again.');
  }
}
