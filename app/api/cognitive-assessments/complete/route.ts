/**
 * API Route: Complete Learning Snapshot
 * 
 * Server-side route for completing learning snapshots and storing learning insights.
 * Uses Supabase service role key to bypass RLS policies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';
import { 
  calculateDomainScores, 
  generateCognitiveProfile,
  type CognitiveDomain,
  type CognitiveQuestion,
} from '@/services/gemini-cognitive-generator';

// Get Supabase service role key (server-side only)
function getSupabaseServiceKey(): string {
  return process.env.SUPABASE_SERVICE_KEY || '';
}

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

// Create Supabase client with service role key (bypasses RLS)
function getSupabaseAdmin() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  
  if (!url || !serviceKey) {
    throw new Error('Supabase service role key or URL not configured');
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Calculate confidence score based on response patterns
 */
function calculateConfidenceScore(responses: Array<{ response_time_ms?: number }>): number {
  // Base confidence
  let confidence = 0.7;

  // Check response time consistency
  const responseTimes = responses
    .filter((r) => r.response_time_ms && typeof r.response_time_ms === 'number')
    .map((r) => r.response_time_ms as number);

  if (responseTimes.length > 5) {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher confidence
    if (stdDev < avgTime * 0.3) {
      confidence += 0.1;
    } else if (stdDev > avgTime * 0.7) {
      confidence -= 0.1;
    }
  }

  return Math.max(0.3, Math.min(1.0, confidence));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'Missing required field: assessmentId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get assessment details
    const { data: assessment, error: assessmentError } = await supabase
      .from('learning_profiles')
      .select('*, learning_profile_questions(*)')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      serverLogger.error('Error fetching assessment:', assessmentError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment', details: assessmentError.message },
        { status: 500 }
      );
    }

    // Get all responses
    const { data: responses, error: responsesError } = await supabase
      .from('learning_profile_responses')
      .select('*')
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      serverLogger.error('Error fetching responses:', responsesError);
      return NextResponse.json(
        { error: 'Failed to fetch responses', details: responsesError.message },
        { status: 500 }
      );
    }

    if (!responses || responses.length !== 15) {
      return NextResponse.json(
        { error: `Expected 15 responses, got ${responses?.length || 0}` },
        { status: 400 }
      );
    }

    // Get questions to check for reverse scoring
    const questions = (assessment.learning_profile_questions as any)?.questions as CognitiveQuestion[] || [];
    
    // Prepare responses with reverse scoring info
    const responsesWithReverse = responses.map((r) => {
      const question = questions.find((q) => q.id === r.question_id);
      return {
        domain: r.domain as CognitiveDomain,
        value: r.response_value,
        reverse: question?.reverse || false,
      };
    });

    // Calculate domain scores
    const domainScores = calculateDomainScores(responsesWithReverse);

    // Generate cognitive profile
    const profile = generateCognitiveProfile(domainScores);

    // Calculate confidence score based on response consistency
    const confidence_score = calculateConfidenceScore(responses);

    // Store results using service role key (bypasses RLS)
    const { data: result, error: resultError } = await supabase
      .from('learning_profile_results')
      .insert({
        assessment_id: assessmentId,
        student_id: assessment.student_id,
        assessment_type: assessment.assessment_type,
        domain_scores: domainScores,
        overall_score: profile.overall_score,
        confidence_score: confidence_score,
        profile_summary: profile.profile_summary,
        strengths: profile.strengths,
        areas_for_support: profile.areas_for_support,
      })
      .select()
      .single();

    if (resultError) {
      serverLogger.error('Error inserting results:', resultError);
      return NextResponse.json(
        { error: 'Failed to store results', details: resultError.message },
        { status: 500 }
      );
    }

    // Mark assessment as completed
    const { error: updateError } = await supabase
      .from('learning_profiles')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (updateError) {
      serverLogger.error('Error updating assessment status:', updateError);
      // Don't fail the request if status update fails - results are already saved
      serverLogger.warn('Assessment results saved but status update failed');
    }

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    serverLogger.error('Error completing learning snapshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete learning snapshot';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

