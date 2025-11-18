/**
 * Parent Activity Service
 * 
 * Manages activities from teaching guides and tracks parent activity completion
 */

import { supabase } from '@/lib/supabase';
import { Activity, Strategy } from '@/lib/supabase';
import { getStudentsForParent } from './student-service';

export interface ActivityWithSource extends Activity {
  type?: 'strength' | 'support' | 'flexibility' | 'general';
  source: 'teaching_guide' | 'challenge' | 'manual';
  sourceId?: string;
  teachingGuideId?: string;
  category?: string;
  curriculumTopic?: string;
}

export interface ActivityLog {
  id: string;
  parent_id: string;
  student_id: string;
  activity_name: string;
  activity_type: string;
  source: string;
  source_id?: string;
  completed_at: string;
  duration_minutes?: number;
  parent_notes?: string;
  effectiveness_rating?: number;
}

/**
 * Get activities from teaching guides for a student
 * Combines strength activities, support strategies, and flexibility challenges
 */
export async function getActivitiesFromTeachingGuides(
  studentId: string,
  parentEmail: string
): Promise<ActivityWithSource[]> {
  try {
    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*, classes(id)')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      throw new Error('Student not found');
    }

    const classId = student.class_id;

    // Get all teaching guides for this student's category and class
    // Filter for parent audience
    const { data: guides, error: guidesError } = await supabase
      .from('teaching_guides')
      .select('*')
      .eq('class_id', classId)
      .eq('student_category', student.primary_category || 'visual_learner')
      .eq('audience', 'parent')
      .order('generated_at', { ascending: false })
      .limit(10); // Get recent guides

    if (guidesError) {
      console.error('Error fetching teaching guides:', guidesError);
      return [];
    }

    const activities: ActivityWithSource[] = [];

    guides.forEach((guide: any) => {
      // Add strength activities
      if (guide.strength_activities && Array.isArray(guide.strength_activities)) {
        guide.strength_activities.forEach((activity: Activity) => {
          activities.push({
            ...activity,
            type: 'strength',
            source: 'teaching_guide',
            sourceId: guide.id,
            teachingGuideId: guide.id,
            category: guide.student_category,
            curriculumTopic: guide.curriculum_topic,
          });
        });
      }

      // Add flexibility challenges
      if (guide.flexibility_challenges && Array.isArray(guide.flexibility_challenges)) {
        guide.flexibility_challenges.forEach((activity: Activity) => {
          activities.push({
            ...activity,
            type: 'flexibility',
            source: 'teaching_guide',
            sourceId: guide.id,
            teachingGuideId: guide.id,
            category: guide.student_category,
            curriculumTopic: guide.curriculum_topic,
          });
        });
      }

      // Add general activities (convert to support type)
      if (guide.activities && Array.isArray(guide.activities)) {
        guide.activities.forEach((activity: Activity) => {
          activities.push({
            ...activity,
            type: 'support',
            source: 'teaching_guide',
            sourceId: guide.id,
            teachingGuideId: guide.id,
            category: guide.student_category,
            curriculumTopic: guide.curriculum_topic,
          });
        });
      }
    });

    return activities;
  } catch (error) {
    console.error('Error getting activities from teaching guides:', error);
    return [];
  }
}

/**
 * Log an activity completion
 */
export async function logActivityCompletion(
  parentId: string,
  studentId: string,
  activity: ActivityWithSource,
  durationMinutes?: number,
  notes?: string,
  effectivenessRating?: number
): Promise<ActivityLog> {
  try {
    const { data, error } = await supabase
      .from('parent_activity_log')
      .insert({
        parent_id: parentId,
        student_id: studentId,
        activity_name: activity.name,
        activity_type: activity.type || 'general',
        source: activity.source,
        source_id: activity.sourceId,
        duration_minutes: durationMinutes,
        parent_notes: notes,
        effectiveness_rating: effectivenessRating,
      })
      .select()
      .single();

    if (error) throw error;

    return data as ActivityLog;
  } catch (error) {
    console.error('Error logging activity completion:', error);
    throw error;
  }
}

/**
 * Get activity completion history for a student
 */
export async function getActivityHistory(
  studentId: string,
  limit: number = 20
): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('parent_activity_log')
      .select('*')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data as ActivityLog[];
  } catch (error) {
    console.error('Error fetching activity history:', error);
    return [];
  }
}

/**
 * Get activity statistics for a student
 */
export async function getActivityStats(studentId: string): Promise<{
  totalCompleted: number;
  byType: Record<string, number>;
  averageRating: number;
  recentActivity: ActivityLog[];
}> {
  try {
    const history = await getActivityHistory(studentId, 100);

    const stats = {
      totalCompleted: history.length,
      byType: {} as Record<string, number>,
      averageRating: 0,
      recentActivity: history.slice(0, 10),
    };

    let totalRating = 0;
    let ratingCount = 0;

    history.forEach(activity => {
      // Count by type
      stats.byType[activity.activity_type || 'general'] = 
        (stats.byType[activity.activity_type || 'general'] || 0) + 1;

      // Calculate average rating
      if (activity.effectiveness_rating) {
        totalRating += activity.effectiveness_rating;
        ratingCount++;
      }
    });

    stats.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    return stats;
  } catch (error) {
    console.error('Error calculating activity stats:', error);
    return {
      totalCompleted: 0,
      byType: {},
      averageRating: 0,
      recentActivity: [],
    };
  }
}

