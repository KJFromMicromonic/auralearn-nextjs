import { AdaptabilityChallenge } from './adaptability-challenges-service';
import { LearningProfileSummary } from './parent-dashboard-service';

export interface ChallengeSession {
  id: string;
  progress_id: string;
  student_id: string;
  challenge_id: string;
  status: 'active' | 'completed';
  problem_statement?: string;
  prompt: string;
  materials: string[];
  child_steps: string[];
  parent_tips: string[];
  reflection_questions: string[];
  success_criteria: string[];
  estimated_time?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

export interface ChallengeSessionResponse {
  data: ChallengeSession;
}

export interface CreateChallengeSessionParams {
  progressId: string;
  studentId: string;
  studentName: string;
  challenge: AdaptabilityChallenge;
  learningProfile?: LearningProfileSummary | null;
  clerkId: string;
  language?: string;
}

/**
 * Generate a personalized challenge session by calling the server API route.
 */
export async function createChallengeSession(params: CreateChallengeSessionParams): Promise<ChallengeSession> {
  const response = await fetch('/api/challenges/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to create challenge session (HTTP ${response.status})`);
  }

  const { data } = (await response.json()) as ChallengeSessionResponse;
  return data;
}

/**
 * Fetch the active challenge session for a given progress record.
 */
export async function getActiveChallengeSession(progressId: string, clerkId: string): Promise<ChallengeSession | null> {
  const response = await fetch(`/api/challenges/session?progressId=${progressId}&clerkId=${clerkId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to load challenge session (HTTP ${response.status})`);
  }

  const { data } = (await response.json()) as ChallengeSessionResponse;
  return data;
}

/**
 * Mark a challenge session as completed with optional notes.
 */
export async function completeChallengeSession(
  sessionId: string,
  clerkId: string,
  notes?: {
    reflection?: Record<string, string>;
    parentNotes?: string;
  }
): Promise<ChallengeSession> {
  const response = await fetch('/api/challenges/session', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      clerkId,
      ...notes,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to complete challenge session (HTTP ${response.status})`);
  }

  const { data } = (await response.json()) as ChallengeSessionResponse;
  return data;
}


