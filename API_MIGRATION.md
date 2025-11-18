# API Migration: Express → Next.js API Routes

## ✅ Migration Complete

All Express.js API endpoints have been successfully migrated to Next.js API routes. No more separate Express server needed!

## What Changed

### Before (Express Server)
- Separate Express server running on port 3001
- Required `npm run dev:api` or `npm run dev:all`
- CORS configuration needed
- Separate process to manage

### After (Next.js API Routes)
- All API routes integrated into Next.js App Router
- Single process: just `npm run dev`
- Built-in CORS handling
- Modern, type-safe API routes

## API Routes

All routes are now in `app/api/` directory:

### Health Check
- **Route**: `GET /api/health`
- **File**: `app/api/health/route.ts`
- **Purpose**: Health check endpoint for monitoring

### LiveKit Token Generation
- **Route**: `POST /api/livekit/token`
- **File**: `app/api/livekit/token/route.ts`
- **Purpose**: Generate LiveKit access tokens for voice sessions
- **Request Body**:
  ```json
  {
    "room_name": "string",
    "identity": "uuid"
  }
  ```

### Agent JWT Generation
- **Route**: `POST /api/livekit/agent-jwt`
- **File**: `app/api/livekit/agent-jwt/route.ts`
- **Purpose**: Generate JWT token with embedded cognitive assessment questions
- **Request Body**:
  ```json
  {
    "student_id": "uuid",
    "user_id": "uuid",
    "room_name": "string",
    "language": "en" | "fr",
    "grade_level": "CM1" | "CM2",
    "assessment_id": "uuid (optional)",
    "parent_id": "uuid (optional)"
  }
  ```

### Agent Dispatch
- **Route**: `POST /api/livekit/dispatch-agent`
- **File**: `app/api/livekit/dispatch-agent/route.ts`
- **Purpose**: Dispatch agent worker to join a LiveKit room
- **Request Body**:
  ```json
  {
    "assessment_token": "uuid (optional)",
    "room_name": "string",
    "parent_id": "uuid (optional)",
    "student_id": "uuid (optional)",
    "questions": "array (optional)",
    "language": "string (optional)",
    "grade_level": "string (optional)",
    "assessment_id": "uuid (optional)"
  }
  ```

## Updated Files

1. **Service Files** - Updated to use relative API paths:
   - `services/agent-jwt-service.ts`
   - `services/livekit-service.ts`

2. **Configuration**:
   - `next.config.ts` - Removed API rewrites (no longer needed)
   - `package.json` - Removed Express server scripts

## Environment Variables

All environment variables remain the same. Make sure these are set in `.env.local`:

```env
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
LIVEKIT_URL=your_livekit_url
LIVEKIT_AGENT_NAME=AuraVoiceAgent
```

## Running the Application

### Development
```bash
npm run dev
```

That's it! No need to run a separate API server.

### Production
```bash
npm run build
npm run start
```

All API routes are automatically included in the Next.js build.

## Benefits

1. **Simpler Development**: One command instead of two
2. **Better Performance**: No network hop between frontend and API
3. **Type Safety**: Full TypeScript support in API routes
4. **Modern Stack**: Using Next.js App Router best practices
5. **Easier Deployment**: Single application to deploy
6. **Better DX**: Hot reload works for API routes too

## Testing

Test the endpoints:

```bash
# Health check
curl http://localhost:8080/api/health

# Generate token
curl -X POST http://localhost:8080/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"room_name":"test-room","identity":"test-uuid"}'
```

## Migration Notes

- All API routes use Next.js `NextResponse` for type-safe responses
- Error handling follows Next.js patterns
- CORS is handled automatically by Next.js
- All routes are server-side only (no client code)
- Environment variables work the same way

