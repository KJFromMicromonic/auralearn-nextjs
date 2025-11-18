/**
 * API Route: Generate Cognitive Assessment Questions
 * 
 * Server-side route for generating cognitive assessment questions
 * Uses Gemini 2.0 Flash for generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCognitiveAssessment } from '@/services/gemini-cognitive-generator';
import { serverLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language: inputLanguage = 'fr', gradeLevel: inputGradeLevel = 'CM1' } = body;
    let language = inputLanguage;
    let gradeLevel = inputGradeLevel;

    // Normalize and validate grade level - default to CM1 if null, undefined, or invalid
    const validGradeLevels: string[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e'];
    if (!gradeLevel || !validGradeLevels.includes(gradeLevel)) {
      serverLogger.warn('Invalid grade level received, defaulting to CM1');
      gradeLevel = 'CM1';
    }

    // Generate cognitive assessment
    const assessment = await generateCognitiveAssessment(
      language as 'en' | 'fr',
      gradeLevel as 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e'
    );

    return NextResponse.json(assessment, { status: 200 });
  } catch (error) {
    serverLogger.error('Error generating cognitive assessment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate cognitive assessment';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

