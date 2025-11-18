/**
 * Challenge Progress Service
 * 
 * Manages challenge assignments, progress tracking, and streaks
 */

import { supabase } from '@/lib/supabase';
import { AdaptabilityChallenge, ChallengeProgress, WeeklyChallenge } from './adaptability-challenges-service';

export interface ChallengeProgressRecord {
  id: string;
  student_id: string;
  challenge_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assigned_date: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  level: 'easy' | 'medium' | 'hard';
  reflection?: {
    whatWasHardest?: string;
    whatChanged?: string;
    whatSurprised?: string;
  };
  parent_notes?: string;
  difficulty_rating?: number;
  enjoyment_rating?: number;
}

export interface ChallengeStreak {
  id: string;
  student_id: string;
  streak_type: 'adaptability' | 'strategy_switching' | 'focus' | 'challenge_accepted';
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
}

/**
 * Assign a weekly challenge to a student
 * Uses API route to bypass RLS issues with Clerk JWT
 * 
 * @param studentId - Student UUID
 * @param challenge - Challenge to assign
 * @param clerkId - Clerk user ID (required for authentication)
 */
export async function assignWeeklyChallenge(
  studentId: string,
  challenge: AdaptabilityChallenge,
  clerkId: string
): Promise<ChallengeProgressRecord> {
  try {
    if (!clerkId) {
      throw new Error('Clerk user ID is required');
    }

    const assignedDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    // Use API route instead of direct Supabase call to handle authentication properly
    const response = await fetch('/api/challenges/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId,
        challengeId: challenge.id,
        level: challenge.level,
        assignedDate: assignedDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        clerkId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const { data } = await response.json();
    return data as ChallengeProgressRecord;
  } catch (error) {
    console.error('Error assigning weekly challenge:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
}

/**
 * Start a challenge
 * Uses API route to bypass RLS issues with Clerk JWT
 * 
 * @param progressId - Challenge progress record ID
 * @param clerkId - Clerk user ID (required for authentication)
 */
export async function startChallenge(
  progressId: string,
  clerkId: string
): Promise<ChallengeProgressRecord> {
  try {
    if (!clerkId) {
      throw new Error('Clerk user ID is required');
    }

    // Use API route instead of direct Supabase call
    const response = await fetch('/api/challenges/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        progressId,
        clerkId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const { data } = await response.json();
    return data as ChallengeProgressRecord;
  } catch (error) {
    console.error('Error starting challenge:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
}

/**
 * Complete a challenge with optional reflection
 * Uses API route to bypass RLS issues with Clerk JWT
 * 
 * @param progressId - Challenge progress record ID
 * @param clerkId - Clerk user ID (required for authentication)
 * @param reflection - Optional reflection questions
 * @param parentNotes - Optional parent notes
 * @param difficultyRating - Optional difficulty rating (1-5)
 * @param enjoymentRating - Optional enjoyment rating (1-5)
 */
export async function completeChallenge(
  progressId: string,
  clerkId: string,
  reflection?: {
    whatWasHardest?: string;
    whatChanged?: string;
    whatSurprised?: string;
  },
  parentNotes?: string,
  difficultyRating?: number,
  enjoymentRating?: number
): Promise<ChallengeProgressRecord> {
  try {
    if (!clerkId) {
      throw new Error('Clerk user ID is required');
    }

    // Use API route instead of direct Supabase call
    const response = await fetch('/api/challenges/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        progressId,
        reflection,
        parentNotes,
        difficultyRating,
        enjoymentRating,
        clerkId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const { data } = await response.json();
    
    // Update streaks (pass clerkId from the function parameter)
    await updateStreaks(data.student_id, data.challenge_id, clerkId);
    
    return data as ChallengeProgressRecord;
  } catch (error) {
    console.error('Error completing challenge:', error);
    throw error;
  }
}

/**
 * Get current weekly challenge for a student
 */
export async function getCurrentWeeklyChallenge(
  studentId: string
): Promise<WeeklyChallenge | null> {
  try {
    const { data, error } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('assigned_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No current challenge
      }
      throw error;
    }

    // In production, you'd fetch the challenge details from adaptability_challenges table
    // For now, return the progress record
    return {
      challenge: {} as AdaptabilityChallenge, // Would be populated from challenge catalog
      assignedDate: data.assigned_date,
      dueDate: data.due_date || '',
      status: data.status as any,
      progress: data as any,
    };
  } catch (error) {
    console.error('Error fetching weekly challenge:', error);
    return null;
  }
}

/**
 * Get challenge history for a student
 */
export async function getChallengeHistory(
  studentId: string,
  limit: number = 20
): Promise<ChallengeProgressRecord[]> {
  try {
    const { data, error } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('student_id', studentId)
      .order('assigned_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data as ChallengeProgressRecord[];
  } catch (error) {
    console.error('Error fetching challenge history:', error);
    return [];
  }
}

/**
 * Get streaks for a student
 */
export async function getStreaks(
  studentId: string
): Promise<ChallengeStreak[]> {
  try {
    const { data, error } = await supabase
      .from('challenge_streaks')
      .select('*')
      .eq('student_id', studentId);

    if (error) throw error;

    return data as ChallengeStreak[];
  } catch (error) {
    console.error('Error fetching streaks:', error);
    return [];
  }
}

/**
 * Update streaks after challenge completion
 * Uses API route to bypass RLS issues
 * 
 * @param studentId - Student UUID
 * @param challengeId - Challenge ID
 * @param clerkId - Clerk user ID (required for authentication)
 */
async function updateStreaks(
  studentId: string,
  challengeId: string,
  clerkId: string
): Promise<void> {
  try {
    if (!clerkId) {
      console.warn('Clerk user ID not available for streak update');
      return; // Silently fail - streaks are not critical
    }

    // Use API route instead of direct Supabase call
    const response = await fetch('/api/challenges/update-streaks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId,
        challengeId,
        clerkId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Error updating streaks:', errorData.error);
      // Don't throw - streaks are not critical
      return;
    }

    // Success - streaks updated
    return;
  } catch (error) {
    console.error('Error updating streaks:', error);
    // Non-critical, don't throw
  }
}

/**
 * Get challenge statistics for a student
 */
export async function getChallengeStats(studentId: string): Promise<{
  totalCompleted: number;
  totalPending: number;
  byLevel: Record<string, number>;
  byPillar: Record<string, number>;
  averageDifficulty: number;
  averageEnjoyment: number;
}> {
  try {
    const history = await getChallengeHistory(studentId, 1000);

    const stats = {
      totalCompleted: 0,
      totalPending: 0,
      byLevel: {} as Record<string, number>,
      byPillar: {} as Record<string, number>,
      averageDifficulty: 0,
      averageEnjoyment: 0,
    };

    let totalDifficulty = 0;
    let difficultyCount = 0;
    let totalEnjoyment = 0;
    let enjoymentCount = 0;

    history.forEach(progress => {
      if (progress.status === 'completed') {
        stats.totalCompleted++;
      } else if (progress.status === 'pending') {
        stats.totalPending++;
      }

      stats.byLevel[progress.level] = (stats.byLevel[progress.level] || 0) + 1;

      if (progress.difficulty_rating) {
        totalDifficulty += progress.difficulty_rating;
        difficultyCount++;
      }

      if (progress.enjoyment_rating) {
        totalEnjoyment += progress.enjoyment_rating;
        enjoymentCount++;
      }
    });

    stats.averageDifficulty = difficultyCount > 0 ? totalDifficulty / difficultyCount : 0;
    stats.averageEnjoyment = enjoymentCount > 0 ? totalEnjoyment / enjoymentCount : 0;

    return stats;
  } catch (error) {
    console.error('Error calculating challenge stats:', error);
    return {
      totalCompleted: 0,
      totalPending: 0,
      byLevel: {},
      byPillar: {},
      averageDifficulty: 0,
      averageEnjoyment: 0,
    };
  }
}

