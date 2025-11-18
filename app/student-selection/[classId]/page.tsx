'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Users, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

interface Student {
  id: string;
  name: string;
  primary_category?: string;
}

export default function StudentSelectionPage() {
  const params = useParams();
  const classId = params?.classId as string;
  const router = useRouter();
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [className, setClassName] = useState('');

  const loadStudents = useCallback(async () => {
    if (!classId) {
      toast.error(t('errors.validation'));
      setIsLoading(false);
      return;
    }

    try {
      // Get class info
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      setClassName(classData.name);

      // Get students in this class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, primary_category')
        .eq('class_id', classId)
        .order('name');

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error(t('studentSelection.loading'));
    } finally {
      setIsLoading(false);
    }
  }, [classId, t]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  const handleStartAssessment = () => {
    if (!selectedStudentId) {
      toast.error(t('studentSelection.selectStudent'));
      return;
    }

    // Navigate to assessment with student ID
    router.push(`/student-assessment/${classId}/${selectedStudentId}`);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireRole="teacher">
        <Layout>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastel-mint/20 via-pastel-sky/20 to-pastel-lavender/20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('studentSelection.loading')}</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole="teacher">
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-mint/20 via-pastel-sky/20 to-pastel-lavender/20 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
                <Users className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{t('studentSelection.title')}</h1>
              <p className="text-xl text-muted-foreground">{t('common.class')}: {className}</p>
              <p className="text-lg text-muted-foreground mt-2">{t('studentSelection.description')}</p>
            </div>

            {/* Student Grid */}
            {students.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground">{t('studentSelection.noStudents')}</p>
                <p className="text-sm text-muted-foreground mt-2">{t('studentSelection.contactTeacher')}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {students.map((student) => {
                  const isSelected = student.id === selectedStudentId;
                  return (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student.id)}
                      className={`relative bg-card border-2 rounded-xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg ${
                        isSelected
                          ? 'border-primary shadow-lg scale-105 bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-white font-bold text-xl">
                          {getInitials(student.name)}
                        </div>
                        <p className="text-sm font-medium text-center text-foreground">
                          {student.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Start Button */}
            {students.length > 0 && (
              <div className="flex justify-center">
                <Button
                  onClick={handleStartAssessment}
                  disabled={!selectedStudentId}
                  size="lg"
                  className="text-lg px-12 py-6 rounded-xl shadow-lg"
                >
                  {t('studentSelection.startAssessment')}
                </Button>
              </div>
            )}
          </div>
        </div>
        </Layout>
      </ProtectedRoute>
    );
}

