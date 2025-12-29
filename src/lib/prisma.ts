import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Optimized Prisma configuration for Vercel serverless
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // Connection pool configuration for better connection management
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Logging configuration
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Error formatting
  errorFormat: 'minimal',
});

// Ensure single instance in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});