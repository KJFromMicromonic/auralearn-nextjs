import { supabase } from '@/lib/supabase';
// Note: jsPDF and html2canvas are client-side only, will be dynamically imported

export interface AssessmentData {
  id: string;
  student_id: string;
  questions_data: Array<Record<string, unknown>>;
  answers: Array<Record<string, unknown>>;
  score: number;
  total_questions: number;
  category_determined: string;
  confidence_score: number;
  time_taken: number;
  started_at: string;
  completed_at: string;
  student?: {
    name: string;
    class_id: string;
    primary_category: string;
    classes?: {
      name: string;
      grade_level: string;
      subject: string;
    };
  };
}

export interface ReportData {
  assessment: AssessmentData;
  studentName: string;
  className: string;
  subject: string;
  gradeLevel: string;
  scorePercentage: number;
  timeFormatted: string;
  categoryName: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  aiSummary?: string;
}

/**
 * Fetch assessment data for a student
 */
export async function getAssessmentData(assessmentId: string): Promise<AssessmentData | null> {
  try {
    console.log('Fetching assessment data for ID:', assessmentId);
    
    const { data, error } = await supabase
      .from('student_assessments')
      .select(`
        *,
        students (
          name,
          class_id,
          primary_category,
          classes (
            name,
            grade_level,
            subject
          )
        )
      `)
      .eq('id', assessmentId)
      .single();

    if (error) {
      console.error('Error fetching assessment data:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error,
      });
      return null;
    }

    if (!data) {
      console.error('No assessment data returned for ID:', assessmentId);
      return null;
    }

    console.log('Assessment data fetched successfully:', {
      id: data.id,
      student_id: data.student_id,
      hasStudent: !!data.students,
      studentName: (data as any).students?.name,
    });

    // Transform the nested structure to match AssessmentData interface
    const assessment = data as any;
    const transformedData: AssessmentData = {
      ...assessment,
      student: assessment.students ? {
        name: assessment.students.name,
        class_id: assessment.students.class_id,
        primary_category: assessment.students.primary_category,
        classes: assessment.students.classes ? {
          name: assessment.students.classes.name,
          grade_level: assessment.students.classes.grade_level,
          subject: assessment.students.classes.subject,
        } : undefined,
      } : undefined,
    };

    return transformedData;
  } catch (error) {
    console.error('Error in getAssessmentData:', error);
    console.error('Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Fetch all assessments for a student
 */
export async function getStudentAssessments(studentId: string): Promise<AssessmentData[]> {
  try {
    const { data, error } = await supabase
      .from('student_assessments')
      .select(`
        *,
        students (
          name,
          class_id,
          primary_category,
          classes (
            name,
            grade_level,
            subject
          )
        )
      `)
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching student assessments:', error);
      return [];
    }

    return (data as AssessmentData[]) || [];
  } catch (error) {
    console.error('Error in getStudentAssessments:', error);
    return [];
  }
}

/**
 * Analyze assessment results
 */
export function analyzeAssessment(assessment: AssessmentData): {
  strengths: string[];
  weaknesses: string[];
  categoryBreakdown: Record<string, { correct: number; total: number }>;
} {
  const categoryBreakdown: Record<string, { correct: number; total: number }> = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Validate data exists
  if (!assessment.answers || !Array.isArray(assessment.answers)) {
    console.warn('Assessment answers is not an array:', assessment.answers);
    return { strengths, weaknesses, categoryBreakdown };
  }

  if (!assessment.questions_data || !Array.isArray(assessment.questions_data)) {
    console.warn('Assessment questions_data is not an array:', assessment.questions_data);
    return { strengths, weaknesses, categoryBreakdown };
  }

  // Analyze by category
  assessment.answers.forEach((answer, index) => {
    // Safely get question data
    const question = assessment.questions_data[index] as { category?: string; category_key?: string } | undefined;
    const answerData = answer as { is_correct?: boolean; is_correct_answer?: boolean } | undefined;
    
    // Skip if question or answer is missing
    if (!question || !answerData) {
      console.warn(`Missing question or answer data at index ${index}`, { question, answerData });
      return;
    }

    // Try multiple possible category field names
    const category = question.category || question.category_key || 'unknown';
    const isCorrect = answerData.is_correct ?? answerData.is_correct_answer ?? false;

    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = { correct: 0, total: 0 };
    }

    categoryBreakdown[category].total++;
    if (isCorrect) {
      categoryBreakdown[category].correct++;
    }
  });

  // Determine strengths and weaknesses
  Object.entries(categoryBreakdown).forEach(([category, stats]) => {
    const percentage = (stats.correct / stats.total) * 100;
    if (percentage >= 70) {
      strengths.push(category);
    } else if (percentage < 50) {
      weaknesses.push(category);
    }
  });

  return { strengths, weaknesses, categoryBreakdown };
}

