# Page Conversion Guide

This guide helps convert React Router pages to Next.js App Router pages.

## Conversion Checklist

For each page in `pages-src/`, follow these steps:

### 1. Create Route Structure
- Create the appropriate folder structure in `app/`
- Example: `pages-src/auth/SignIn.tsx` → `app/sign-in/page.tsx`
- Example: `pages-src/StudentSelection.tsx` → `app/student-selection/[classId]/page.tsx`

### 2. Update Imports
```typescript
// OLD (React Router)
import { useNavigate, Link } from "react-router-dom";
import { useParams } from "react-router-dom";

// NEW (Next.js)
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useParams } from "next/navigation";
```

### 3. Add 'use client' Directive
Add at the very top of the file:
```typescript
'use client';
```

### 4. Update Navigation
```typescript
// OLD
const navigate = useNavigate();
navigate("/path");

// NEW
const router = useRouter();
router.push("/path");
```

### 5. Update Links
```typescript
// OLD
<Link to="/path">Text</Link>

// NEW
<Link href="/path">Text</Link>
```

### 6. Update Route Parameters
```typescript
// OLD
const { id } = useParams<{ id: string }>();

// NEW
const params = useParams();
const id = params.id as string;
```

### 7. Wrap Protected Routes
For pages that need authentication:
```typescript
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

export default function Page() {
  return (
    <ProtectedRoute requireRole="teacher">
      <Layout>
        {/* page content */}
      </Layout>
    </ProtectedRoute>
  );
}
```

## Route Mapping

### Public Routes
- `/` → `app/page.tsx` ✅ (Done)
- `/sign-in` → `app/sign-in/page.tsx`
- `/sign-up` → `app/sign-up/page.tsx`
- `/signin/teacher` → `app/signin/teacher/page.tsx`
- `/signin/parent` → `app/signin/parent/page.tsx`
- `/signup/teacher` → `app/signup/teacher/page.tsx`
- `/signup/parent` → `app/signup/parent/page.tsx`
- `/select-role` → `app/select-role/page.tsx`
- `/auth-callback` → `app/auth-callback/page.tsx`

### Teacher Routes (Protected)
- `/create-class` → `app/create-class/page.tsx`
- `/assessment` → `app/assessment/page.tsx`
- `/dashboard` → `app/dashboard/page.tsx`
- `/insights` → `app/insights/page.tsx`
- `/teaching-guide` → `app/teaching-guide/page.tsx`
- `/worksheets` → `app/worksheets/page.tsx`
- `/student-guide/[studentId]` → `app/student-guide/[studentId]/page.tsx`
- `/student-categories` → `app/student-categories/page.tsx`
- `/cognitive-assessment` → `app/cognitive-assessment/page.tsx`

### Parent Routes (Protected)
- `/parent-guide` → `app/parent-guide/page.tsx`
- `/parent/cognitive-assessment/[studentId]` → `app/parent/cognitive-assessment/[studentId]/page.tsx`

### Public Student Routes
- `/student-selection/[classId]` → `app/student-selection/[classId]/page.tsx`
- `/student-assessment/[classId]/[studentId]` → `app/student-assessment/[classId]/[studentId]/page.tsx`
- `/student-assessment/token/[token]` → `app/student-assessment/token/[token]/page.tsx`
- `/cognitive-assessment/[sessionId]` → `app/cognitive-assessment/[sessionId]/page.tsx`

### Other Routes
- `/settings` → `app/settings/page.tsx` (Protected, no role requirement)
- `/teacher-onboarding` → `app/teacher-onboarding/page.tsx` (Protected, teacher)

## Example Conversion

### Before (React Router)
```typescript
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <div>
      <Link to="/create-class">Create Class</Link>
      <button onClick={() => navigate("/settings")}>Settings</button>
    </div>
  );
}
```

### After (Next.js)
```typescript
'use client';

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  
  return (
    <ProtectedRoute requireRole="teacher">
      <Layout>
        <div>
          <Link href="/create-class">Create Class</Link>
          <button onClick={() => router.push("/settings")}>Settings</button>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
```

