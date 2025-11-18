/**
 * Agent JWT Service
 * 
 * Handles generation and posting of JWT tokens to the agent worker.
 * The JWT contains dynamically generated cognitive assessment questions.
 */

/**
 * Generate agent JWT token with embedded questions
 * 
 * @param studentId Student UUID
 * @param userId User UUID (parent or student)
 * @param roomName LiveKit room name
 * @param language Language preference ('fr' or 'en')
 * @param gradeLevel Grade level ('CM1' or 'CM2')
 * @param assessmentId Optional assessment ID
 * @param parentId Optional parent ID (for Parent Portal flow)
 * @returns Response object with token, wsUrl, and metadata
 */
export async function generateAgentJWT(
  studentId: string,
  userId: string,
  roomName: string,
  language: 'en' | 'fr' = 'fr',
  gradeLevel: 'CM1' | 'CM2' = 'CM1',
  assessmentId?: string,
  parentId?: string
): Promise<{ token: string; wsUrl?: string; metadata?: any }> {
  try {
    // Validate inputs
    if (!studentId || !userId || !roomName) {
      throw new Error('studentId, userId, and roomName are required');
    }

    // Call backend API to generate JWT with embedded questions
    // The backend will use gemini-cognitive-generator.ts to generate questions
    // Use relative path - Next.js API routes handle it directly
    const apiUrl = '';
    
    const jwtEndpoint = `${apiUrl}/api/livekit/agent-jwt`;
    
    const response = await fetch(jwtEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id: studentId,
        user_id: userId,
        room_name: roomName,
        language: language,
        grade_level: gradeLevel,
        assessment_id: assessmentId,
        parent_id: parentId,  // Include parent_id if provided
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to generate agent JWT: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.token) {
      throw new Error('JWT token not returned from server');
    }

    // Return the full response object including metadata for agent dispatch
    return data;
  } catch (error) {
    console.error('Error generating agent JWT:', error);
    throw error;
  }
}

/**
 * Post JWT token to agent worker to start session
 * 
 * @param jwtToken The JWT token containing student_id, questions, etc.
 * @param agentServerUrl Agent worker HTTP server URL
 * @returns Success status
 */
export async function postJWTToAgentWorker(
  jwtToken: string,
  agentServerUrl: string = 'http://localhost:8081'
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!jwtToken) {
      throw new Error('JWT token is required');
    }

    const response = await fetch(`${agentServerUrl}/agent/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jwt: jwtToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to start agent: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return { success: data.success === true, message: data.message };
  } catch (error) {
    console.error('Error posting JWT to agent worker:', error);
    throw error;
  }
}

