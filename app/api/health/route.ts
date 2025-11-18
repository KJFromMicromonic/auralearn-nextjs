/**
 * Health Check API Route
 * 
 * Simple health check endpoint for monitoring and testing
 */

export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'auralearn-api',
    timestamp: new Date().toISOString(),
  });
}

