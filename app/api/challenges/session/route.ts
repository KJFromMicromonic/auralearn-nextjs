import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverLogger } from '@/lib/logger';
import { LearningProfileSummary } from '@/services/parent-dashboard-service';

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service role key or URL not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface ChallengeTemplatePayload {
  id?: string;
  title: string;
  description: string;
  instructions: string[];
  whyItHelps: string;
  estimatedTime?: string;
  subject?: string;
  level?: string;
}

interface CreateSessionBody {
  progressId: string;
  studentId: string;
  studentName: string;
  challenge: ChallengeTemplatePayload;
  learningProfile?: LearningProfileSummary | null;
  clerkId: string;
  language?: string;
}

interface SessionContent {
  prompt: string;
  problemStatement: string;
  materials: string[];
  childSteps: string[];
  parentTips: string[];
  reflectionQuestions: string[];
  successCriteria: string[];
  estimatedTime?: string;
}

function buildSystemPrompt(language: string): string {
  const targetLang = language === 'fr' ? 'French' : 'English';
  return `You are an expert parent coach who creates individualized adaptability challenges for children aged 7-13.
You MUST respond in ${targetLang} with valid JSON containing:
- prompt: one-sentence description of the personalized challenge goal
- problemStatement: the exact task/question with concrete details (numbers, text prompt, scenario) tied to the subject
- materials: array of material/tool bullet points ([] if nothing)
- childSteps: 3-5 short steps the child should follow in order
- parentTips: 3-4 coaching tips for the parent
- reflectionQuestions: 2-3 discussion questions afterwards
- successCriteria: 2-3 bullets describing what success looks like
- estimatedTime: string such as "10 minutes"
Keep tone encouraging and age-appropriate (7-13).`;
}

function buildUserPrompt(data: CreateSessionBody, language: string): string {
  const { studentName, challenge, learningProfile } = data;
  const languageLabel = language === 'fr' ? 'French' : 'English';
  return `Student name: ${studentName}
Challenge title: ${challenge.title}
Challenge description: ${challenge.description}
Base instructions: ${challenge.instructions.join(' | ')}
Why it helps: ${challenge.whyItHelps}
Estimated time: ${challenge.estimatedTime || '10 minutes'}
Subject: ${challenge.subject || 'general learning'}
Challenge level: ${challenge.level || 'mixed'}
Language preference: ${languageLabel}

Learning profile:
- Strengths: ${learningProfile?.primaryStrengths?.join(', ') || 'Not specified'}
- Areas for support: ${learningProfile?.areasForSupport?.join(', ') || 'Not specified'}
- Summary: ${learningProfile?.profileSummary || 'Not provided'}
- Overall score: ${learningProfile?.overallScore ?? 'N/A'}

Return a JSON object in ${languageLabel} that personalizes this challenge for ${studentName}. Create a specific ${
    challenge.subject || 'learning'
  } problem or prompt they must complete (parents should not invent it).`;
}

async function verifyParentAccess(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  clerkId: string,
  studentId: string
) {
  const { data: user, error: userError } = await supabaseAdmin.from('users').select('email').eq('clerk_id', clerkId).single();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }

  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, parent_email, parent_email_2')
    .eq('id', studentId)
    .single();

  if (studentError || !student) {
    return { error: NextResponse.json({ error: 'Student not found' }, { status: 404 }) };
  }

  const hasAccess = student.parent_email === user.email || student.parent_email_2 === user.email;
  if (!hasAccess) {
    return { error: NextResponse.json({ error: 'Access denied: Student is not linked to this parent' }, { status: 403 }) };
  }

  return { user, student };
}

