/**
 * Strategy History Service
 * Tracks all generated strategies and resources used
 */

import { supabase, StudentCategory } from '@/lib/supabase';
import { InsightResponse } from './mistralai-insights';
import { BraveSearchResult, YouTubeTranscriptResult } from './internet-intelligence';

export interface StrategyHistoryRecord {
  id: string;
  student_id: string;
  student_category: StudentCategory;
  curriculum_topic: string;
  audience: 'teacher' | 'parent';
  summary: string;
  strategies: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  resources: Array<Record<string, unknown>>;
  home_support_checklist?: Array<Record<string, unknown>>;
  brave_search_urls: string[];
  youtube_urls: string[];
  generated_by: string;
  generated_at: string;
}

/**
 * Save a new strategy to history
 */
export async function saveStrategyToHistory(
  studentId: string,
  category: StudentCategory,
  topic: string,
  audience: 'teacher' | 'parent',
  insight: InsightResponse,
  webResources: BraveSearchResult[],
  youtubeTranscripts: YouTubeTranscriptResult[],
  userId: string
): Promise<StrategyHistoryRecord> {
  const braveUrls = webResources.map(r => r.url);
  const youtubeUrls = youtubeTranscripts.map(t => t.videoUrl);

  const record = {
    student_id: studentId,
    student_category: category,
    curriculum_topic: topic,
    audience,
    summary: insight.summary,
    strategies: insight.strategies,
    activities: insight.activities,
    resources: insight.resources,
    home_support_checklist: insight.homeSupportChecklist,
    brave_search_urls: braveUrls,
    youtube_urls: youtubeUrls,
    generated_by: userId,
  };

  const { data, error } = await supabase
    .from('strategy_history')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Error saving strategy to history:', error);
    throw error;
  }

  return data as StrategyHistoryRecord;
}

/**
 * Get all strategies for a student
 */
export async function getStrategyHistory(
  studentId: string,
  audience?: 'teacher' | 'parent'
): Promise<StrategyHistoryRecord[]> {
  let query = supabase
    .from('strategy_history')
    .select('*')
    .eq('student_id', studentId)
    .order('generated_at', { ascending: false });

  if (audience) {
    query = query.eq('audience', audience);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching strategy history:', error);
    throw error;
  }

  return data as StrategyHistoryRecord[];
}

/**
 * Get used URLs for a student to avoid duplicates
 */
export async function getUsedUrlsForStudent(studentId: string): Promise<{
  braveUrls: Set<string>;
  youtubeUrls: Set<string>;
}> {
  const { data, error } = await supabase
    .from('strategy_history')
    .select('brave_search_urls, youtube_urls')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching used URLs:', error);
    return { braveUrls: new Set(), youtubeUrls: new Set() };
  }

  const braveUrls = new Set<string>();
  const youtubeUrls = new Set<string>();

  data.forEach(record => {
    record.brave_search_urls?.forEach((url: string) => braveUrls.add(url));
    record.youtube_urls?.forEach((url: string) => youtubeUrls.add(url));
  });

  return { braveUrls, youtubeUrls };
}

/**
 * Filter out already-used resources
 */
export function filterUnusedResources(
  resources: BraveSearchResult[],
  usedUrls: Set<string>
): BraveSearchResult[] {
  return resources.filter(r => !usedUrls.has(r.url));
}

/**
 * Filter out already-used transcripts
 */
export function filterUnusedTranscripts(
  transcripts: YouTubeTranscriptResult[],
  usedUrls: Set<string>
): YouTubeTranscriptResult[] {
  return transcripts.filter(t => !usedUrls.has(t.videoUrl));
}

/**
 * Get latest strategy for a student
 */
export async function getLatestStrategy(
  studentId: string,
  topic: string,
  audience: 'teacher' | 'parent'
): Promise<StrategyHistoryRecord | null> {
  const { data, error } = await supabase
    .from('strategy_history')
    .select('*')
    .eq('student_id', studentId)
    .eq('curriculum_topic', topic)
    .eq('audience', audience)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching latest strategy:', error);
    throw error;
  }

  return data as StrategyHistoryRecord;
}

/**
 * Delete old strategies (cleanup)
 */
export async function deleteOldStrategies(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from('strategy_history')
    .delete()
    .lt('generated_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('Error deleting old strategies:', error);
    throw error;
  }

  return data?.length || 0;
}
