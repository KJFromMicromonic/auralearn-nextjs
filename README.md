# AuraLearn - Next.js

This is the Next.js version of the AuraLearn application, migrated from Vite.js + React Router.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the `auralearn-nextjs` directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_MISTRALAI_API_KEY=your_mistralai_key
NEXT_PUBLIC_BLACKBOX_API_KEY=your_blackbox_key

# LiveKit Configuration (server-side only - no NEXT_PUBLIC_ prefix needed)
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=your_livekit_url
LIVEKIT_AGENT_NAME=AuraVoiceAgent
```

**Note**: In Next.js, client-side environment variables must be prefixed with `NEXT_PUBLIC_`. The `getEnvVar()` utility in `lib/utils.ts` handles both `VITE_` and `NEXT_PUBLIC_` prefixes for compatibility.

### Running the Development Server

Run the Next.js app:
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Running the Application

Simply run:
```bash
npm run dev
```

All API routes are built into Next.js - no separate server needed! 🎉

## 📁 Project Structure

```
auralearn-nextjs/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   ├── not-found.tsx      # 404 page
│   ├── providers.tsx      # Client-side providers
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Other components
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── services/             # API and service functions
├── i18n/                 # Internationalization
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## 🔄 Migration Status

### ✅ Completed
- [x] Next.js project setup
- [x] All components ported
- [x] All services ported
- [x] All contexts and hooks ported
- [x] i18n configuration
- [x] Tailwind CSS configuration
- [x] Environment variable handling
- [x] Root layout with providers
- [x] Home page
- [x] ProtectedRoute component (Next.js compatible)
- [x] Public assets

### 📝 Remaining Work

**Pages to Convert**: All pages need to be converted from React Router to Next.js App Router. See `CONVERT_PAGES.md` for detailed conversion guide.

The original pages are in `pages-src/` directory. They need to be:
1. Converted to Next.js App Router structure
2. Updated to use Next.js navigation (`useRouter`, `Link`)
3. Wrapped with `ProtectedRoute` where needed
4. Added `'use client'` directive where needed

## 🔧 Key Differences from Vite

### Routing
- **Vite/React Router**: Centralized route configuration in `App.tsx`
- **Next.js**: File-based routing in `app/` directory

### Navigation
- **Vite**: `useNavigate()`, `<Link to="/path">`
- **Next.js**: `useRouter()`, `<Link href="/path">`

### Environment Variables
- **Vite**: `import.meta.env.VITE_*`
- **Next.js**: `process.env.NEXT_PUBLIC_*`

### Client Components
- Next.js uses Server Components by default
- Add `'use client'` directive for components using hooks or browser APIs

## 📚 Documentation

- `MIGRATION_NOTES.md` - Detailed migration notes
- `CONVERT_PAGES.md` - Guide for converting pages
- Original project docs in parent directory

## 🛠️ Scripts

- `npm run dev` - Start Next.js dev server (port 8080) - includes all API routes!
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### Environment Variables Not Working
- Ensure all client-side variables are prefixed with `NEXT_PUBLIC_`
- Restart the dev server after changing `.env.local`

### API Calls Failing
- All API routes are built into Next.js - no separate server needed
- Check that your environment variables are set correctly
- Verify the API route files exist in `app/api/` directory

### Import Errors
- Verify `tsconfig.json` has correct path aliases
- Ensure `@/*` points to the root directory

## 📝 Next Steps

1. Convert remaining pages (see `CONVERT_PAGES.md`)
2. Test all routes and navigation
3. Update any remaining `import.meta.env` references
4. Test authentication flows
5. Test protected routes
6. Verify all API integrations work

## 🤝 Contributing

When adding new pages:
1. Follow the App Router structure
2. Use `'use client'` for interactive components
3. Use `getEnvVar()` for environment variables
4. Wrap protected routes with `ProtectedRoute`
5. Use Next.js `Link` and `useRouter` for navigation
