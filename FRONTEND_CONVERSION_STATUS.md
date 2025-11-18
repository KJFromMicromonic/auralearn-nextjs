# Frontend Conversion Status

## ✅ Completed Pages

### Auth Pages (Public)
- ✅ `/` - Home page (`app/page.tsx`)
- ✅ `/sign-in` - Legacy sign in (`app/sign-in/page.tsx`)
- ✅ `/sign-up` - Legacy sign up (`app/sign-up/page.tsx`)
- ✅ `/signin/teacher` - Teacher sign in (`app/signin/teacher/page.tsx`)
- ✅ `/signin/parent` - Parent sign in (`app/signin/parent/page.tsx`)
- ✅ `/signup/teacher` - Teacher sign up (`app/signup/teacher/page.tsx`)
- ✅ `/signup/parent` - Parent sign up (`app/signup/parent/page.tsx`)
- ✅ `/select-role` - Role selection (`app/select-role/page.tsx`)
- ✅ `/auth-callback` - Auth callback (`app/auth-callback/page.tsx`)
- ✅ `/teacher-onboarding` - Teacher onboarding (`app/teacher-onboarding/page.tsx`)
- ✅ `/*` - 404 Not Found (`app/not-found.tsx`)

## 📝 Remaining Pages to Convert

### Teacher Protected Pages
These need to be wrapped with `<ProtectedRoute requireRole="teacher">` and `<Layout>`:

- [ ] `/create-class` → `app/create-class/page.tsx`
- [ ] `/assessment` → `app/assessment/page.tsx`
- [ ] `/dashboard` → `app/dashboard/page.tsx`
- [ ] `/insights` → `app/insights/page.tsx`
- [ ] `/teaching-guide` → `app/teaching-guide/page.tsx`
- [ ] `/worksheets` → `app/worksheets/page.tsx`
- [ ] `/student-categories` → `app/student-categories/page.tsx`
- [ ] `/cognitive-assessment` → `app/cognitive-assessment/page.tsx`

### Parent Protected Pages
These need to be wrapped with `<ProtectedRoute requireRole="parent">` and `<Layout>`:

- [ ] `/parent-guide` → `app/parent-guide/page.tsx`
- [ ] `/parent/cognitive-assessment/[studentId]` → `app/parent/cognitive-assessment/[studentId]/page.tsx`

### Dynamic Routes (Teacher)
- [ ] `/student-guide/[studentId]` → `app/student-guide/[studentId]/page.tsx`

### Public Student Routes
- [ ] `/student-selection/[classId]` → `app/student-selection/[classId]/page.tsx`
- [ ] `/student-assessment/[classId]/[studentId]` → `app/student-assessment/[classId]/[studentId]/page.tsx`
- [ ] `/student-assessment/token/[token]` → `app/student-assessment/token/[token]/page.tsx`
- [ ] `/cognitive-assessment/[sessionId]` → `app/cognitive-assessment/[sessionId]/page.tsx`

### Other Pages
- [ ] `/settings` → `app/settings/page.tsx` (Protected, no role requirement)

## Conversion Pattern

For each page, follow this pattern:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

export default function PageName() {
  const router = useRouter();
  
  // Convert useNavigate() → router.push() or router.replace()
  // Convert <Link to> → <Link href>
  // Convert useParams() → useParams() from 'next/navigation'
  
  return (
    <ProtectedRoute requireRole="teacher"> {/* if needed */}
      <Layout> {/* if needed */}
        {/* page content */}
      </Layout>
    </ProtectedRoute>
  );
}
```

## Quick Conversion Checklist

For each page file in `pages-src/`:

1. ✅ Add `'use client'` directive at top
2. ✅ Replace `useNavigate()` with `useRouter()` from `next/navigation`
3. ✅ Replace `<Link to="/path">` with `<Link href="/path">` from `next/link`
4. ✅ Replace `useParams()` import from `react-router-dom` with `next/navigation`
5. ✅ Wrap with `<ProtectedRoute>` if needed
6. ✅ Wrap with `<Layout>` if needed
7. ✅ Create proper folder structure in `app/` directory
8. ✅ Handle dynamic routes with `[param]` folders

## Notes

- All original pages are in `pages-src/` for reference
- Use `CONVERT_PAGES.md` for detailed conversion guide
- Test each page after conversion
- Ensure all imports are updated to Next.js equivalents

