/**
 * Student Service
 * Handles student CRUD operations and parent linking
 */

import { supabase } from '@/lib/supabase';
import { StudentCategory } from '@/lib/supabase';

export interface StudentData {
  id?: string;
  class_id: string;
  name: string;
  primary_category?: StudentCategory;
  secondary_category?: StudentCategory;
  parent_email?: string;
  parent_email_2?: string;
}

export interface StudentWithClass extends StudentData {
  id: string;
  class_name?: string;
  class_grade_level?: string;
  class_school_name?: string;
  class_school_location?: string;
  class_subject?: string;
  created_at: string;
  updated_at: string;
}

interface StudentRecord extends StudentData {
  classes?: {
    name?: string | null;
    grade_level?: string | null;
    school_name?: string | null;
    school_location?: string | null;
    subject?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a raw Supabase student record with nested class data into StudentWithClass.
 *
 * @param record - Raw record including nested class metadata.
 * @returns Normalized StudentWithClass object.
 */
export function mapStudentWithClass(record: StudentRecord): StudentWithClass {
  const { classes, ...student } = record;
  return {
    ...(student as StudentWithClass),
    class_name: classes?.name ?? undefined,
    class_grade_level: classes?.grade_level ?? undefined,
    class_school_name: classes?.school_name ?? undefined,
    class_school_location: classes?.school_location ?? undefined,
    class_subject: classes?.subject ?? undefined,
  };
}

/**
 * Get all students for a class
 */
export async function getStudentsByClass(classId: string): Promise<StudentWithClass[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      classes(
        name,
        grade_level,
        school_name,
        school_location,
        subject
      )
    `)
    .eq('class_id', classId)
    .order('name');

  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  return (data || []).map(mapStudentWithClass);
}

/**
 * Get students for a parent (by parent email)
 */
export async function getStudentsForParent(parentEmail: string): Promise<StudentWithClass[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      classes(
        name,
        grade_level,
        school_name,
        school_location,
        subject
      )
    `)
    .or(`parent_email.eq.${parentEmail},parent_email_2.eq.${parentEmail}`)
    .order('name');

  if (error) {
    console.error('Error fetching parent students:', error);
    throw error;
  }

  return (data || []).map(mapStudentWithClass);
}

/**
 * Create a new student
 */
export async function createStudent(student: StudentData): Promise<StudentWithClass> {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();

  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }

  return data as StudentWithClass;
}

/**
 * Update a student (including parent emails)
 */
export async function updateStudent(
  studentId: string,
  updates: Partial<StudentData>
): Promise<StudentWithClass> {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', studentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }

  return data as StudentWithClass;
}

/**
 * Delete a student
 */
export async function deleteStudent(studentId: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId);

  if (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
}

/**
 * Batch update parent emails for multiple students
 */
export async function updateParentEmails(
  students: Array<{ id: string; parent_email?: string; parent_email_2?: string }>
): Promise<void> {
  const updates = students.map(s =>
    supabase
      .from('students')
      .update({
        parent_email: s.parent_email,
        parent_email_2: s.parent_email_2,
      })
      .eq('id', s.id)
  );

  await Promise.all(updates);
}

/**
 * Check if a parent email is linked to any students
 */
export async function hasLinkedStudents(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .or(`parent_email.eq.${email},parent_email_2.eq.${email}`)
    .limit(1);

  if (error) {
    console.error('Error checking linked students:', error);
    return false;
  }

  return data.length > 0;
}
