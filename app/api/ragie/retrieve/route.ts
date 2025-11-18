/**
 * API Route: Ragie Retrieve
 * 
 * Server-side proxy for Ragie RAG retrieval to keep API key secure.
 * This route handles retrieval requests and forwards them to Ragie API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnvVar } from '@/lib/utils';
import { serverLogger } from '@/lib/logger';

const RAGIE_API_URL = 'https://api.ragie.ai/retrievals';

/**
 * POST handler for Ragie retrieval
 * 
 * @param request - Next.js request object
 * @returns Ragie retrieval response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, top_k, partition_id, rerank } = body;

    // Validate required fields
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const ragieApiKey = getEnvVar('RAGIE_API_KEY', '');
    
    if (!ragieApiKey) {
      serverLogger.warn('⚠️ RAGIE_API_KEY not configured');
      return NextResponse.json(
        { chunks: [] },
        { status: 200 }
      );
    }

    // Build Ragie request
    const ragieRequest: Record<string, unknown> = {
      query,
      top_k: top_k || 5,
      rerank: rerank ?? true,
      include_metadata: true,
    };

    if (partition_id) {
      ragieRequest.partition_id = partition_id;
    }

    serverLogger.log('🔍 Retrieving from Ragie');

    // Call Ragie API
    const response = await fetch(RAGIE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ragieApiKey}`,
      },
      body: JSON.stringify(ragieRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      serverLogger.error('Ragie API error:', { status: response.status });
      
      // Return empty chunks on error (non-blocking)
      return NextResponse.json(
        { chunks: [] },
        { status: 200 }
      );
    }

    const data = await response.json();

    serverLogger.log(`✅ Retrieved ${data.chunks?.length || 0} chunks from Ragie`);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    serverLogger.error('Error in Ragie retrieve route:', error);
    
    // Return empty chunks on error (non-blocking)
    return NextResponse.json(
      { chunks: [] },
      { status: 200 }
    );
  }
}

