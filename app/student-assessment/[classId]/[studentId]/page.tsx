'use client';

import { useParams } from "next/navigation";
import StudentAssessmentComponent from "@/components/StudentAssessmentComponent";

export default function StudentAssessmentPage() {
  const params = useParams();
  const classId = params.classId as string;
  const studentId = params.studentId as string;

  return <StudentAssessmentComponent classId={classId} studentId={studentId} />;
}

