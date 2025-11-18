/**
 * API Route: Assign Weekly Challenge
 * 
 * Server-side route to handle challenge assignment with proper authentication.
 * This bypasses RLS issues by using service role key or properly passing JWT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get Supabase admin client (service role - bypasses RLS)
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
    const { studentId, challengeId, level, assignedDate, dueDate, clerkId } = body;

    // Validate required fields
    if (!studentId || !challengeId || !level) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, challengeId, level' },
        { status: 400 }
      );
    }

    // Get Clerk user ID from request (passed from client)
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized: Clerk user ID required' },
        { status: 401 }
      );
    }

    // Verify parent has access to this student
    const supabaseAdmin = getSupabaseAdmin();
    
    // Get user email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, id')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify student is linked to this parent
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, parent_email, parent_email_2')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Check if parent has access
    if (student.parent_email !== user.email && student.parent_email_2 !== user.email) {
      return NextResponse.json(
        { error: 'Access denied: Student is not linked to this parent' },
        { status: 403 }
      );
    }

    // Insert challenge progress
    const { data: progress, error: insertError } = await supabaseAdmin
      .from('challenge_progress')
      .insert({
        student_id: studentId,
        challenge_id: challengeId,
        status: 'pending',
        assigned_date: assignedDate || new Date().toISOString().split('T')[0],
        due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        level: level,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting challenge progress:', insertError);
      return NextResponse.json(
        { error: 'Failed to assign challenge', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: progress });
  } catch (error) {
    console.error('Error in assign challenge API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

