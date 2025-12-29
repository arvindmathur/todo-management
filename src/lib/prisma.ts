import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Optimized Prisma configuration for Vercel serverless with connection pooling
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // Connection pool configuration for Supabase Transaction Pooler
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Logging configuration
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Error formatting
  errorFormat: 'minimal',
  // Connection pool settings optimized for serverless
  __internal: {
    engine: {
      // Connection pool configuration for better resource management
      connectionLimit: 10, // Limit concurrent connections per instance
      poolTimeout: 10000, // 10 seconds timeout for getting connection from pool
      idleTimeout: 30000, // 30 seconds idle timeout
    },
  },
});

// Ensure single instance in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Enhanced connection management for serverless
let isConnected = false;

// Function to ensure connection is established
export async function ensureDatabaseConnection() {
  if (!isConnected) {
    try {
      await prisma.$connect();
      isConnected = true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }
}

// Function to safely disconnect
export async function disconnectDatabase() {
  if (isConnected) {
    try {
      await prisma.$disconnect();
      isConnected = false;
    } catch (error) {
      console.warn('Error during database disconnect:', error);
    }
  }
}

// Connection health check
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Graceful shutdown handling with improved cleanup
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, but log the error
});

// Serverless function timeout handler
if (process.env.VERCEL) {
  // Set up a timeout to disconnect before Vercel function timeout
  const FUNCTION_TIMEOUT = 10000; // 10 seconds (adjust based on your function timeout)
  
  setTimeout(async () => {
    console.log('Function timeout approaching, disconnecting database...');
    await disconnectDatabase();
  }, FUNCTION_TIMEOUT);
}