/**
 * LiveKit Agent Dispatch API Route
 * 
 * Dispatches the AuraVoice agent worker to join a LiveKit room.
 * This endpoint should trigger the agent worker to start with the assessment token.
 * 
 * The assessment_token is passed from the frontend (extracted from the assessment URL)
 * and forwarded to the agent worker via job metadata.
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const {
      assessment_token,
      room_name,
      parent_id,
      student_id,
      questions,
      language,
      grade_level,
      assessment_id,
    } = await request.json();

    if (!assessment_token && !room_name) {
      return NextResponse.json(
        { error: 'assessment_token and room_name are required' },
        { status: 400 }
      );
    }

    // Validate assessment_token format (should be UUID) if provided
    if (assessment_token) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assessment_token)) {
        return NextResponse.json(
          { error: 'Invalid assessment_token format. Expected UUID.' },
          { status: 400 }
        );
      }
    }

    // Get LiveKit credentials
    const originalLivekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    console.log('🔑 LiveKit config check:', {
      url: originalLivekitUrl,
      hasKey: !!apiKey,
      hasSecret: !!apiSecret,
    });

    if (!originalLivekitUrl || !apiKey || !apiSecret) {
      console.error('❌ LiveKit credentials missing');
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      );
    }

    // Check if we're in development mode BEFORE any URL conversion
    const isDevMode =
      originalLivekitUrl.includes('localhost') ||
      originalLivekitUrl.includes('127.0.0.1');

    console.log(`🔍 Original URL: ${originalLivekitUrl}, Dev Mode: ${isDevMode}`);

    // In dev mode, return success immediately (agent worker started manually)
    if (isDevMode) {
      // In dev mode, agent workers are typically started manually with:
      // livekit-cli dev agent.py
      // So we'll just acknowledge the dispatch request
      // The agent worker will connect when it's started
      console.log(
        `📢 Agent dispatch requested for room: ${room_name}, token: ${assessment_token}`
      );
      console.log(
        `💡 In dev mode: Make sure agent worker is running with: livekit-cli dev agent.py`
      );
      console.log(`   The agent will connect to room: ${room_name}`);

      // Return success - the agent worker should be started separately
      return NextResponse.json({
        success: true,
        message: 'Agent dispatch acknowledged. Ensure agent worker is running.',
        room_name: room_name,
        assessment_token: assessment_token,
        dev_mode: true,
      });
    }

    // Production mode: Convert WebSocket URL to HTTP URL for API calls
    // ws://server.com -> http://server.com
    // wss://server.com -> https://server.com
    let livekitUrl = originalLivekitUrl;
    if (livekitUrl.startsWith('ws://')) {
      livekitUrl = livekitUrl.replace('ws://', 'http://');
    } else if (livekitUrl.startsWith('wss://')) {
      livekitUrl = livekitUrl.replace('wss://', 'https://');
    }

    // Production mode: Dispatch via LiveKit Cloud API
    try {
      console.log(`🚀 Dispatching agent to production LiveKit: ${livekitUrl}`);

      // Build metadata object for dispatch
      const metadata: Record<string, any> = {};

      if (parent_id && student_id) {
        // NEW FLOW: Parent Portal with direct IDs
        metadata.parent_id = parent_id;
        metadata.student_id = student_id;

        // Include questions if provided (from JWT)
        if (questions) {
          metadata.questions = questions;
        }
        if (language) {
          metadata.language = language;
        }
        if (grade_level) {
          metadata.grade_level = grade_level;
        }
        if (assessment_id) {
          metadata.assessment_id = assessment_id;
        }
      } else if (assessment_token) {
        // LEGACY FLOW: Assessment token
        metadata.assessment_token = assessment_token;
      }

      const dispatchResponse = await fetch(
        `${livekitUrl}/twirp/livekit.AgentService/DispatchAgent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}:${apiSecret}`,
          },
          body: JSON.stringify({
            room: room_name,
            agent_type: 'aura-voice',
            metadata: JSON.stringify(metadata),
          }),
        }
      );

      if (!dispatchResponse.ok) {
        const errorText = await dispatchResponse.text();
        console.error('❌ LiveKit dispatch error:', errorText);
        return NextResponse.json(
          { error: 'Failed to dispatch agent', details: errorText },
          { status: dispatchResponse.status }
        );
      }

      const dispatchData = await dispatchResponse.json();

      console.log(
        `✅ Dispatched agent for room: ${room_name}, token: ${assessment_token}`
      );

      return NextResponse.json({ success: true, job_id: dispatchData.job_id });
    } catch (fetchError) {
      console.error('❌ Error calling LiveKit dispatch API:', fetchError);
      // In dev mode, if the API call fails, still return success
      // The agent worker can be started manually
      if (isDevMode) {
        console.log('💡 Dev mode: Agent worker should be started manually');
        return NextResponse.json({
          success: true,
          message:
            'Dev mode: Start agent worker manually with: livekit-cli dev agent.py',
          room_name: room_name,
        });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Error dispatching agent:', error);
    console.error(
      '❌ Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      livekitUrl: process.env.LIVEKIT_URL,
      isDevMode:
        process.env.LIVEKIT_URL?.includes('localhost') ||
        process.env.LIVEKIT_URL?.includes('127.0.0.1'),
    });
    return NextResponse.json(
      {
        error: 'Failed to dispatch agent',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: 500 }
    );
  }
}

