/**
 * Client-side API client for assessment summary generation
 * 
 * This function calls the Next.js API route which handles
 * server-side API key management
 */

import type { ReportData } from './assessment-report-service';

export interface SummaryOptions {
  language?: 'en' | 'fr';
  includeRecommendations?: boolean;
  detailLevel?: 'brief' | 'detailed' | 'comprehensive';
}

/**
 * Generate AI-powered assessment summary via API
 */
export async function generateAssessmentSummary(
  reportData: ReportData,
  options: SummaryOptions = {}
): Promise<string> {
  try {
    const response = await fetch('/api/assessments/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportData,
        options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate assessment summary');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('Error calling assessment summary API:', error);
    throw error;
  }
}

// Types are defined above

