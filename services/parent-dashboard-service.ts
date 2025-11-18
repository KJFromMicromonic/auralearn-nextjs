/**
 * Parent Dashboard Service
 * 
 * Aggregates data for the parent dashboard including:
 * - Learning profile summaries
 * - Recent activities
 * - Assessment status
 */

import { supabase } from '@/lib/supabase';
import { AssessmentResult } from './cognitive-assessment-service';

export interface LearningProfileSummary {
  hasAssessment: boolean;
  lastAssessmentDate?: string;
  primaryStrengths?: string[];
  areasForSupport?: string[];
  overallScore?: number;
  profileSummary?: string;
}

export interface DashboardStats {
  learningProfileStatus: 'completed' | 'pending';
  activitiesCompleted: number;
  recommendationsAvailable: number;
}

export interface ParentDashboardData {
  studentId: string;
  studentName: string;
  stats: DashboardStats;
  learningProfile?: LearningProfileSummary;
  recentActivities: any[]; // Placeholder for future activity tracking
}

/**
 * Get learning profile summary for a student
 * Uses API route to bypass RLS issues
 * 
 * @param studentId - Student UUID
 * @param clerkId - Clerk user ID (required for authentication)
 * @returns Learning profile summary or null if no assessment exists
 */
export async function getLearningProfileSummary(
  studentId: string,
  clerkId: string
): Promise<LearningProfileSummary | null> {
  try {
    if (!clerkId) {
      console.warn('Clerk user ID not provided for learning profile summary');
      return null;
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
        return null; // No assessment found
      }
      console.error('Error fetching assessment result:', response.status);
      return null;
    }

    const { data: assessment } = await response.json();

    if (!assessment) {
      return null;
    }

    return {
      hasAssessment: true,
      lastAssessmentDate: assessment.calculated_at,
      primaryStrengths: assessment.strengths || [],
      areasForSupport: assessment.areas_for_support || [],
      overallScore: assessment.overall_score,
      profileSummary: assessment.profile_summary,
    };
  } catch (error) {
    console.error('Error fetching learning profile summary:', error);
    return null;
  }
}

/**
 * Get recent activities for a student
 * 
 * @param studentId - Student UUID
 * @returns Array of recent activities (placeholder for now)
 */
export async function getRecentActivities(studentId: string): Promise<any[]> {
  // Placeholder - will be implemented when activity tracking is added
  return [];
}

/**
 * Get complete dashboard data for a parent
 * 
 * @param studentId - Student UUID
 * @param studentName - Student name
 * @param clerkId - Clerk user ID (required for authentication)
 * @returns Complete dashboard data
 */
export async function getParentDashboardData(
  studentId: string,
  studentName: string,
  clerkId: string
): Promise<ParentDashboardData> {
  const learningProfile = await getLearningProfileSummary(studentId, clerkId);
  const recentActivities = await getRecentActivities(studentId);

  const stats: DashboardStats = {
    learningProfileStatus: learningProfile?.hasAssessment ? 'completed' : 'pending',
    activitiesCompleted: recentActivities.length,
    recommendationsAvailable: learningProfile?.hasAssessment ? 1 : 0,
  };

  return {
    studentId,
    studentName,
    stats,
    learningProfile: learningProfile || undefined,
    recentActivities,
  };
}

