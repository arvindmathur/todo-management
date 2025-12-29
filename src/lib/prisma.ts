import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Production-optimized Prisma configuration with proper connection pooling
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // Connection pool configuration for production scalability
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

// Enhanced connection management for serverless with connection pooling
let isConnected = false;
let connectionPromise: Promise<void> | null = null;
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

// Connection pool monitoring with environment-specific limits
let activeConnections = 0;
const MAX_CONNECTIONS = process.env.NODE_ENV === 'production' ? 3 : 8; // Reduced for production to account for shared database

// Environment-specific connection tracking
const ENVIRONMENT_ID = process.env.VERCEL ? 'vercel' : 'local';
const CONNECTION_PREFIX = `${ENVIRONMENT_ID}-${process.pid || 'unknown'}`;

// Function to ensure connection is established with connection pooling
export async function ensureDatabaseConnection(): Promise<void> {
  const now = Date.now();
  
  // Return existing connection promise if one is in progress
  if (connectionPromise) {
    return connectionPromise;
  }
  
  // Check if we have a recent healthy connection
  if (isConnected && (now - lastConnectionCheck) < CONNECTION_CHECK_INTERVAL) {
    return;
  }
  
  connectionPromise = (async () => {
    try {
      // Check if we're at connection limit
      if (activeConnections >= MAX_CONNECTIONS) {
        console.warn(`[${CONNECTION_PREFIX}] Connection limit reached (${activeConnections}/${MAX_CONNECTIONS}), waiting...`);
        // Wait for a connection to be released with exponential backoff
        const waitTime = Math.min(100 * Math.pow(2, activeConnections - MAX_CONNECTIONS), 1000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      if (!isConnected) {
        activeConnections++;
        await prisma.$connect();
        isConnected = true;
        console.log(`[${CONNECTION_PREFIX}] Database connected (${activeConnections}/${MAX_CONNECTIONS} active connections)`);
      }
      
      // Verify connection health with timeout
      const healthCheckPromise = prisma.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      );
      
      await Promise.race([healthCheckPromise, timeoutPromise]);
      lastConnectionCheck = now;
    } catch (error) {
      isConnected = false;
      if (activeConnections > 0) activeConnections--;
      console.error(`[${CONNECTION_PREFIX}] Failed to connect to database:`, error);
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();
  
  return connectionPromise;
}

// Function to safely disconnect with connection pool management
export async function disconnectDatabase(): Promise<void> {
  if (isConnected) {
    try {
      await prisma.$disconnect();
      isConnected = false;
      if (activeConnections > 0) activeConnections--;
      console.log(`[${CONNECTION_PREFIX}] Database disconnected (${activeConnections}/${MAX_CONNECTIONS} active connections)`);
    } catch (error) {
      console.warn(`[${CONNECTION_PREFIX}] Error during database disconnect:`, error);
    }
  }
}

// Connection health check with pool monitoring
export async function checkDatabaseHealth(): Promise<{ 
  healthy: boolean; 
  timestamp: string; 
  error?: string;
  connectionPool?: {
    active: number;
    max: number;
    utilization: number;
    environment: string;
  };
}> {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    
    return { 
      healthy: true, 
      timestamp: new Date().toISOString(),
      connectionPool: {
        active: activeConnections,
        max: MAX_CONNECTIONS,
        utilization: Math.round((activeConnections / MAX_CONNECTIONS) * 100),
        environment: CONNECTION_PREFIX
      }
    };
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      connectionPool: {
        active: activeConnections,
        max: MAX_CONNECTIONS,
        utilization: Math.round((activeConnections / MAX_CONNECTIONS) * 100),
        environment: CONNECTION_PREFIX
      }
    };
  }
}

// Connection pool cleanup function
export async function cleanupConnectionPool(): Promise<void> {
  console.log(`[${CONNECTION_PREFIX}] Cleaning up connection pool...`);
  await disconnectDatabase();
  activeConnections = 0;
  isConnected = false;
  lastConnectionCheck = 0;
}

// Enhanced graceful shutdown handling with connection pool cleanup
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, performing graceful shutdown...`);
  await cleanupConnectionPool();
  process.exit(0);
};

process.on('beforeExit', async () => {
  await cleanupConnectionPool();
});

process.on('SIGINT', gracefulShutdown.bind(null, 'SIGINT'));
process.on('SIGTERM', gracefulShutdown.bind(null, 'SIGTERM'));

// Handle unhandled promise rejections with connection cleanup
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Clean up connections on unhandled rejections
  if (reason && typeof reason === 'object' && 'code' in reason) {
    const errorCode = (reason as any).code;
    if (errorCode === 'P1001' || errorCode === 'P1008' || errorCode === 'P1017') {
      console.log('Database connection error detected, cleaning up pool...');
      await cleanupConnectionPool();
    }
  }
});

// Serverless function timeout handler with connection management
if (process.env.VERCEL) {
  // Set up a timeout to disconnect before Vercel function timeout
  const FUNCTION_TIMEOUT = 8000; // 8 seconds (reduced for faster cleanup)
  
  setTimeout(async () => {
    console.log('Function timeout approaching, cleaning up connections...');
    await cleanupConnectionPool();
  }, FUNCTION_TIMEOUT);
}

// Export connection pool statistics
export function getConnectionPoolStats() {
  return {
    active: activeConnections,
    max: MAX_CONNECTIONS,
    utilization: Math.round((activeConnections / MAX_CONNECTIONS) * 100),
    isConnected,
    lastCheck: lastConnectionCheck,
    timeSinceLastCheck: Date.now() - lastConnectionCheck,
    environment: CONNECTION_PREFIX
  };
}