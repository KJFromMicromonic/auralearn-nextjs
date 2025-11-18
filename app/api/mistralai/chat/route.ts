/**
 * MistralAI API Proxy Route
 *
 * Proxies MistralAI API calls to keep the API key secure on the server.
 * This prevents exposing the API key to the client-side code.
 */

import { NextRequest, NextResponse } from 'next/server';

const MISTRALAI_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

/**
 * POST /api/mistralai/chat
 *
 * Proxies a chat completion request to MistralAI API
 *
 * @param request - Next.js request object with chat completion parameters
 * @returns MistralAI API response
 */
export async function POST(request: NextRequest) {
  try {
    // Get API key from server-side environment variable
    const apiKey = process.env.MISTRALAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MistralAI API key not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: ChatCompletionRequest = await request.json();
    const {
      messages,
      model = 'mistral-large-latest',
      temperature = 0.7,
      max_tokens = 2500,
      response_format,
    } = body;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Forward request to MistralAI API
    const response = await fetch(MISTRALAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        ...(response_format && { response_format }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MistralAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: `MistralAI API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying MistralAI request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to proxy MistralAI request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