/**
 * Generate recommendations based on assessment
 */
export function generateRecommendations(
  assessment: AssessmentData,
  analysis: ReturnType<typeof analyzeAssessment>
): string[] {
  const recommendations: string[] = [];
  const scorePercentage = (assessment.score / assessment.total_questions) * 100;

  // Score-based recommendations
  if (scorePercentage >= 80) {
    recommendations.push('Excellent performance! Consider advancing to more challenging material.');
  } else if (scorePercentage >= 60) {
    recommendations.push('Good progress. Focus on reinforcing concepts in weaker areas.');
  } else {
    recommendations.push('Additional support recommended. Consider one-on-one tutoring or review sessions.');
  }

  // Category-based recommendations
  if (assessment.category_determined === 'visual_learner') {
    recommendations.push('Use visual aids, diagrams, and charts to enhance learning.');
  } else if (assessment.category_determined === 'needs_repetition') {
    recommendations.push('Provide multiple practice opportunities and review sessions.');
  } else if (assessment.category_determined === 'fast_processor') {
    recommendations.push('Offer enrichment activities and advanced challenges.');
  }

  // Weakness-based recommendations
  if (analysis.weaknesses.length > 0) {
    recommendations.push(`Focus on improving: ${analysis.weaknesses.join(', ')}`);
  }

  // Time-based recommendations
  const avgTimePerQuestion = assessment.time_taken / assessment.total_questions;
  if (avgTimePerQuestion < 10) {
    recommendations.push('Encourage taking more time to read questions carefully.');
  } else if (avgTimePerQuestion > 60) {
    recommendations.push('Practice time management and quick decision-making skills.');
  }

  return recommendations;
}

/**
 * Prepare report data
 */
export async function prepareReportData(assessmentId: string): Promise<ReportData | null> {
  console.log('Preparing report data for assessment ID:', assessmentId);
  
  const assessment = await getAssessmentData(assessmentId);
  
  if (!assessment) {
    console.error('Failed to get assessment data for ID:', assessmentId);
    return null;
  }
  
  if (!assessment.student) {
    console.error('Assessment data missing student information:', {
      assessmentId,
      hasStudent: !!assessment.student,
      studentId: assessment.student_id,
    });
    return null;
  }
  
  console.log('Assessment data prepared successfully:', {
    studentName: assessment.student.name,
    className: assessment.student.classes?.name,
    score: assessment.score,
    totalQuestions: assessment.total_questions,
  });

  const analysis = analyzeAssessment(assessment);
  const recommendations = generateRecommendations(assessment, analysis);

  const scorePercentage = (assessment.score / assessment.total_questions) * 100;
  const minutes = Math.floor(assessment.time_taken / 60);
  const seconds = assessment.time_taken % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  return {
    assessment,
    studentName: assessment.student.name,
    className: assessment.student.classes?.name || 'Unknown Class',
    subject: assessment.student.classes?.subject || 'Unknown Subject',
    gradeLevel: assessment.student.classes?.grade_level || 'Unknown Grade',
    scorePercentage,
    timeFormatted,
    categoryName: assessment.category_determined,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    recommendations,
  };
}

/**
 * Generate PDF report from HTML element
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  filename: string
): Promise<void> {
  try {
    // Dynamically import client-side only libraries
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height in mm

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate PDF report directly (without HTML element)
 */
