import { supabase } from '@/lib/supabase';

export interface TokenValidationResult {
  valid: boolean;
  studentId?: string;
  studentName?: string;
  classId?: string;
  primaryCategory?: string;
  errorMessage?: string;
}

export interface Student {
  id: string;
  name: string;
  class_id: string;
  primary_category: string | null;
  secondary_category: string | null;
  assessment_token: string;
  token_expires_at: string;
  token_last_used_at?: string | null;
  parent_email: string | null;
  parent_email_2: string | null;
}

export interface AssessmentStatus {
  studentId: string;
  completedCount: number;
  lastCompletedAt: string | null;
  hasCompleted: boolean;
}

/**
 * Validate an assessment token
 */
export async function validateAssessmentToken(
  token: string
): Promise<TokenValidationResult> {
  try {
    // Query the student directly instead of using RPC
    const { data: student, error } = await supabase
      .from('students')
      .select('id, name, class_id, primary_category, token_expires_at')
      .eq('assessment_token', token)
      .single();

    if (error) {
      console.error('Error validating token:', error);
      return {
        valid: false,
        errorMessage: 'Invalid token',
      };
    }

    if (!student) {
      return {
        valid: false,
        errorMessage: 'Invalid token',
      };
    }

    // Check if token has expired
    const expiresAt = new Date(student.token_expires_at);
    const now = new Date();

    if (expiresAt < now) {
      return {
        valid: false,
        errorMessage: 'Token has expired',
      };
    }

    // Token is valid
    return {
      valid: true,
      studentId: student.id,
      studentName: student.name,
      classId: student.class_id,
      primaryCategory: student.primary_category,
    };
  } catch (error) {
    console.error('Error in validateAssessmentToken:', error);
    return {
      valid: false,
      errorMessage: 'An error occurred while validating the token',
    };
  }
}

/**
 * Mark token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    // Update token_last_used_at directly
    const { error } = await supabase
      .from('students')
      .update({ token_last_used_at: new Date().toISOString() })
      .eq('assessment_token', token);

    if (error) {
      console.error('Error marking token as used:', error);
    }
  } catch (error) {
    console.error('Error in markTokenAsUsed:', error);
  }
}

/**
 * Log assessment access
 */
export async function logAssessmentAccess(
  studentId: string,
  classId: string,
  accessMethod: 'token' | 'manual_selection',
  tokenUsed?: string
): Promise<void> {
  try {
    // Insert directly into assessment_access_log table
    const { error } = await supabase
      .from('assessment_access_log')
      .insert({
        student_id: studentId,
        class_id: classId,
        access_method: accessMethod,
        token_used: tokenUsed || null,
        accessed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error logging assessment access:', error);
    }
  } catch (error) {
    console.error('Error in logAssessmentAccess:', error);
  }
}

/**
 * Regenerate assessment token for a student
 */
export async function regenerateAssessmentToken(
  studentId: string
): Promise<string | null> {
  try {
    // Generate a new UUID token
    const newToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    const { data, error } = await supabase
      .from('students')
      .update({
        assessment_token: newToken,
        token_expires_at: expiresAt.toISOString(),
        token_last_used_at: null,
      })
      .eq('id', studentId)
      .select('assessment_token')
      .single();

    if (error) {
      console.error('Error regenerating token:', error);
      return null;
    }

    return data?.assessment_token || null;
  } catch (error) {
    console.error('Error in regenerateAssessmentToken:', error);
    return null;
  }
}

/**
 * Get student by token
 */
export async function getStudentByToken(token: string): Promise<Student | null> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('assessment_token', token)
      .single();

    if (error) {
      console.error('Error fetching student by token:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getStudentByToken:', error);
    return null;
  }
}

/**
 * Get all students in a class with their tokens
 */
export async function getClassStudentsWithTokens(
  classId: string
): Promise<Student[]> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('name');

    if (error) {
      console.error('Error fetching class students:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClassStudentsWithTokens:', error);
    return [];
  }
}

/**
 * Generate assessment link for a student token
 */
export function generateTokenAssessmentLink(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/student-assessment/token/${token}`;
}

/**
 * Update student parent emails
 */
export async function updateStudentParentEmails(
  studentId: string,
  parentEmail: string | null,
  parentEmail2: string | null
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('students')
      .update({
        parent_email: parentEmail,
        parent_email_2: parentEmail2,
      })
      .eq('id', studentId);

    if (error) {
      console.error('Error updating parent emails:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateStudentParentEmails:', error);
    return false;
  }
}

/**
 * Get assessment status for students in a class
 * 
 * @param classId - The class ID to get assessment statuses for
 * @returns Map of student ID to assessment status
 */
export async function getAssessmentStatuses(
  classId: string
): Promise<Map<string, AssessmentStatus>> {
  try {
    // Get all student IDs in the class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', classId);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return new Map();
    }

    if (!students || students.length === 0) {
      return new Map();
    }

    const studentIds = students.map(s => s.id);

    // Get all assessments for these students
    const { data: assessments, error: assessmentsError } = await supabase
      .from('student_assessments')
      .select('student_id, completed_at')
      .in('student_id', studentIds);

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      return new Map();
    }

    // Build status map
    const statusMap = new Map<string, AssessmentStatus>();

    // Initialize all students with no assessments
    studentIds.forEach(studentId => {
      statusMap.set(studentId, {
        studentId,
        completedCount: 0,
        lastCompletedAt: null,
        hasCompleted: false,
      });
    });

    // Update with actual assessment data
    assessments?.forEach(assessment => {
      const existing = statusMap.get(assessment.student_id) || {
        studentId: assessment.student_id,
        completedCount: 0,
        lastCompletedAt: null,
        hasCompleted: false,
      };

      existing.completedCount++;
      existing.hasCompleted = true;

      // Update last completed date if this is more recent
      if (!existing.lastCompletedAt || 
          (assessment.completed_at && 
           new Date(assessment.completed_at) > new Date(existing.lastCompletedAt))) {
        existing.lastCompletedAt = assessment.completed_at;
      }

      statusMap.set(assessment.student_id, existing);
    });

    return statusMap;
  } catch (error) {
    console.error('Error in getAssessmentStatuses:', error);
    return new Map();
  }
}
