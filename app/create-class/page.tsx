'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users, Mail, Edit2, Check, X, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

interface Student {
  id: string;
  name: string;
  parentEmail?: string;
  parentEmail2?: string;
}

export default function CreateClassPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [className, setClassName] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState("");
  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentEmail2, setNewParentEmail2] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editEmail1, setEditEmail1] = useState("");
  const [editEmail2, setEditEmail2] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [csvClassName, setCSVClassName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadClassData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get teacher's classes
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (classError) throw classError;

      if (classes && classes.length > 0) {
        const latestClass = classes[0];
        setClassId(latestClass.id);
        setClassName(latestClass.name);

        // Load students for this class
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', latestClass.id)
          .order('created_at', { ascending: true });

        if (studentsError) throw studentsError;

        if (studentsData) {
          setStudents(studentsData.map(s => ({
            id: s.id,
            name: s.name,
            parentEmail: s.parent_email || undefined,
            parentEmail2: s.parent_email_2 || undefined,
          })));
        }
      }
    } catch (error) {
      console.error('Error loading class data:', error);
      toast.error(t('createClass.errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  // Load existing class and students from database
  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  const addStudent = async () => {
    if (!newStudentName.trim()) return;

    // First, ensure we have a class
    let currentClassId = classId;
    if (!currentClassId) {
      if (!className.trim()) {
        toast.error(t('createClass.enterClassNameFirst'));
        return;
      }

      // Create the class
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({
          name: className.trim(),
          user_id: user?.id,
        })
        .select()
        .single();

      if (classError) {
        console.error('Error creating class:', classError);
        toast.error(t('createClass.errors.failedToCreate'));
        return;
      }

      currentClassId = newClass.id;
      setClassId(newClass.id);
    }

    // Add student to database
    try {
      const { data: newStudent, error } = await supabase
        .from('students')
        .insert({
          class_id: currentClassId,
          name: newStudentName.trim(),
          parent_email: newParentEmail.trim() || null,
          parent_email_2: newParentEmail2.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setStudents([...students, {
        id: newStudent.id,
        name: newStudent.name,
        parentEmail: newStudent.parent_email || undefined,
        parentEmail2: newStudent.parent_email_2 || undefined,
      }]);

      setNewStudentName("");
      setNewParentEmail("");
      setNewParentEmail2("");
      toast.success(t('createClass.studentAdded', { name: newStudent.name }));
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error(t('createClass.errors.failedToAdd'));
    }
  };

  const removeStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStudents(students.filter(s => s.id !== id));
      toast.success(t('createClass.studentRemoved'));
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error(t('createClass.errors.failedToRemove'));
    }
  };

  const startEditingParentEmails = (student: Student) => {
    setEditingStudentId(student.id);
    setEditEmail1(student.parentEmail || "");
    setEditEmail2(student.parentEmail2 || "");
  };

  const saveParentEmails = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({
          parent_email: editEmail1.trim() || null,
          parent_email_2: editEmail2.trim() || null,
        })
        .eq('id', studentId);

      if (error) throw error;

      setStudents(students.map(s =>
        s.id === studentId
          ? { ...s, parentEmail: editEmail1.trim() || undefined, parentEmail2: editEmail2.trim() || undefined }
          : s
      ));
      setEditingStudentId(null);
      setEditEmail1("");
      setEditEmail2("");
      toast.success(t('createClass.parentEmailsUpdated'));
    } catch (error) {
      console.error('Error updating parent emails:', error);
      toast.error(t('createClass.errors.failedToUpdate'));
    }
  };

  const cancelEditingParentEmails = () => {
    setEditingStudentId(null);
    setEditEmail1("");
    setEditEmail2("");
  };

  const handleCSVUpload = () => {
    setShowCSVDialog(true);
  };

  const processCSVFile = async (file: File) => {
    if (!csvClassName.trim()) {
      toast.error(t('createClass.enterClassName'));
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header row
      const dataLines = lines.slice(1);

      const studentsToAdd = dataLines.map(line => {
        const [name, parentEmail, parentEmail2] = line.split(',').map(s => s.trim());
        return {
          name: name || '',
          parentEmail: parentEmail || undefined,
          parentEmail2: parentEmail2 || undefined,
        };
      }).filter(s => s.name); // Only include rows with a name

      if (studentsToAdd.length === 0) {
        toast.error(t('createClass.csvUpload.noValidStudents'));
        return;
      }

      // Create or use existing class
      let currentClassId = classId;
      if (!currentClassId) {
        const { data: newClass, error: classError } = await supabase
          .from('classes')
          .insert({
            name: csvClassName.trim(),
            user_id: user?.id,
          })
          .select()
          .single();

        if (classError) {
          console.error('Error creating class:', classError);
          toast.error(t('createClass.errors.failedToCreate'));
          return;
        }

        currentClassId = newClass.id;
        setClassId(newClass.id);
        setClassName(csvClassName);
      }

      // Batch insert students
      const studentsData = studentsToAdd.map(s => ({
        class_id: currentClassId,
        name: s.name,
        parent_email: s.parentEmail || null,
        parent_email_2: s.parentEmail2 || null,
      }));

      const { data: insertedStudents, error } = await supabase
        .from('students')
        .insert(studentsData)
        .select();

      if (error) throw error;

      // Add to local state
      const newStudents = insertedStudents.map(s => ({
        id: s.id,
        name: s.name,
        parentEmail: s.parent_email || undefined,
        parentEmail2: s.parent_email_2 || undefined,
      }));

      setStudents([...students, ...newStudents]);
      setShowCSVDialog(false);
      setCSVClassName("");
      toast.success(t('createClass.csvUpload.successfullyAdded', { count: newStudents.length }));
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast.error(t('createClass.csvUpload.failedToProcess'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error(t('createClass.csvUpload.uploadCSVFile'));
        e.target.value = ''; // Reset file input
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCSVSubmit = async () => {
    if (!selectedFile) {
      toast.error(t('createClass.csvUpload.selectFileFirst'));
      return;
    }

    if (!csvClassName.trim()) {
      toast.error(t('createClass.enterClassName'));
      return;
    }

    setIsUploading(true);
    try {
      await processCSVFile(selectedFile);
      // Reset state after successful upload
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const proceedToAssessment = () => {
    if (!className.trim()) {
      toast.error(t('createClass.enterClassName'));
      return;
    }
    if (students.length === 0) {
      toast.error(t('createClass.addAtLeastOneStudent'));
      return;
    }
    
    // Store class data
    localStorage.setItem("currentClass", JSON.stringify({ className, students }));
    router.push("/assessment");
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireRole="teacher">
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('createClass.loadingClassData')}</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole="teacher">
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{t('createClass.title')}</h1>
              <p className="text-muted-foreground">{t('createClass.description')}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCSVUpload} variant="outline" size="lg" className="rounded-xl">
                <Upload className="w-4 h-4 mr-2" />
                {t('createClass.uploadCSV')}
              </Button>
            </div>
          </div>

          <Card className="p-6 rounded-2xl shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('createClass.className')}</label>
                <Input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder={t('createClass.classNamePlaceholder')}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('createClass.addStudents')}</label>
                <div className="space-y-3">
                  <Input
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder={t('createClass.studentNamePlaceholder')}
                    className="rounded-xl"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        {t('createClass.parentEmail')}
                      </Label>
                      <Input
                        type="email"
                        value={newParentEmail}
                        onChange={(e) => setNewParentEmail(e.target.value)}
                        placeholder={t('createClass.parentEmailPlaceholder')}
                        className="rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        {t('createClass.secondParentEmail')}
                      </Label>
                      <Input
                        type="email"
                        value={newParentEmail2}
                        onChange={(e) => setNewParentEmail2(e.target.value)}
                        placeholder={t('createClass.secondParentEmailPlaceholder')}
                        className="rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <Button onClick={addStudent} className="rounded-xl w-full" disabled={!newStudentName.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createClass.addStudent')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {students.length > 0 && (
            <Card className="p-6 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">
                {t('createClass.students')} ({students.length})
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="p-4 rounded-xl bg-secondary border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-white text-sm font-semibold">
                          {student.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <span className="text-sm font-medium block">{student.name}</span>
                          {(student.parentEmail || student.parentEmail2) && (
                            <div className="flex gap-1 mt-1">
                              {student.parentEmail && (
                                <Badge variant="outline" className="text-xs">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {student.parentEmail}
                                </Badge>
                              )}
                              {student.parentEmail2 && (
                                <Badge variant="outline" className="text-xs">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {student.parentEmail2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditingParentEmails(student)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeStudent(student.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {editingStudentId === student.id && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              {t('createClass.parentEmail')}
                            </Label>
                            <Input
                              type="email"
                              value={editEmail1}
                              onChange={(e) => setEditEmail1(e.target.value)}
                              placeholder={t('createClass.parentEmailPlaceholder')}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              {t('createClass.secondParentEmail')}
                            </Label>
                            <Input
                              type="email"
                              value={editEmail2}
                              onChange={(e) => setEditEmail2(e.target.value)}
                              placeholder={t('createClass.secondParentEmailPlaceholder')}
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveParentEmails(student.id)}
                            className="flex-1"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {t('createClass.save')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditingParentEmails}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t('createClass.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={proceedToAssessment}
              disabled={!className || students.length === 0}
              className="rounded-xl px-8"
            >
              {t('createClass.proceedToAssessment')}
            </Button>
          </div>

          {/* CSV Upload Dialog */}
          <Dialog open={showCSVDialog} onOpenChange={(open) => {
            setShowCSVDialog(open);
            if (!open) {
              // Reset state when dialog closes
              setSelectedFile(null);
              setCSVClassName("");
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('createClass.csvUpload.title')}</DialogTitle>
                <DialogDescription>
                  {t('createClass.csvUpload.description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('createClass.className')}</Label>
                  <Input
                    value={csvClassName}
                    onChange={(e) => setCSVClassName(e.target.value)}
                    placeholder={t('createClass.classNamePlaceholder')}
                    className="mt-2"
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <Label>{t('createClass.csvUpload.selectFile')}</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="mt-2 w-full"
                    disabled={isUploading}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('createClass.csvUpload.fileSelected', { filename: selectedFile.name })}
                    </p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">{t('createClass.csvUpload.format')}</p>
                  <code className="block bg-secondary p-2 rounded text-xs">
                    Name,Parent Email,2nd Parent Email<br/>
                    John Doe,parent@email.com,<br/>
                    Jane Smith,jane.parent@email.com,jane.parent2@email.com
                  </code>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCSVSubmit}
                    disabled={!selectedFile || !csvClassName.trim() || isUploading}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? t('common.uploading') || 'Uploading...' : t('createClass.csvUpload.uploadButton')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCSVDialog(false)}
                    disabled={isUploading}
                  >
                    {t('createClass.cancel')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

