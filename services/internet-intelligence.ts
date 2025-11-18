/**
 * Internet Intelligence Service
 *
 * Provides web search and YouTube transcript functionality
 * Currently uses mock implementations (to be replaced with real APIs)
 */

import { StudentCategory } from '../lib/supabase';

export interface BraveSearchResult {
  title: string;
  url: string;
  snippet: string;
  type: 'article' | 'blog' | 'pdf' | 'video' | 'website';
  relevanceScore?: number;
}

export interface YouTubeTranscriptResult {
  videoUrl: string;
  videoId: string;
  title: string;
  transcript: string;
  durationSeconds?: number;
}

/**
 * Mock implementations (to be replaced with real API calls)
 * These functions simulate web search and YouTube transcript fetching
 */

/**
 * Search for teaching strategies
 * 
 * TODO: Replace with real Brave Search API integration
 * Currently returns mock data
 */
export async function searchTeachingStrategies(
  studentCategory: StudentCategory,
  curriculumTopic: string
): Promise<BraveSearchResult[]> {
  const categoryText = studentCategory.replace(/_/g, ' ');

  console.log('🔍 Searching for teaching strategies:', { categoryText, curriculumTopic });
  
  // Return mock data (to be replaced with real API call)
  return mockBraveSearchResults(categoryText, curriculumTopic);
}

/**
 * Fetch YouTube transcript
 * 
 * TODO: Replace with real YouTube Transcript API integration
 * Currently returns mock data
 */
export async function fetchYouTubeTranscript(
  videoUrl: string,
  studentCategory?: StudentCategory,
  curriculumTopic?: string
): Promise<YouTubeTranscriptResult | null> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    console.error('Invalid YouTube URL:', videoUrl);
    return null;
  }

  console.log('📺 Fetching YouTube transcript:', videoId);
  
  // Return mock data (to be replaced with real API call)
  return mockYouTubeTranscript(videoId);
}

/**
 * Batch fetch transcripts for multiple videos
 */
export async function batchFetchYouTubeTranscripts(
  videoUrls: string[],
  studentCategory?: StudentCategory,
  curriculumTopic?: string
): Promise<YouTubeTranscriptResult[]> {
  const results = await Promise.allSettled(
    videoUrls.map(url => fetchYouTubeTranscript(url, studentCategory, curriculumTopic))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<YouTubeTranscriptResult | null> =>
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}


// =====================================================
// MOCK DATA (Fallback when API calls fail)
// =====================================================

function mockBraveSearchResults(category: string, topic: string): BraveSearchResult[] {
  return [
    {
      title: `Teaching ${topic} to ${category} Students: A Comprehensive Guide`,
      url: `https://edutopia.org/${category.replace(/\s+/g, '-')}-${topic.replace(/\s+/g, '-')}`,
      snippet: `Research-based strategies for teaching ${topic} to students who are ${category}. Includes classroom activities, assessments, and differentiation tips.`,
      type: 'article',
      relevanceScore: 0.95,
    },
    {
      title: `Differentiated Instruction for ${category} Learners`,
      url: `https://www.understood.org/teaching-${category.replace(/\s+/g, '-')}`,
      snippet: `Expert advice on adapting your teaching methods for ${category} students. Learn how to modify lessons, provide support, and measure progress.`,
      type: 'article',
      relevanceScore: 0.92,
    },
    {
      title: `${topic} Lesson Plans for Diverse Learners`,
      url: `https://www.teacherspayteachers.com/${topic.replace(/\s+/g, '-')}-${category.replace(/\s+/g, '-')}`,
      snippet: `Download ready-to-use lesson plans specifically designed for ${category} students learning ${topic}.`,
      type: 'pdf',
      relevanceScore: 0.88,
    },
    {
      title: `Video: Strategies for Teaching ${category} Students`,
      url: `https://www.youtube.com/watch?v=ABC123DEF456`,
      snippet: `Watch experienced educators demonstrate effective teaching techniques for ${category} learners in a ${topic} classroom setting.`,
      type: 'video',
      relevanceScore: 0.85,
    },
    {
      title: `Classroom Accommodations for ${category} Students`,
      url: `https://www.readingrockets.org/${category.replace(/\s+/g, '-')}-accommodations`,
      snippet: `Practical classroom modifications and accommodations to help ${category} students succeed in ${topic} and beyond.`,
      type: 'blog',
      relevanceScore: 0.83,
    },
  ];
}

function mockBraveSearch(query: string, count: number) {
  return {
    results: Array.from({ length: Math.min(count, 10) }, (_, i) => ({
      title: `Search Result ${i + 1} for "${query}"`,
      url: `https://example.com/result-${i + 1}`,
      description: `This is a search result about ${query}. It contains relevant information for educators.`,
      type: i % 3 === 0 ? 'video' : i % 2 === 0 ? 'article' : 'blog',
    })),
  };
}

function mockYouTubeTranscript(videoId: string): YouTubeTranscriptResult {
  return {
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    title: 'Teaching Strategies for Diverse Learners',
    transcript: `Welcome to today's video on effective teaching strategies.

When working with diverse learners, it's crucial to understand that every student processes information differently. Some students need more time to absorb concepts, while others grasp ideas quickly and need enrichment.

For students who process information slowly, try these strategies:
- Break down complex concepts into smaller, manageable chunks
- Use visual aids and diagrams to reinforce verbal explanations
- Provide written instructions alongside verbal ones
- Allow extra time for processing and responding
- Use repetition and review frequently

For fast processors, consider:
- Providing extension activities and challenges
- Encouraging peer tutoring opportunities
- Offering independent research projects
- Allowing them to explore topics in greater depth

Remember, the key to successful differentiation is flexibility and ongoing assessment. Pay attention to how your students respond and adjust your methods accordingly.

Thank you for watching, and remember: every student can learn when given the right support.`,
    durationSeconds: 420,
  };
}
