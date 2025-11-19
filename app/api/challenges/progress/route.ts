import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverLogger } from '@/lib/logger';

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
    .select('parent_email, parent_email_2')
    .eq('id', studentId)
    .single();

  if (studentError || !student) {
    return { error: NextResponse.json({ error: 'Student not found' }, { status: 404 }) };
  }

  const hasAccess = student.parent_email === user.email || student.parent_email_2 === user.email;
  if (!hasAccess) {
    return { error: NextResponse.json({ error: 'Access denied: Student is not linked to this parent' }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const clerkId = searchParams.get('clerkId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;

    if (!studentId || !clerkId) {
      return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const access = await verifyParentAccess(supabaseAdmin, clerkId, studentId);
    if ('error' in access) return access.error;

    const [historyResult, streakResult] = await Promise.all([
      supabaseAdmin
        .from('challenge_progress')
        .select('*')
        .eq('student_id', studentId)
        .order('assigned_date', { ascending: false })
        .limit(limit),
      supabaseAdmin.from('challenge_streaks').select('*').eq('student_id', studentId),
    ]);

    if (historyResult.error) {
      serverLogger.error('Error fetching challenge history', historyResult.error);
      return NextResponse.json({ error: 'Failed to load challenge history' }, { status: 500 });
    }

    if (streakResult.error) {
      serverLogger.error('Error fetching challenge streaks', streakResult.error);
      return NextResponse.json({ error: 'Failed to load challenge streaks' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        history: historyResult.data || [],
        streaks: streakResult.data || [],
      },
    });
  } catch (error) {
    serverLogger.error('Error fetching challenge progress overview', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

