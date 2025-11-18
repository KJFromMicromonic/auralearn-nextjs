/**
 * Client-side API client for assessment generation
 * 
 * These functions call the Next.js API routes which handle
 * server-side API key management
 */

import type { AssessmentQuestion, CurriculumContext } from '@/services/gemini-assessment-generator';
import type { CognitiveAssessment, CognitiveQuestion } from '@/services/gemini-cognitive-generator';
import { logger } from '@/lib/logger';

/**
 * Generate academic assessment questions via API
 */
export async function generateAssessmentQuestions(
  context: CurriculumContext,
  numberOfQuestions: number = 10
): Promise<AssessmentQuestion[]> {
  try {
    const response = await fetch('/api/assessments/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: context.subject,
        gradeLevel: context.gradeLevel,
        language: context.language,
        numberOfQuestions,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate assessment questions');
    }

    const data = await response.json();
    return data.questions;
  } catch (error) {
    logger.error('Error calling assessment generation API:', error);
    throw error;
  }
}

/**
 * Generate cognitive assessment questions via API
 */
export async function generateCognitiveAssessment(
  language: 'en' | 'fr' = 'fr',
  gradeLevel: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' = 'CM1'
): Promise<CognitiveAssessment> {
  try {
    const response = await fetch('/api/cognitive-assessments/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        gradeLevel,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate cognitive assessment');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error calling cognitive assessment generation API:', error);
    throw error;
  }
}

// Re-export types for convenience
export type { AssessmentQuestion, CurriculumContext, CognitiveAssessment, CognitiveQuestion };

