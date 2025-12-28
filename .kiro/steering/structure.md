# Project Structure

## Root Level
- **Configuration files** - Next.js, TypeScript, Tailwind, Jest, PostCSS configs
- **Environment files** - `.env.example`, `.env.local` for environment variables
- **Database schema** - `prisma/schema.prisma` contains all data models

## Source Code Organization (`src/`)

### App Router Structure (`src/app/`)
Following Next.js 13+ App Router conventions:

- **`page.tsx`** - Route components (landing page, dashboard, etc.)
- **`layout.tsx`** - Shared layouts
- **`globals.css`** - Global styles

#### API Routes (`src/app/api/`)
RESTful API endpoints organized by resource:

- **`auth/`** - Authentication endpoints
  - `register/route.ts` - User registration
  - `reset-password/route.ts` - Password reset
  - `[...nextauth]/` - NextAuth.js configuration
- **`tasks/`** - Task management endpoints
  - `route.ts` - CRUD operations for tasks
  - `[id]/route.ts` - Individual task operations
  - `[id]/complete/route.ts` - Task completion
  - `overdue/route.ts`, `today/route.ts`, `upcoming/route.ts` - Filtered views
  - `search/route.ts` - Task search
- **`user/`** - User-related endpoints
  - `preferences/route.ts` - User preference management

#### Page Routes (`src/app/`)
- **`auth/`** - Authentication pages (signin, signup, forgot-password, reset-password)
- **`dashboard/`** - Main application pages
  - `page.tsx` - Main dashboard
  - `preferences/page.tsx` - User settings

### Shared Code (`src/`)

#### Components (`src/components/`)
- **`providers/`** - React context providers (session-provider.tsx)

#### Business Logic (`src/lib/`)
- **`auth.ts`** - NextAuth.js configuration and authentication logic
- **`prisma.ts`** - Database client initialization
- **`tasks.ts`** - Task-related business logic
- **`preferences.ts`** - User preference utilities

#### Custom Hooks (`src/hooks/`)
- **`useTasks.ts`** - Task data fetching and mutations
- **`useTaskViews.ts`** - Task filtering and view logic
- **`useUserPreferences.ts`** - User preference management

#### Type Definitions (`src/types/`)
- **`task.ts`** - Task-related TypeScript interfaces
- **`next-auth.d.ts`** - NextAuth.js type extensions

#### Middleware (`src/middleware.ts`)
- Route protection and authentication middleware

## Key Conventions

### Multi-tenant Architecture
- All data models include `tenantId` for tenant isolation
- User authentication includes tenant context
- API routes filter by tenant automatically

### Database Models (Prisma)
- **User** - Authentication and tenant management
- **Task** - Core task entity with GTD support
- **Project** - Task grouping with outcomes
- **Context** - GTD contexts (@calls, @computer, etc.)
- **Area** - Life areas (Work, Personal, etc.)
- **InboxItem** - GTD inbox processing

### API Route Patterns
- Use Next.js App Router `route.ts` files
- RESTful conventions (GET, POST, PUT, DELETE)
- Consistent error handling and response formats
- Tenant-aware data filtering

### Import Aliases
- Use `@/` prefix for all src imports (e.g., `@/lib/prisma`)
- Keeps imports clean and relocatable