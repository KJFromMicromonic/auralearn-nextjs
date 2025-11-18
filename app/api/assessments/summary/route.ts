/**
 * API Route: Generate Assessment Summary
 * 
 * Server-side route for generating AI-powered assessment summaries
 * Uses Gemini 2.0 Flash for generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAssessmentSummary as generateSummary, type SummaryOptions } from '@/services/assessment-ai-summary';
import type { ReportData } from '@/services/assessment-report-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportData, options } = body;

    // Validate required fields
    if (!reportData) {
      return NextResponse.json(
        { error: 'Missing required field: reportData' },
        { status: 400 }
      );
    }

    // Generate AI summary (server-side function)
    const summary = await generateSummary(reportData as ReportData, (options || {}) as SummaryOptions);

    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error('Error generating assessment summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate assessment summary';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

