/**
 * LiveKit Service
 * 
 * Handles LiveKit room connection and agent dispatch for AuraVoice
 */

import { Room, RoomEvent, Track, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { supabase } from '@/lib/supabase';

/**
 * Get LiveKit access token for a user
 * 
 * @param roomName The LiveKit room name
 * @param identity User identity (student ID)
 * @returns Access token JWT string
 */
export async function getLiveKitToken(roomName: string, identity: string): Promise<string> {
  try {
    // Validate inputs
    if (!roomName || !identity) {
      throw new Error('roomName and identity are required');
    }

    // Call backend API to get access token
    // This endpoint generates tokens dynamically server-side using LiveKit API keys
    // Tokens are generated on-demand for each voice session
    
    // Use relative path - Next.js API routes handle it directly
    const apiUrl = '';
    
    const tokenEndpoint = `${apiUrl}/api/livekit/token`;
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room_name: roomName,
        identity: identity,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to get LiveKit token: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.token) {
      throw new Error('Token not returned from server');
    }

    return data.token;
  } catch (error) {
    console.error('Error getting LiveKit token:', error);
    throw error;
  }
}

/**
 * Dispatch AuraVoice agent worker via LiveKit
 * 
 * Supports two flows:
 * 1. Legacy: Assessment token flow (for assessment links)
 * 2. Parent Portal: Direct parent_id and student_id with questions
 * 
 * @param options Dispatch options
 * @returns Success status and job ID if available
 */
export interface DispatchAgentOptions {
  room_name: string;
  assessment_token?: string;  // Legacy flow
  parent_id?: string;         // Parent Portal flow
  student_id?: string;        // Parent Portal flow
  questions?: any[];          // Questions from JWT (Parent Portal flow)
  language?: 'en' | 'fr';     // Language preference
  grade_level?: 'CM1' | 'CM2'; // Grade level
  assessment_id?: string;     // Assessment ID
}

export async function dispatchAuraVoiceAgent(
  options: DispatchAgentOptions
): Promise<{ success: boolean; job_id?: string }> {
  try {
    const { room_name } = options;
    
    if (!room_name) {
      throw new Error('room_name is required');
    }

    // Use relative path - Next.js API routes handle it directly
    const apiUrl = '';
    
    const response = await fetch(`${apiUrl}/api/livekit/dispatch-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            const errorText = await response.text();
            errorData = { error: errorText || response.statusText };
          }
          console.error('Dispatch agent error response:', errorData);
          throw new Error(`Failed to dispatch agent: ${errorData.error || errorData.details || response.statusText}`);
        }

        const data = await response.json();
        console.log('Dispatch agent success:', data);
        return { success: data.success === true, job_id: data.job_id };
  } catch (error) {
    console.error('Error dispatching agent:', error);
    throw error;
  }
}

/**
 * Connect to LiveKit room
 * 
 * @param url LiveKit server URL (must be ws:// or wss://)
 * @param token Access token
 * @param roomName Room name
 * @returns Connected Room instance
 */
export async function connectToLiveKitRoom(
  url: string,
  token: string,
  roomName: string
): Promise<Room> {
  // Validate inputs
  if (!url || !token || !roomName) {
    throw new Error('url, token, and roomName are required');
  }

  // Validate URL format
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    throw new Error(`Invalid LiveKit URL format. Expected ws:// or wss://, got: ${url}`);
  }

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  try {
    console.log('🔌 Attempting to connect to LiveKit room:', {
      url,
      roomName,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
    });
    
    await room.connect(url, token);
    console.log('✅ Connected to LiveKit room:', roomName);
    return room;
  } catch (error) {
    console.error('❌ Error connecting to LiveKit room:', error);
    console.error('Connection details:', {
      url,
      roomName,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'Unknown',
    });
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('pc connection')) {
        throw new Error(
          `WebRTC connection failed. Please check:\n` +
          `1. LiveKit server is running and accessible at ${url}\n` +
          `2. Firewall allows WebRTC ports (UDP 50000-60000, TCP 7881)\n` +
          `3. Network connectivity to the LiveKit server\n` +
          `Original error: ${error.message}`
        );
      }
      if (error.message.includes('timeout')) {
        throw new Error(
          `Connection timeout. The LiveKit server at ${url} may be unreachable or not responding.`
        );
      }
    }
    
    throw error;
  }
}

/**
 * Setup LiveKit room event handlers
 * 
 * @param room Room instance
 * @param onTrackSubscribed Callback when track is subscribed
 * @param onDisconnected Callback when disconnected
 */
export function setupRoomHandlers(
  room: Room,
  onTrackSubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void,
  onDisconnected?: () => void
) {
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    console.log('Track subscribed:', track.kind, participant.identity);
    if (onTrackSubscribed) {
      onTrackSubscribed(track, publication, participant);
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    console.log('Track unsubscribed:', track.kind, participant.identity);
    track.detach();
  });

  room.on(RoomEvent.Disconnected, () => {
    console.log('Disconnected from room');
    if (onDisconnected) {
      onDisconnected();
    }
  });

  room.on(RoomEvent.ParticipantConnected, (participant) => {
    console.log('Participant connected:', participant.identity);
  });

  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    console.log('Participant disconnected:', participant.identity);
  });
}

