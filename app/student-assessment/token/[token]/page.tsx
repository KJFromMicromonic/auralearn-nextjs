'use client';

import { useParams } from "next/navigation";
import StudentAssessmentComponent from "@/components/StudentAssessmentComponent";

export default function StudentAssessmentTokenPage() {
  const params = useParams();
  const token = params.token as string;

  return <StudentAssessmentComponent token={token} />;
}

