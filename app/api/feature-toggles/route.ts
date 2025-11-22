import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { data: toggles, error } = await supabase
      .from('feature_toggles')
      .select('*')
      .order('feature_name');

    if (error) {
      console.error('Error fetching feature toggles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feature toggles' },
        { status: 500 }
      );
    }

    return NextResponse.json({ toggles });
  } catch (error) {
    console.error('Error in GET /api/feature-toggles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { feature_name, is_enabled } = body;

    if (!feature_name || typeof is_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update the feature toggle
    const { data, error } = await supabase
      .from('feature_toggles')
      .update({
        is_enabled,
        updated_by: userId
      })
      .eq('feature_name', feature_name)
      .select()
      .single();

    if (error) {
      console.error('Error updating feature toggle:', error);
      return NextResponse.json(
        { error: 'Failed to update feature toggle' },
        { status: 500 }
      );
    }

    return NextResponse.json({ toggle: data });
  } catch (error) {
    console.error('Error in POST /api/feature-toggles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
