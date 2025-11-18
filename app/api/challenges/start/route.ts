/**
 * API Route: Start Challenge
 * 
 * Server-side route to handle challenge start with proper authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { progressId, clerkId } = body;

    // Get Clerk user ID from request (passed from client)
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized: Clerk user ID required' },
        { status: 401 }
      );
    }

    if (!progressId) {
      return NextResponse.json(
        { error: 'Missing required field: progressId' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Get user email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get challenge progress and verify access
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('challenge_progress')
      .select('student_id')
      .eq('id', progressId)
      .single();

    if (progressError || !progress) {
      return NextResponse.json(
        { error: 'Challenge progress not found', details: progressError?.message },
        { status: 404 }
      );
    }

    // Get student to verify access
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, parent_email, parent_email_2')
      .eq('id', progress.student_id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found', details: studentError?.message },
        { status: 404 }
      );
    }

    // Verify parent has access
    const hasAccess = student.parent_email === user.email || student.parent_email_2 === user.email;
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied: Student is not linked to this parent' },
        { status: 403 }
      );
    }

    // Update challenge progress
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('challenge_progress')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', progressId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating challenge progress:', updateError);
      return NextResponse.json(
        { error: 'Failed to start challenge', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error in start challenge API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

