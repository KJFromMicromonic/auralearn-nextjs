/**
 * API Route: Generate Cognitive Assessment Questions
 * 
 * Server-side route for generating cognitive assessment questions
 * Uses Gemini 2.0 Flash for generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCognitiveAssessment } from '@/services/gemini-cognitive-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language: inputLanguage = 'fr', gradeLevel: inputGradeLevel = 'CM1' } = body;
    let language = inputLanguage;
    let gradeLevel = inputGradeLevel;

    // Normalize and validate grade level - default to CM1 if null, undefined, or invalid
    if (!gradeLevel || (gradeLevel !== 'CM1' && gradeLevel !== 'CM2')) {
      console.warn(`Invalid grade level received: ${gradeLevel}, defaulting to CM1`);
      gradeLevel = 'CM1';
    }

    // Generate cognitive assessment
    const assessment = await generateCognitiveAssessment(
      language as 'en' | 'fr',
      gradeLevel as 'CM1' | 'CM2'
    );

    return NextResponse.json(assessment, { status: 200 });
  } catch (error) {
    console.error('Error generating cognitive assessment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate cognitive assessment';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