export async function generatePDFReport(reportData: ReportData): Promise<void> {
  try {
    console.log('Starting PDF generation for:', reportData.studentName);
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('PDF generation must be run in a browser environment');
    }
    
    // Dynamically import jsPDF (client-side only library)
    const jsPDF = (await import('jspdf')).default;
    console.log('jsPDF imported successfully');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    console.log('PDF object created successfully');

    let yPosition = 20;
    const lineHeight = 7;
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Academic Assessment Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    // Student Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Student: ${reportData.studentName}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Class: ${reportData.className}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Subject: ${reportData.subject}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Grade Level: ${reportData.gradeLevel}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Assessment Results
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Assessment Results', margin, yPosition);
    yPosition += lineHeight;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Score: ${reportData.assessment.score}/${reportData.assessment.total_questions} (${reportData.scorePercentage.toFixed(1)}%)`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Time Taken: ${reportData.timeFormatted}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Learning Profile: ${reportData.categoryName}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Confidence: ${(reportData.assessment.confidence_score * 100).toFixed(1)}%`, margin, yPosition);
    yPosition += lineHeight * 2;

    // AI Summary (if available)
    if (reportData.aiSummary) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Performance Summary', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const summaryLines = pdf.splitTextToSize(reportData.aiSummary, contentWidth);
      summaryLines.forEach((line: string) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += lineHeight;
    }

    // Strengths
    if (reportData.strengths.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Strengths', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      reportData.strengths.forEach((strength) => {
        pdf.text(`• ${strength}`, margin + 5, yPosition);
        yPosition += lineHeight;
      });
      yPosition += lineHeight;
    }

    // Areas for Improvement
    if (reportData.weaknesses.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Areas for Improvement', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      reportData.weaknesses.forEach((weakness) => {
        pdf.text(`• ${weakness}`, margin + 5, yPosition);
        yPosition += lineHeight;
      });
      yPosition += lineHeight;
    }

    // Recommendations
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recommendations', margin, yPosition);
    yPosition += lineHeight;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    reportData.recommendations.forEach((rec) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      const recLines = pdf.splitTextToSize(`• ${rec}`, contentWidth - 5);
      recLines.forEach((line: string) => {
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight;
      });
    });

    // Footer
    const date = new Date(reportData.assessment.completed_at).toLocaleDateString();
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Generated on ${date}`, pageWidth / 2, 285, { align: 'center' });

    // Save
    const filename = `Assessment_Report_${reportData.studentName.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`;
    console.log('Attempting to save PDF with filename:', filename);
    console.log('PDF object:', pdf);
    console.log('PDF output method available:', typeof pdf.save === 'function');
    
    // Verify PDF was created correctly
    if (!pdf || typeof pdf.save !== 'function') {
      throw new Error('PDF object is invalid or save method is not available');
    }
    
    try {
      // Call save method - this should trigger browser download
      pdf.save(filename);
      console.log('PDF save() called successfully');
      
      // Verify the PDF blob was created
      const pdfBlob = pdf.output('blob');
      console.log('PDF blob created:', pdfBlob);
      console.log('PDF blob size:', pdfBlob.size, 'bytes');
      
      // Alternative: Try using blob URL if direct save doesn't work
      if (pdfBlob && pdfBlob.size > 0) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        console.log('PDF blob URL created:', blobUrl);
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        
        console.log('PDF download triggered via blob URL');
      }
      
      // Give browser a moment to process the download
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('PDF download should have been triggered');
    } catch (saveError) {
      console.error('Error calling pdf.save():', saveError);
      console.error('Save error details:', {
        error: saveError,
        message: saveError instanceof Error ? saveError.message : 'Unknown error',
        stack: saveError instanceof Error ? saveError.stack : undefined,
      });
      throw saveError;
    }
  } catch (error) {
    console.error('Error generating PDF report:', error);
    console.error('Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      reportData: {
        studentName: reportData.studentName,
        hasAiSummary: !!reportData.aiSummary,
        strengthsCount: reportData.strengths.length,
        weaknessesCount: reportData.weaknesses.length,
      },
    });
    throw error;
  }
}
