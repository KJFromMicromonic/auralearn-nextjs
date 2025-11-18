/**
 * LiveKit Agent JWT Token Generation API Route
 * 
 * Generates a LiveKit access token with RoomConfiguration for automatic agent dispatch.
 * Uses RoomAgentDispatch to automatically dispatch the agent when participant joins.
 * 
 * This endpoint generates cognitive assessment questions dynamically and embeds them
 * in the token metadata for the agent to use.
 */

import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { generateCognitiveAssessment } from '@/services/gemini-cognitive-generator';
import { serverLogger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    serverLogger.log('🔧 Agent JWT token generation request received');

    const {
      student_id,
      user_id,
      room_name,
      language,
      grade_level,
      assessment_id,
      parent_id,
    } = await request.json();

    // Validate required parameters
    if (!student_id || !user_id || !room_name) {
      serverLogger.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'student_id, user_id, and room_name are required' },
        { status: 400 }
      );
    }

    // Validate UUID format for student_id and user_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(student_id) || !uuidRegex.test(user_id)) {
      return NextResponse.json(
        { error: 'Invalid student_id or user_id format. Expected UUID.' },
        { status: 400 }
      );
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    serverLogger.log('🔑 Environment check');

    if (!apiKey || !apiSecret) {
      serverLogger.error('❌ LiveKit credentials missing');
      return NextResponse.json(
        {
          error: 'LiveKit credentials not configured',
          details: { hasApiKey: !!apiKey, hasApiSecret: !!apiSecret },
        },
        { status: 500 }
      );
    }

    // Generate cognitive assessment questions dynamically
    serverLogger.log('📝 Generating cognitive assessment questions...');
    const assessment = await generateCognitiveAssessment(
      language || 'fr',
      grade_level || 'CM1'
    );
    serverLogger.log(`✅ Generated ${assessment.questions.length} questions`);

    // Create access token
    serverLogger.log('🎫 Creating access token...');
    const token = new AccessToken(apiKey, apiSecret, {
      identity: user_id,
      name: user_id,
    });

    // Grant permissions for this specific room
    token.addGrant({
      room: room_name,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    // Prepare metadata for agent dispatch
    const metadata = {
      student_id,
      user_id,
      parent_id: parent_id || undefined,
      questions: assessment.questions,
      language: assessment.metadata.language,
      grade_level: grade_level || 'CM1',
      assessment_id: assessment_id || undefined,
    };

    // Note: RoomConfiguration is not supported on AccessToken in this SDK version
    // Agent will be dispatched manually via /api/livekit/dispatch-agent endpoint
    // after the participant successfully connects to the room

    const jwt = await token.toJwt();
    serverLogger.log('✅ Token generated successfully');

    return NextResponse.json({
      token: jwt,
      room_name,
      wsUrl,
      participantName: user_id,
      metadata,
      roomMetadata: metadata, // Pass metadata separately for room creation
    });
  } catch (error) {
    serverLogger.error('❌ Error generating agent JWT:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate agent JWT',
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

