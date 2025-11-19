# AuraLearn - Tech Stack Documentation

## 🚀 Does it work?

**Deployment Status**: ✅ **LIVE IN PRODUCTION**

The application is successfully deployed and running in production. The project includes:
- ✅ Vercel configuration (`vercel.json`)
- ✅ Production build configuration
- ✅ All TypeScript compilation errors fixed
- ✅ Next.js build passes successfully
- ✅ Successfully deployed and accessible

**Production URL**: **https://www.auralearn.academy**

**Access Method**: 
- **Production**: Visit [https://www.auralearn.academy](https://www.auralearn.academy) to access the live application
- Development: `http://localhost:8080` (for local development)

---

## 🛠️ What did you build with?

### **Core Framework & Language**
- **Next.js 16.0.3** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.8.3** - Type-safe JavaScript

### **Frontend UI & Styling**
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI
- **Radix UI** - Accessible component primitives (20+ components)
- **Lucide React** - Icon library
- **next-themes** - Dark mode support

### **Authentication & Authorization**
- **Clerk** (`@clerk/clerk-react`) - User authentication and management

### **Database & Backend Services**
- **Supabase** (`@supabase/supabase-js`) - PostgreSQL database with real-time capabilities
  - Row Level Security (RLS) for data access control
  - RESTful API and real-time subscriptions

### **AI & Machine Learning Services**
- **Google Gemini** (`@google/generative-ai`) - AI assessment generation and insights
- **OpenAI** - AI-powered features
- **Mistral AI** - Alternative AI provider for assessments
- **Blackbox AI** - AI chat completions
- **Ragie RAG** - Retrieval-Augmented Generation for knowledge retrieval

### **Real-time Communication**
- **LiveKit** (`livekit-client`, `livekit-server-sdk`) - Real-time voice agent platform
  - WebSocket-based communication
  - Voice agent dispatch and management

### **State Management & Data Fetching**
- **TanStack Query** (`@tanstack/react-query`) - Server state management
- **React Context API** - Client-side state management

### **Form Handling & Validation**
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **@hookform/resolvers** - Form validation integration

### **Internationalization**
- **i18next** - Internationalization framework
- **react-i18next** - React bindings for i18next
- **i18next-browser-languagedetector** - Language detection

### **Data Visualization**
- **Recharts** - Chart library for data visualization

### **Document Generation**
- **jsPDF** - PDF generation
- **html2canvas** - HTML to canvas conversion for PDFs

### **Additional Libraries**
- **date-fns** - Date manipulation
- **react-markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown support
- **youtube-transcript** - YouTube transcript extraction
- **jose** - JWT handling
- **sonner** - Toast notifications

### **Development Tools**
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

### **Deployment Platform**
- **Vercel** - Hosting and deployment platform
  - Automatic builds from Git
  - Serverless functions for API routes
  - Edge network for global distribution

---

## 🏗️ How did you build it?

### **Architecture Approach**

**1. Monolithic Next.js Application**
- Migrated from Vite.js + React Router to Next.js App Router
- All API routes integrated into Next.js (no separate backend server needed)
- File-based routing system for better organization
- Server Components by default, with Client Components where needed

**2. Security-First Design**
- All API keys stored server-side (never exposed to client)
- Environment variables properly scoped (`NEXT_PUBLIC_*` for client, no prefix for server)
- Supabase Row Level Security (RLS) for database access control
- JWT tokens generated server-side for LiveKit authentication

**3. Type Safety Throughout**
- Full TypeScript implementation
- Type definitions for all database schemas
- Zod schemas for runtime validation
- Type-safe API routes and service functions

**4. Component Architecture**
- Modular service layer (`services/` directory)
- Reusable UI components (`components/ui/`)
- Custom hooks for business logic (`hooks/`)
- Context providers for global state (`contexts/`)

### **Key Technical Decisions**

**1. Next.js App Router Migration**
- **Why**: Better performance, built-in API routes, improved SEO
- **Benefit**: Single application to deploy, no separate Express server needed
- **Trade-off**: Learning curve from React Router, but better long-term scalability

**2. Supabase as Backend**
- **Why**: Rapid development, built-in authentication, real-time capabilities
- **Benefit**: PostgreSQL database with REST API, no backend code needed
- **Trade-off**: Vendor lock-in, but acceptable for hackathon timeline

**3. Multiple AI Providers**
- **Why**: Redundancy and flexibility for different use cases
- **Benefit**: Can switch providers based on cost/performance needs
- **Implementation**: Service abstraction layer allows easy provider switching

**4. LiveKit for Voice Agents**
- **Why**: Production-ready real-time voice communication
- **Benefit**: Handles WebSocket connections, audio streaming, agent dispatch
- **Implementation**: Server-side token generation, client-side connection

**5. TanStack Query for Data Fetching**
- **Why**: Automatic caching, background refetching, optimistic updates
- **Benefit**: Better UX with loading states and error handling
- **Implementation**: Wraps all Supabase queries and API calls

**6. shadcn/ui Component Library**
- **Why**: Accessible, customizable, copy-paste components
- **Benefit**: Fast UI development with consistent design system
- **Implementation**: Radix UI primitives with Tailwind styling

### **Development Workflow**

1. **Local Development**
   - Single command: `npm run dev`
   - Hot module replacement
   - TypeScript type checking
   - ESLint for code quality

2. **API Route Development**
   - All API routes in `app/api/` directory
   - Server-side only (no client exposure)
   - Automatic route generation from file structure

3. **Database Management**
   - Supabase dashboard for schema management
   - SQL migrations for schema changes
   - RLS policies for security

4. **Deployment**
   - Successfully deployed to Vercel
   - Live at [www.auralearn.academy](https://www.auralearn.academy)
   - Git push triggers automatic Vercel builds
   - Automatic environment variable configuration
   - Zero-downtime deployments

### **Performance Optimizations**

- **Server Components**: Default to server-side rendering for better performance
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component (when used)
- **API Route Caching**: TanStack Query caching strategy
- **Database Indexing**: Supabase automatic indexing

### **Scalability Considerations**

- **Serverless Functions**: Vercel automatically scales API routes
- **Database**: Supabase handles connection pooling and scaling
- **CDN**: Vercel Edge Network for static assets
- **Real-time**: LiveKit Cloud for scalable voice agent infrastructure

---

## 📊 Tech Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 16 | Full-stack React framework |
| **Language** | TypeScript | Type safety |
| **UI Library** | React 18 | Component framework |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | shadcn/ui + Radix UI | Accessible UI components |
| **Database** | Supabase (PostgreSQL) | Backend database |
| **Auth** | Clerk | User authentication |
| **AI** | Gemini, OpenAI, Mistral, Blackbox | AI-powered features |
| **Real-time** | LiveKit | Voice agent platform |
| **State** | TanStack Query + Context | Data fetching & state |
| **Forms** | React Hook Form + Zod | Form handling |
| **i18n** | i18next | Internationalization |
| **Charts** | Recharts | Data visualization |
| **Deployment** | Vercel | Hosting platform |

---

## 🎯 Key Achievements

✅ **Single Application**: No separate backend server needed  
✅ **Type Safety**: Full TypeScript coverage  
✅ **Security**: All secrets kept server-side  
✅ **Scalability**: Serverless architecture ready for scale  
✅ **Developer Experience**: Fast development with hot reload  
✅ **Production Deployed**: Successfully deployed and live at [www.auralearn.academy](https://www.auralearn.academy)  

---

## 📝 Notes

- The application was migrated from a Vite.js + React Router setup
- All API routes are built into Next.js (no Express server)
- Environment variables use `NEXT_PUBLIC_` prefix for client-side access
- Server-side API keys are never exposed to the browser
- The project follows Next.js 16 App Router conventions

