/**
 * API Route: Generate Academic Assessment Questions
 * 
 * Server-side route for generating academic assessment questions
 * Uses either Gemini or MistralAI based on configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAssessmentQuestions } from '@/services/gemini-assessment-generator';
import type { CurriculumContext } from '@/services/gemini-assessment-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, gradeLevel, language, numberOfQuestions = 10, useMistralAI = false } = body;

    // Validate required fields
    if (!subject || !gradeLevel || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, gradeLevel, language' },
        { status: 400 }
      );
    }

    const context: CurriculumContext = {
      subject,
      gradeLevel,
      language: language as 'en' | 'fr',
    };

    // Generate questions using Gemini (default)
    // If useMistralAI is true, we could switch to MistralAI here
    const questions = await generateAssessmentQuestions(context, numberOfQuestions);

    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    console.error('Error generating assessment questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate assessment questions';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

