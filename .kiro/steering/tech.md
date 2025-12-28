# Technology Stack

## Framework & Runtime
- **Next.js 14** - React framework with App Router (experimental appDir enabled)
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment

## Database & ORM
- **PostgreSQL** - Primary database
- **Prisma 5.7** - Database ORM and query builder
- **@prisma/client** - Generated database client

## Authentication
- **NextAuth.js 4.24** - Authentication library
- **@next-auth/prisma-adapter** - Prisma adapter for NextAuth
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token handling

## Styling & UI
- **Tailwind CSS 3.3** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## Testing
- **Jest 29.7** - Testing framework
- **@testing-library/react** - React testing utilities
- **@testing-library/jest-dom** - DOM testing matchers
- **jest-environment-jsdom** - DOM environment for tests
- **fast-check** - Property-based testing

## Validation & Utilities
- **Zod** - Schema validation
- **Nodemailer** - Email sending

## Development Tools
- **ESLint** - Code linting with Next.js config
- **TypeScript 5** - Type checking

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint

# Testing
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode

# Database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma Studio
```

## Path Aliases
- `@/*` maps to `./src/*` for clean imports

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- Additional email and auth provider configs as needed