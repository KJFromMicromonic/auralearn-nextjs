import { supabase } from '@/lib/supabase';
import { GradeLevelType } from '@/contexts/AuthContext';
import { mapStudentWithClass, StudentWithClass } from './student-service';

export interface ParentChildInput {
  name: string;
  gradeLevel: GradeLevelType;
  schoolName: string;
  classLabel?: string;
  schoolLocation?: string;
  secondaryParentEmail?: string;
}

interface ParentClassRecord {
  id: string;
  name: string;
}

/**
 * Normalize whitespace for human-entered strings.
 *
 * @param value - Raw string from user input.
 * @returns Sanitized string with collapsed whitespace.
 */
export function sanitizeInput(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Build a display name for a parent-managed class.
 *
 * @param params.schoolName - School or learning space name.
 * @param params.gradeLevel - Grade level for the child.
 * @param params.classLabel - Optional class/teacher descriptor.
 * @returns Readable class name for the classes table.
 */
export function buildParentClassName(params: {
  schoolName: string;
  gradeLevel: GradeLevelType;
  classLabel?: string;
}): string {
  const base = sanitizeInput(params.schoolName);
  const suffix = params.classLabel ? ` — ${sanitizeInput(params.classLabel)}` : ` (${params.gradeLevel})`;
  return `${base}${suffix}`;
}

/**
 * Create or reuse a parent-managed class for the given school context.
 *
 * @param userId - Supabase user ID for the parent.
 * @param schoolName - School name entered by the parent.
 * @param gradeLevel - Grade level of the child.
 * @param classLabel - Optional class descriptor.
 * @param schoolLocation - Optional city or region for the school.
 * @returns Existing or newly created class record.
 * @throws Error when Supabase operations fail.
 */
export async function getOrCreateParentClass(params: {
  userId: string;
  schoolName: string;
  gradeLevel: GradeLevelType;
  classLabel?: string;
  schoolLocation?: string;
}): Promise<ParentClassRecord> {
  const className = buildParentClassName({
    schoolName: params.schoolName,
    gradeLevel: params.gradeLevel,
    classLabel: params.classLabel,
  });

  const { data: existingClass, error: lookupError } = await supabase
    .from('classes')
    .select('id, name')
    .eq('user_id', params.userId)
    .eq('name', className)
    .maybeSingle();

  if (lookupError) {
    console.error('Failed to look up existing parent class', lookupError);
    throw new Error('Unable to look up existing learning space.');
  }

  if (existingClass) {
    return existingClass;
  }

  const { data: createdClass, error: createError } = await supabase
    .from('classes')
    .insert({
      user_id: params.userId,
      name: className,
      grade_level: params.gradeLevel,
      subject: 'parent_portal',
      school_name: sanitizeInput(params.schoolName),
      school_location: params.schoolLocation ? sanitizeInput(params.schoolLocation) : null,
    })
    .select('id, name')
    .single();

  if (createError || !createdClass) {
    console.error('Failed to create parent learning space', createError);
    throw new Error('Unable to create new learning space for this school.');
  }

  return createdClass;
}

/**
 * Add a new child to the parent's profile, creating a school-specific class if needed.
 *
 * @param params.userId - Supabase user ID of the parent.
 * @param params.parentEmail - Primary parent email used for linking.
 * @param params.child - Child and school metadata.
 * @returns Newly created student record with class metadata.
 * @throws Error when validation fails or Supabase operations error.
 */
export async function addChildToParentProfile(params: {
  userId: string;
  parentEmail: string;
  child: ParentChildInput;
}): Promise<StudentWithClass> {
  const { userId, parentEmail, child } = params;

  if (!userId) {
    throw new Error('Missing user identifier.');
  }

  if (!parentEmail) {
    throw new Error('Parent email is required to link a child.');
  }

  if (!child.name.trim()) {
    throw new Error('Child name is required.');
  }

  if (!child.schoolName.trim()) {
    throw new Error('School name is required.');
  }

  const classRecord = await getOrCreateParentClass({
    userId,
    schoolName: child.schoolName,
    classLabel: child.classLabel,
    gradeLevel: child.gradeLevel,
    schoolLocation: child.schoolLocation,
  });

  const { data: studentRecord, error: insertError } = await supabase
    .from('students')
    .insert({
      class_id: classRecord.id,
      name: sanitizeInput(child.name),
      parent_email: parentEmail,
      parent_email_2: child.secondaryParentEmail?.trim() || null,
    })
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
    .single();

  if (insertError || !studentRecord) {
    console.error('Failed to create student for parent', insertError);
    throw new Error('Unable to add child to your profile.');
  }

  return mapStudentWithClass(studentRecord as any);
}