async function generateSessionContent(prompt: string, systemPrompt: string, request: NextRequest): Promise<SessionContent> {
  const apiUrl = new URL('/api/mistralai/chat', request.url);
  const response = await fetch(apiUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\n\nYou MUST respond with valid JSON matching the schema provided.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI endpoint error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  const jsonMatch =
    content.match(/```json\n([\s\S]*?)\n```/) ||
    content.match(/```\n([\s\S]*?)\n```/) ||
    content.match(/\{[\s\S]*\}/) ||
    content.match(/\[[\s\S]*\]/);

  const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
  return JSON.parse(jsonStr) as SessionContent;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionBody;
    const { progressId, studentId, clerkId, challenge, studentName, language: requestedLanguage } = body;
    const targetLanguage = requestedLanguage && requestedLanguage.toLowerCase().startsWith('fr') ? 'fr' : 'en';

    if (!progressId || !studentId || !clerkId || !challenge || !studentName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const access = await verifyParentAccess(supabaseAdmin, clerkId, studentId);
    if ('error' in access) return access.error;

    // Check if session already exists
    const { data: existingSession } = await supabaseAdmin
      .from('challenge_sessions')
      .select('*')
      .eq('progress_id', progressId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSession && existingSession.status === 'active') {
      return NextResponse.json({ data: existingSession });
    }

    // Generate personalized content
    const prompt = buildUserPrompt(body, targetLanguage);
    const sessionContent = await generateSessionContent(prompt, buildSystemPrompt(targetLanguage), request);
    const normalizedProblem =
      sessionContent.problemStatement?.trim() ||
      `${challenge.title}: ${challenge.description}. Use the base instructions to guide the steps.`;

    const sessionPayload = {
      progress_id: progressId,
      student_id: studentId,
      challenge_id: challenge.id || challenge.title,
      status: 'active',
      prompt: sessionContent.prompt,
      problem_statement: normalizedProblem,
      materials: sessionContent.materials || [],
      child_steps: sessionContent.childSteps || [],
      parent_tips: sessionContent.parentTips || [],
      reflection_questions: sessionContent.reflectionQuestions || [],
      success_criteria: sessionContent.successCriteria || [],
      estimated_time: sessionContent.estimatedTime || challenge.estimatedTime || null,
      metadata: {
        ...(body.learningProfile ? { learningProfile: body.learningProfile } : {}),
        language: targetLanguage,
      },
    };

    let insertResult = await supabaseAdmin
      .from('challenge_sessions')
      .insert(sessionPayload)
      .select('*')
      .single();

    if (insertResult.error && insertResult.error.message?.includes('problem_statement')) {
      serverLogger.warn('challenge_sessions.problem_statement missing, retrying without column');
      const fallbackPayload = {
        ...sessionPayload,
        metadata: {
          ...(sessionPayload.metadata || {}),
          legacyProblemStatement: normalizedProblem,
          language: targetLanguage,
        },
      };
      delete (fallbackPayload as Partial<typeof sessionPayload>).problem_statement;

      insertResult = await supabaseAdmin.from('challenge_sessions').insert(fallbackPayload).select('*').single();
    }

    if (insertResult.error) {
      serverLogger.error('Error inserting challenge session', insertResult.error);
      return NextResponse.json({ error: 'Failed to create challenge session' }, { status: 500 });
    }

    const session = insertResult.data;

    const metadata = session.metadata as Record<string, unknown> | null | undefined;
    const fallbackProblem =
      metadata && typeof metadata['legacyProblemStatement'] === 'string'
        ? (metadata['legacyProblemStatement'] as string)
        : null;

    const hydratedSession = session.problem_statement
      ? session
      : {
          ...session,
          problem_statement: fallbackProblem,
        };

    return NextResponse.json({ data: hydratedSession });
  } catch (error) {
    serverLogger.error('Error creating challenge session', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get('progressId');
    const clerkId = searchParams.get('clerkId');

    if (!progressId || !clerkId) {
      return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Need student id for access check
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('challenge_progress')
      .select('student_id')
      .eq('id', progressId)
      .single();

    if (progressError || !progress) {
      return NextResponse.json({ error: 'Challenge progress not found' }, { status: 404 });
    }

    const access = await verifyParentAccess(supabaseAdmin, clerkId, progress.student_id);
    if ('error' in access) return access.error;

    const { data: session, error } = await supabaseAdmin
      .from('challenge_sessions')
      .select('*')
      .eq('progress_id', progressId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      serverLogger.error('Error fetching challenge session', error);
      return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ data: session });
  } catch (error) {
    serverLogger.error('Error fetching challenge session', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, clerkId, reflection, parentNotes } = body;

    if (!sessionId || !clerkId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('challenge_sessions')
      .select('student_id, metadata')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const access = await verifyParentAccess(supabaseAdmin, clerkId, session.student_id);
    if ('error' in access) return access.error;

    const metadata = {
      ...(session.metadata || {}),
      reflection,
      parentNotes,
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('challenge_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata,
      })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (updateError) {
      serverLogger.error('Error updating challenge session', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    serverLogger.error('Error updating challenge session', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


