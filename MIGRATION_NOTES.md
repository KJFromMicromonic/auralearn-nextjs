# Next.js Migration Notes

## Overview
This project has been migrated from Vite.js + React Router to Next.js 16 with App Router.

## Key Changes

### 1. Environment Variables
- **Vite**: `VITE_*` prefix
- **Next.js**: `NEXT_PUBLIC_*` prefix for client-side variables
- The `getEnvVar()` utility in `lib/utils.ts` handles both formats for compatibility

### 2. Routing
- **React Router**: `<Route path="/page" element={<Page />} />`
- **Next.js**: File-based routing in `app/` directory
  - `app/page.tsx` → `/`
  - `app/about/page.tsx` → `/about`
  - `app/user/[id]/page.tsx` → `/user/:id`

### 3. Navigation
- **React Router**: `useNavigate()`, `<Link to="/path">`
- **Next.js**: `useRouter()` from `next/navigation`, `<Link href="/path">` from `next/link`

### 4. Client Components
- Components using hooks or browser APIs must have `'use client'` directive at the top
- Server components (default) cannot use hooks or browser APIs

### 5. Protected Routes
- Updated `components/ProtectedRoute.tsx` to use Next.js router
- Use in page components: `<ProtectedRoute><YourComponent /></ProtectedRoute>`

## Remaining Work

### Pages to Convert
All pages in `pages-src/` need to be converted to Next.js App Router structure:

1. **Auth Pages** (`app/sign-in/page.tsx`, etc.):
   - Convert `useNavigate()` → `useRouter()`
   - Convert `<Link to>` → `<Link href>`
   - Add `'use client'` directive

2. **Teacher Pages** (protected routes):
   - Create route folders: `app/create-class/page.tsx`, etc.
   - Wrap with `<ProtectedRoute requireRole="teacher">`
   - Wrap with `<Layout>` component

3. **Parent Pages**:
   - Create route folders: `app/parent-guide/page.tsx`, etc.
   - Wrap with `<ProtectedRoute requireRole="parent">`

4. **Dynamic Routes**:
   - `app/student-selection/[classId]/page.tsx`
   - `app/student-assessment/[classId]/[studentId]/page.tsx`
   - `app/cognitive-assessment/[sessionId]/page.tsx`
   - etc.

## Environment Setup

Create `.env.local` in `auralearn-nextjs/` with:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_GEMINI_API_KEY=your_key
# ... other env vars with NEXT_PUBLIC_ prefix
```

## Running the Project

```bash
cd auralearn-nextjs
npm install
npm run dev
```

The API server should still run from the root directory:
```bash
npm run dev:api
```

Or run both:
```bash
npm run dev:all
```

