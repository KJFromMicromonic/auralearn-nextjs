/**
 * LiveKit Token API Route
 * 
 * Generates LiveKit access tokens dynamically on-demand for frontend clients.
 * This endpoint is called by the frontend when a student starts a voice session.
 * 
 * Tokens are generated server-side using LiveKit API credentials and are scoped
 * to the specific room and user identity. Each token is unique and generated
 * at the time of the request.
 * 
 * SECURITY: This endpoint must be server-side only. Never expose API keys to the frontend.
 */

import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { room_name, identity } = await request.json();

    // Validate required parameters
    if (!room_name || !identity) {
      return NextResponse.json(
        { error: 'room_name and identity are required' },
        { status: 400 }
      );
    }

    // Validate UUID format for identity
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(identity)) {
      return NextResponse.json(
        { error: 'Invalid identity format. Expected UUID.' },
        { status: 400 }
      );
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      );
    }

    // Generate token dynamically for this specific room and user
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
      name: identity,
    });

    // Grant permissions for this specific room
    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    // Generate JWT token
    const token = await at.toJwt();

    console.log(`✅ Generated LiveKit token for room: ${room_name}, identity: ${identity}`);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('❌ Error generating LiveKit token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

