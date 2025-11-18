/**
 * Scrape New Sources Service
 * Fetches new resources while avoiding previously used URLs
 */

import { StudentCategory } from '@/lib/supabase';
import {
  searchTeachingStrategies,
  batchFetchYouTubeTranscripts,
} from './internet-intelligence';
import {
  getUsedUrlsForStudent,
  filterUnusedResources,
  filterUnusedTranscripts,
  saveStrategyToHistory,
} from './strategy-history';
import { generateTeachingInsight, InsightResponse } from './mistralai-insights';

export interface ScrapeNewSourcesParams {
  studentId: string;
  category: StudentCategory;
  topic: string;
  audience: 'teacher' | 'parent';
  userId: string;
}

/**
 * Main function to scrape new sources and generate insights
 * - Fetches used URLs from history
 * - Searches for new resources via Brave
 * - Fetches YouTube transcripts for new videos
 * - Generates AI insights with fresh content
 * - Saves to strategy history
 */
export async function scrapeNewSources(
  params: ScrapeNewSourcesParams
): Promise<InsightResponse> {
  const { studentId, category, topic, audience, userId } = params;

  console.log('🔍 Scraping new sources for:', { studentId, category, topic, audience });

  // Step 1: Get previously used URLs
  const { braveUrls, youtubeUrls } = await getUsedUrlsForStudent(studentId);
  console.log('📋 Used URLs:', {
    braveCount: braveUrls.size,
    youtubeCount: youtubeUrls.size,
  });

  // Step 2: Search for resources via Brave (using BlackBox AI)
  const allResources = await searchTeachingStrategies(category, topic);
  console.log('🌐 Found resources:', allResources.length);

  // Step 3: Filter out already-used resources
  const newResources = filterUnusedResources(allResources, braveUrls);
  console.log('✨ New resources (filtered):', newResources.length);

  if (newResources.length === 0) {
    throw new Error('No new resources found. All available sources have been used.');
  }

  // Step 4: Extract YouTube URLs from new resources
  const youtubeResourceUrls = newResources
    .filter(r => r.type === 'video')
    .map(r => r.url);
  console.log('🎥 YouTube videos to fetch:', youtubeResourceUrls.length);

  // Step 5: Fetch YouTube transcripts for new videos only
  let newTranscripts = [];
  if (youtubeResourceUrls.length > 0) {
    const allTranscripts = await batchFetchYouTubeTranscripts(youtubeResourceUrls);
    newTranscripts = filterUnusedTranscripts(allTranscripts, youtubeUrls);
    console.log('📝 New transcripts (filtered):', newTranscripts.length);
  }

  // Step 6: Generate AI insights with new resources
  console.log('🤖 Generating insights with new resources...');
  const insights = await generateTeachingInsight({
    studentCategory: category,
    curriculumTopic: topic,
    webResources: newResources,
    youtubeTranscripts: newTranscripts,
    audience,
  });

  // Step 7: Save to strategy history
  console.log('💾 Saving to strategy history...');
  await saveStrategyToHistory(
    studentId,
    category,
    topic,
    audience,
    insights,
    newResources,
    newTranscripts,
    userId
  );

  console.log('✅ Successfully scraped and saved new sources');
  return insights;
}

/**
 * Check if new sources are available
 * Returns the count of new resources without fetching them
 */
export async function checkNewSourcesAvailable(
  studentId: string,
  category: StudentCategory,
  topic: string
): Promise<{ available: boolean; newResourcesCount: number }> {
  // Get used URLs
  const { braveUrls } = await getUsedUrlsForStudent(studentId);

  // Search for resources
  const allResources = await searchTeachingStrategies(category, topic);

  // Filter unused
  const newResources = filterUnusedResources(allResources, braveUrls);

  return {
    available: newResources.length > 0,
    newResourcesCount: newResources.length,
  };
}
