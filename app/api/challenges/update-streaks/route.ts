/**
 * API Route: Update Challenge Streaks
 * 
 * Server-side route to handle streak updates with proper authentication.
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
    const { studentId, challengeId, clerkId } = body;

    if (!studentId || !challengeId || !clerkId) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, challengeId, clerkId' },
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

    // Get challenge details to determine streak type
    // For now, update all relevant streaks
    const today = new Date().toISOString().split('T')[0];
    
    // Update or insert streaks
    const streakTypes = [
      'adaptability',
      'strategy_switching',
      'focus',
      'challenges_accepted'
    ];

    const updates = streakTypes.map(async (streakType) => {
      // Get current streak
      const { data: currentStreak, error: fetchError } = await supabaseAdmin
        .from('challenge_streaks')
        .select('*')
        .eq('student_id', studentId)
        .eq('streak_type', streakType)
        .single();

      let newCurrentStreak = 1;
      let newLongestStreak = 1;
      const lastActivityDate = today;

      if (currentStreak && !fetchError) {
        // Check if streak should continue or reset
        const lastDate = currentStreak.last_activity_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === today) {
          // Already updated today, don't increment
          return;
        } else if (lastDate === yesterdayStr) {
          // Continue streak
          newCurrentStreak = (currentStreak.current_streak || 0) + 1;
          newLongestStreak = Math.max(newCurrentStreak, currentStreak.longest_streak || 0);
        } else {
          // Streak broken, start over
          newCurrentStreak = 1;
          newLongestStreak = currentStreak.longest_streak || 1;
        }
      }

      // Upsert streak
      const { error: upsertError } = await supabaseAdmin
        .from('challenge_streaks')
        .upsert({
          student_id: studentId,
          streak_type: streakType,
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_activity_date: lastActivityDate,
        }, {
          onConflict: 'student_id,streak_type'
        });

      if (upsertError) {
        console.error(`Error updating ${streakType} streak:`, upsertError);
      }
    });

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update streaks API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

