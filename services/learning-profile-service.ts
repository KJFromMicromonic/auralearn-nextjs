/**
 * Learning Profile Service
 * 
 * Handles all business logic for learning profiles (formerly cognitive assessments):
 * - Initiating learning snapshots (student & parent)
 * - Managing parent access links
 * - Storing responses
 * - Calculating learning support area scores
 * - Generating triangulation reports with learning insights
 * - Managing 15-day profile update schedule
 */

import { supabase } from '@/lib/supabase';
import { 
  generateCognitiveAssessment,
} from '@/services/assessment-api-client';
import {
  CognitiveQuestion,
  CognitiveAssessment,
  CognitiveDomain,
  calculateDomainScores,
  generateCognitiveProfile,
  getDomainInterpretation
} from './gemini-cognitive-generator';
import { logger } from '@/lib/logger';

/**
 * Learning snapshot types
 */
export type AssessmentType = 'student' | 'parent';
export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'expired';

/**
 * Learning profile session
 */
export interface CognitiveAssessmentSession {
  id: string;
  student_id: string;
  questions_id: string;
  assessment_type: AssessmentType;
  status: AssessmentStatus;
  language: 'en' | 'fr';
  started_at?: string;
  completed_at?: string;
  voice_session_id?: string;
}

/**
 * Learning profile response
 */
export interface AssessmentResponse {
  question_id: number;
  domain: CognitiveDomain;
  response_value: number;
  response_time_ms?: number;
  voice_transcript?: string;
}

/**
 * Learning support area score result
 */
export interface DomainScore {
  domain: CognitiveDomain;
  average_score: number;
  interpretation: string;
  recommendations: string[];
}

/**
 * Complete learning insights result
 */
export interface AssessmentResult {
  id: string;
  assessment_id: string;
  student_id: string;
  assessment_type: AssessmentType;
  domain_scores: Record<CognitiveDomain, number>;
  overall_score: number;
  confidence_score: number;
  profile_summary: string;
  strengths: CognitiveDomain[];
  areas_for_support: CognitiveDomain[];
  calculated_at: string;
}

/**
 * Triangulation comparison
 */
export interface TriangulationReport {
  student_id: string;
  student_assessment?: AssessmentResult;
  parent_assessment?: AssessmentResult;
  teacher_category?: string;
  domain_comparisons: DomainComparison[];
  discrepancies: Discrepancy[];
  agreements: Agreement[];
  triangulation_score: number;
  key_insights: string[];
  recommended_actions: string[];
}

export interface DomainComparison {
  domain: CognitiveDomain;
  student_score: number;
  parent_score: number;
  difference: number;
  agreement_level: 'high' | 'moderate' | 'low';
}

export interface Discrepancy {
  domain: CognitiveDomain;
  student_perspective: string;
  parent_perspective: string;
  difference: number;
  possible_reasons: string[];
}

export interface Agreement {
  domain: CognitiveDomain;
  shared_perspective: string;
  confidence: number;
}

/**
 * Check if student needs learning profile update (15-day schedule)
 */
export async function needsCognitiveAssessment(studentId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('needs_learning_profile', { p_student_id: studentId });

    if (error) throw error;
    return data === true;
  } catch (error) {
    logger.error('Error checking assessment need:', error);
    return true; // Default to true if error
  }
}

/**
 * Get next learning profile update date for student
 */
export async function getNextAssessmentDate(studentId: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('learning_profile_schedule')
      .select('next_assessment_date')
      .eq('student_id', studentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No schedule exists
      throw error;
    }

    return data?.next_assessment_date ? new Date(data.next_assessment_date) : null;
  } catch (error) {
    logger.error('Error getting next assessment date:', error);
    return null;
  }
}

/**
 * Initiate a new learning snapshot
 * 
 * @param studentId - Student UUID
 * @param assessmentType - 'student' or 'parent'
 * @param language - 'en' or 'fr'
 * @returns Learning profile session with questions
 */
