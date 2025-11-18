/**
 * Ragie RAG Service
 * 
 * Integrates with Ragie API to retrieve relevant teaching guide content
 * for augmenting AI-generated teaching guides with RAG-retrieved knowledge.
 * 
 * Reference: https://docs.ragie.ai/reference/retrieve
 * 
 * Note: API key is stored server-side and accessed via /api/ragie/retrieve route
 */

import { logger } from '@/lib/logger';

/**
 * Ragie retrieval request payload
 */
export interface RagieRetrieveRequest {
  query: string;
  top_k?: number;
  partition_id?: string;
  filters?: Record<string, unknown>;
  rerank?: boolean;
  include_metadata?: boolean;
}

/**
 * Ragie retrieval response chunk
 */
export interface RagieChunk {
  id: string;
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
  document_id?: string;
  chunk_index?: number;
}

/**
 * Ragie retrieval response
 */
export interface RagieRetrieveResponse {
  chunks: RagieChunk[];
  query: string;
  total_chunks?: number;
}

/**
 * Retrieve relevant teaching guide content from Ragie
 * 
 * Uses the Next.js API route to securely call Ragie API (keeps API key server-side).
 * 
 * @param query - Search query for retrieving relevant teaching guides
 * @param options - Optional retrieval parameters
 * @returns Array of relevant chunks from teaching guides
 * 
 * @example
 * ```typescript
 * const chunks = await retrieveTeachingGuides(
 *   'teaching strategies for visual learners in mathematics',
 *   { top_k: 5 }
 * );
 * ```
 */
export async function retrieveTeachingGuides(
  query: string,
  options: {
    top_k?: number;
    partition_id?: string;
    rerank?: boolean;
  } = {}
): Promise<RagieChunk[]> {
  try {
    logger.log('🔍 Retrieving teaching guides from Ragie');

    // Call Next.js API route (which securely calls Ragie)
    const response = await fetch('/api/ragie/retrieve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        top_k: options.top_k || 5,
        partition_id: options.partition_id,
        rerank: options.rerank ?? true,
      }),
    });

    if (!response.ok) {
      logger.warn('⚠️ Failed to retrieve from Ragie API route');
      return [];
    }

    const data = (await response.json()) as RagieRetrieveResponse;

    if (!data.chunks || data.chunks.length === 0) {
      logger.log('ℹ️ No relevant teaching guides found in Ragie');
      return [];
    }

    logger.log(`✅ Retrieved ${data.chunks.length} relevant chunks from Ragie`);

    return data.chunks;
  } catch (error) {
    logger.error('Error retrieving teaching guides from Ragie:', error);
    // Don't throw - allow generation to continue without RAG content
    return [];
  }
}

/**
 * Build a comprehensive query for retrieving teaching guides
 * 
 * Combines student category, curriculum topic, and audience to create
 * an effective search query for Ragie.
 * 
 * @param studentCategory - Student learning profile category
 * @param curriculumTopic - Subject/topic being taught
 * @param audience - Target audience (teacher or parent)
 * @param gradeLevel - Grade level (optional)
 * @returns Optimized search query string
 */
export function buildTeachingGuideQuery(
  studentCategory: string,
  curriculumTopic: string,
  audience: 'teacher' | 'parent',
  gradeLevel?: string
): string {
  const categoryTerms = studentCategory
    .split('_')
    .map(term => term.charAt(0).toUpperCase() + term.slice(1))
    .join(' ');

  const audienceContext = audience === 'teacher'
    ? 'teaching strategies classroom instruction lesson plans'
    : 'parent support home learning homework help';

  const gradeContext = gradeLevel ? `grade ${gradeLevel} ` : '';

  return `${categoryTerms} ${curriculumTopic} ${audienceContext} ${gradeContext}strategies activities resources`.trim();
}

/**
 * Format RAG chunks for inclusion in AI prompt
 * 
 * Formats retrieved chunks into a readable string that can be
 * included in the AI generation prompt.
 * 
 * @param chunks - Array of RAG chunks from Ragie
 * @returns Formatted string of teaching guide content
 */
export function formatRAGChunksForPrompt(chunks: RagieChunk[]): string {
  if (chunks.length === 0) {
    return '';
  }

  return chunks
    .map((chunk, index) => {
      const score = chunk.score ? ` (relevance: ${chunk.score.toFixed(2)})` : '';
      const source = chunk.metadata?.source || chunk.document_id || 'teaching guide';
      
      return `\n${index + 1}. [${source}]${score}\n${chunk.content}`;
    })
    .join('\n\n');
}

