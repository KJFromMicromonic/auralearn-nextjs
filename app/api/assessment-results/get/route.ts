/**
 * API Route: Get Assessment Result
 * 
 * Server-side route to fetch assessment results with proper authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverLogger } from '@/lib/logger';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const clerkId = searchParams.get('clerkId');

    if (!studentId || !clerkId) {
      return NextResponse.json(
        { error: 'Missing required parameters: studentId, clerkId' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Get user email to verify access
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

    // Verify parent has access
    const hasAccess = student.parent_email === user.email || student.parent_email_2 === user.email;
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied: Student is not linked to this parent' },
        { status: 403 }
      );
    }

    // Fetch assessment result
    const { data, error } = await supabaseAdmin
      .from('learning_profile_results')
      .select('*')
      .eq('student_id', studentId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // No results found
        return NextResponse.json({ data: null });
      }
      serverLogger.error('Error fetching assessment result:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assessment result', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    serverLogger.error('Error in get assessment result API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