export async function initiateCognitiveAssessment(
  studentId: string,
  assessmentType: AssessmentType,
  language: 'en' | 'fr' = 'fr'
): Promise<{
  session: CognitiveAssessmentSession;
  questions: CognitiveQuestion[];
}> {
  try {
    // Check if questions already exist for this student
    const { data: existingQuestions, error: questionsError } = await supabase
      .from('learning_profile_questions')
      .select('*')
      .eq('student_id', studentId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let questionsId: string;
    let questions: CognitiveQuestion[];

    if (existingQuestions && !questionsError) {
      // Use existing questions
      questionsId = existingQuestions.id;
      questions = existingQuestions.questions as CognitiveQuestion[];
      logger.log('Using existing questions for student');
    } else {
      // Generate new questions
      logger.log('Generating new learning profile questions...');
      const assessment = await generateCognitiveAssessment(language, 'CM1');
      questions = assessment.questions;

      // Store questions in database
      const { data: newQuestions, error: insertError } = await supabase
        .from('learning_profile_questions')
        .insert({
          student_id: studentId,
          questions: questions,
          generation_metadata: assessment.metadata,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      questionsId = newQuestions.id;
      logger.log('New questions generated and stored');
    }

    // Create assessment session
    const { data: session, error: sessionError } = await supabase
      .from('learning_profiles')
      .insert({
        student_id: studentId,
        questions_id: questionsId,
        assessment_type: assessmentType,
        status: 'pending',
        language: language,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    logger.log('Learning profile session created');

    return {
      session: session as CognitiveAssessmentSession,
      questions,
    };
  } catch (error) {
    logger.error('Error initiating learning snapshot:', error);
    throw new Error('Failed to initiate learning snapshot');
  }
}

/**
 * Start a learning snapshot session (mark as in_progress)
 */
export async function startAssessment(
  assessmentId: string,
  voiceSessionId?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('learning_profiles')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        voice_session_id: voiceSessionId,
      })
      .eq('id', assessmentId);

    if (error) throw error;
    logger.log('Assessment started');
  } catch (error) {
    logger.error('Error starting assessment:', error);
    throw error;
  }
}

/**
 * Normalize learning support area value to match database enum
 * Maps variations like "learning_style_preference" to "learning_style"
 */
function normalizeDomain(domain: string | CognitiveDomain): CognitiveDomain {
  if (!domain || typeof domain !== 'string') {
    logger.warn('Invalid domain value, defaulting to "processing_speed"');
    return 'processing_speed';
  }
  
  const domainLower = domain.toLowerCase().trim();
  
  // If already a valid domain, return as-is
  const validDomains: CognitiveDomain[] = [
    'processing_speed',
    'working_memory',
    'attention_focus',
    'learning_style',
    'self_efficacy',
    'motivation_engagement',
  ];
  
  if (validDomains.includes(domainLower as CognitiveDomain)) {
    return domainLower as CognitiveDomain;
  }
  
  // Map variations to correct enum values
  const domainMap: Record<string, CognitiveDomain> = {
    'processing_speed': 'processing_speed',
    'processing': 'processing_speed',
    'speed': 'processing_speed',
    'working_memory': 'working_memory',
    'memory': 'working_memory',
    'working': 'working_memory',
    'attention_focus': 'attention_focus',
    'attention': 'attention_focus',
    'focus': 'attention_focus',
    'learning_style': 'learning_style',
    'learning_style_preference': 'learning_style', // This is the key fix!
    'learning': 'learning_style',
    'style': 'learning_style',
    'self_efficacy': 'self_efficacy',
    'self_efficacy_confidence': 'self_efficacy',
    'efficacy': 'self_efficacy',
    'confidence': 'self_efficacy',
    'motivation_engagement': 'motivation_engagement',
    'motivation': 'motivation_engagement',
    'engagement': 'motivation_engagement',
  };
  
  const normalized = domainMap[domainLower];
  if (!normalized) {
    logger.warn('Unknown domain value, defaulting to "processing_speed"');
    return 'processing_speed';
  }
  
  return normalized;
}

/**
 * Submit a response to a question
 */
export async function submitResponse(
  assessmentId: string,
  response: AssessmentResponse
): Promise<void> {
  try {
    // Normalize domain to ensure it matches database enum
    const normalizedDomain = normalizeDomain(response.domain);
    
    if (normalizedDomain !== response.domain) {
      logger.log('Domain normalized');
    }
    
    const { error } = await supabase
      .from('learning_profile_responses')
      .insert({
        assessment_id: assessmentId,
        question_id: response.question_id,
        domain: normalizedDomain, // Use normalized domain
        response_value: response.response_value,
        response_time_ms: response.response_time_ms,
        voice_transcript: response.voice_transcript,
      });

    if (error) {
      logger.error('Supabase error details:', {
        message: error.message,
        code: error.code,
      });
      throw error;
    }
    logger.log('Response submitted');
  } catch (error) {
    logger.error('Error submitting response:', error);
    throw error;
  }
}

/**
 * Complete a learning snapshot and calculate learning insights
 * 
 * This function now calls an API route that uses the service role key
 * to bypass RLS policies, since students/parents complete snapshots anonymously.
 */
export async function completeAssessment(
  assessmentId: string
): Promise<AssessmentResult> {
  try {
    // Call API route that uses service role key to bypass RLS
    const response = await fetch('/api/cognitive-assessments/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assessmentId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete assessment');
    }

    const { result } = await response.json();
    logger.log('Learning snapshot completed and insights calculated');

    return result as AssessmentResult;
  } catch (error) {
    logger.error('Error completing assessment:', error);
    throw error;
  }
}

/**
 * Calculate confidence score based on response patterns
 */
function calculateConfidenceScore(responses: AssessmentResponse[]): number {
  // Base confidence
  let confidence = 0.7;

  // Check response time consistency
  const responseTimes = responses
    .filter((r): r is AssessmentResponse => 'response_time_ms' in r && typeof r.response_time_ms === 'number')
    .map(r => r.response_time_ms as number);

  if (responseTimes.length > 0) {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    // Very fast responses (< 2 seconds) reduce confidence
    if (avgTime < 2000) confidence -= 0.15;
    
    // Very slow responses (> 60 seconds) reduce confidence
    if (avgTime > 60000) confidence -= 0.1;
  }

  // Check for response variance (not all same answer)
  const values = responses.map(r => r.response_value);
  const uniqueValues = new Set(values).size;
  
  if (uniqueValues === 1) {
    // All same answer - likely not thoughtful
    confidence -= 0.2;
  } else if (uniqueValues >= 4) {
    // Good variance
    confidence += 0.1;
  }

  // Ensure bounds
  return Math.max(0.3, Math.min(1.0, confidence));
}

/**
 * Generate parent learning snapshot link
 */
export async function generateParentLink(
  studentId: string,
  parentEmail: string
): Promise<{
  accessToken: string;
  link: string;
}> {
  try {
    // Get or create questions for student
    const { data: existingQuestions } = await supabase
      .from('learning_profile_questions')
      .select('id')
      .eq('student_id', studentId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let questionsId: string;

    if (existingQuestions) {
      questionsId = existingQuestions.id;
    } else {
      // Generate new questions
      const assessment = await generateCognitiveAssessment('fr', 'CM1');
      const { data: newQuestions, error } = await supabase
        .from('learning_profile_questions')
        .insert({
          student_id: studentId,
          questions: assessment.questions,
          generation_metadata: assessment.metadata,
        })
        .select()
        .single();

      if (error) throw error;
      questionsId = newQuestions.id;
    }

    // Create parent link
    const { data: link, error: linkError } = await supabase
      .from('parent_assessment_links')
      .insert({
        student_id: studentId,
        questions_id: questionsId,
        parent_email: parentEmail,
      })
      .select()
      .single();

    if (linkError) throw linkError;

    const baseUrl = window.location.origin;
    const assessmentLink = `${baseUrl}/parent-assessment/${link.access_token}`;

    logger.log('Parent assessment link generated');

    return {
      accessToken: link.access_token,
      link: assessmentLink,
    };
  } catch (error) {
    logger.error('Error generating parent link:', error);
    throw error;
  }
}

/**
 * Validate parent access token and get questions
 */
export async function validateParentToken(
  token: string
): Promise<{
  valid: boolean;
  studentId?: string;
  questions?: CognitiveQuestion[];
  expired?: boolean;
}> {
  try {
    const { data: link, error } = await supabase
      .from('parent_assessment_links')
      .select('*, learning_profile_questions(*)')
      .eq('access_token', token)
      .single();

    if (error || !link) {
      return { valid: false };
    }

    // Check expiration
    const expiresAt = new Date(link.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, expired: true };
    }

    // Mark as accessed
    await supabase
      .from('parent_assessment_links')
      .update({ accessed_at: new Date().toISOString() })
      .eq('access_token', token);

    return {
      valid: true,
      studentId: link.student_id,
      questions: link.learning_profile_questions.questions as CognitiveQuestion[],
    };
  } catch (error) {
    logger.error('Error validating parent token:', error);
    return { valid: false };
  }
}

/**
 * Get the latest learning insights for a student
 * Uses API route to bypass RLS issues
 * 
 * @param studentId - Student UUID
 * @param clerkId - Clerk user ID (required for authentication)
 * @returns Latest learning insights or null if none exists
 */
export async function getAssessmentResult(
  studentId: string,
  clerkId: string
): Promise<AssessmentResult | null> {
  try {
    if (!clerkId) {
      throw new Error('Clerk user ID is required');
    }

    // Use API route instead of direct Supabase call
    const response = await fetch(`/api/assessment-results/get?studentId=${studentId}&clerkId=${clerkId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No results found
      }
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const { data } = await response.json();
    return data as AssessmentResult | null;
  } catch (error) {
    logger.error('Error fetching assessment result:', error);
    return null;
  }
}

/**
 * Generate triangulation report comparing all three perspectives
 */
export async function generateTriangulationReport(
  studentId: string
): Promise<TriangulationReport> {
  try {
    // Get latest student assessment
    const { data: studentAssessment } = await supabase
      .from('learning_profile_results')
      .select('*')
      .eq('student_id', studentId)
      .eq('assessment_type', 'student')
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    // Get latest parent assessment
    const { data: parentAssessment } = await supabase
      .from('learning_profile_results')
      .select('*')
      .eq('student_id', studentId)
      .eq('assessment_type', 'parent')
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    // Get teacher category
    const { data: student } = await supabase
      .from('students')
      .select('primary_category')
      .eq('id', studentId)
      .single();

    if (!studentAssessment && !parentAssessment) {
      throw new Error('No learning snapshots found for triangulation');
    }

    // Compare domains
    const domainComparisons = compareDomains(
      studentAssessment?.domain_scores,
      parentAssessment?.domain_scores
    );

    // Identify discrepancies and agreements
    const { discrepancies, agreements } = analyzeDiscrepancies(domainComparisons);

    // Calculate triangulation score (agreement level)
    const triangulationScore = calculateTriangulationScore(domainComparisons);

    // Generate insights
    const keyInsights = generateInsights(
      domainComparisons,
      discrepancies,
      student?.primary_category
    );

    // Generate recommended actions
    const recommendedActions = generateRecommendedActions(discrepancies, agreements);

    // Store triangulation analysis
    const { error: analysisError } = await supabase
      .from('learning_profile_triangulation_analysis')
      .insert({
        student_id: studentId,
        student_assessment_id: studentAssessment?.assessment_id,
        parent_assessment_id: parentAssessment?.assessment_id,
        teacher_category: student?.primary_category,
        domain_comparisons: domainComparisons,
        discrepancies: discrepancies,
        agreements: agreements,
        triangulation_score: triangulationScore,
        key_insights: keyInsights,
        recommended_actions: recommendedActions,
      })
      .select()
      .single();

    if (analysisError) throw analysisError;

    return {
      student_id: studentId,
      student_assessment: studentAssessment as AssessmentResult,
      parent_assessment: parentAssessment as AssessmentResult,
      teacher_category: student?.primary_category,
      domain_comparisons: domainComparisons,
      discrepancies,
      agreements,
      triangulation_score: triangulationScore,
      key_insights: keyInsights,
      recommended_actions: recommendedActions,
    };
  } catch (error) {
    logger.error('Error generating triangulation report:', error);
    throw error;
  }
}

/**
 * Compare learning support area scores between student and parent
 */
function compareDomains(
  studentScores?: Record<CognitiveDomain, number>,
  parentScores?: Record<CognitiveDomain, number>
): DomainComparison[] {
  const domains: CognitiveDomain[] = [
    'processing_speed',
    'working_memory',
    'attention_focus',
    'learning_style',
    'self_efficacy',
    'motivation_engagement',
  ];

  return domains.map(domain => {
    const studentScore = studentScores?.[domain] || 0;
    const parentScore = parentScores?.[domain] || 0;
    const difference = Math.abs(studentScore - parentScore);

    let agreement_level: 'high' | 'moderate' | 'low';
    if (difference <= 0.5) agreement_level = 'high';
    else if (difference <= 1.0) agreement_level = 'moderate';
    else agreement_level = 'low';

    return {
      domain,
      student_score: studentScore,
      parent_score: parentScore,
      difference,
      agreement_level,
    };
  });
}

/**
 * Analyze discrepancies and agreements
 */
function analyzeDiscrepancies(
  comparisons: DomainComparison[]
): { discrepancies: Discrepancy[]; agreements: Agreement[] } {
  const discrepancies: Discrepancy[] = [];
  const agreements: Agreement[] = [];

  comparisons.forEach(comp => {
    if (comp.agreement_level === 'low') {
      discrepancies.push({
        domain: comp.domain,
        student_perspective: getScoreInterpretation(comp.student_score),
        parent_perspective: getScoreInterpretation(comp.parent_score),
        difference: comp.difference,
        possible_reasons: getPossibleReasons(comp),
      });
    } else if (comp.agreement_level === 'high') {
      agreements.push({
        domain: comp.domain,
        shared_perspective: getScoreInterpretation(comp.student_score),
        confidence: 1 - comp.difference,
      });
    }
  });

  return { discrepancies, agreements };
}

/**
 * Get interpretation for a score
 */
function getScoreInterpretation(score: number): string {
  if (score >= 4) return 'Strong/High';
  if (score >= 3) return 'Average/Moderate';
  if (score >= 2) return 'Below Average';
  return 'Needs Support';
}

/**
 * Get possible reasons for discrepancy
 */
function getPossibleReasons(comparison: DomainComparison): string[] {
  const reasons: string[] = [];

  if (comparison.student_score > comparison.parent_score) {
    reasons.push('Student may overestimate their abilities');
    reasons.push('Parent may not observe this behavior at home');
    reasons.push('Different contexts (school vs. home)');
  } else {
    reasons.push('Student may underestimate their abilities');
    reasons.push('Parent may have higher expectations');
    reasons.push('Student may lack self-awareness in this area');
  }

  return reasons;
}

/**
 * Calculate overall triangulation score
 */
function calculateTriangulationScore(comparisons: DomainComparison[]): number {
  const avgDifference = comparisons.reduce((sum, c) => sum + c.difference, 0) / comparisons.length;
  return Math.max(0, 1 - avgDifference / 4); // Normalize to 0-1
}

/**
 * Generate key insights
 */
function generateInsights(
  comparisons: DomainComparison[],
  discrepancies: Discrepancy[],
  teacherCategory?: string
): string[] {
  const insights: string[] = [];

  if (discrepancies.length === 0) {
    insights.push('Strong agreement between student and parent perspectives');
  } else if (discrepancies.length >= 3) {
    insights.push('Significant differences in perception - discussion recommended');
  }

  // Add domain-specific insights
  comparisons.forEach(comp => {
    if (comp.agreement_level === 'high' && comp.student_score >= 4) {
      insights.push(`Both agree on strength in ${comp.domain.replace('_', ' ')}`);
    }
  });

  return insights;
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(
  discrepancies: Discrepancy[],
  agreements: Agreement[]
): string[] {
  const actions: string[] = [];

  if (discrepancies.length > 0) {
    actions.push('Schedule parent-teacher conference to discuss perception differences');
    discrepancies.forEach(d => {
      actions.push(`Discuss ${d.domain.replace('_', ' ')} with student and parent`);
    });
  }

  if (agreements.length > 0) {
    actions.push('Build on areas of agreement to boost confidence');
  }

  return actions;
}

