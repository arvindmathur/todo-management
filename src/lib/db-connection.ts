import { prisma, ensureDatabaseConnection, checkDatabaseHealth, cleanupConnectionPool } from './prisma';

// Database connection utilities with enhanced retry logic and connection pool management
export class DatabaseConnection {
  private static readonly MAX_RETRIES = 3;
  private static readonly TIMEOUT_MS = 6000; // Reduced to 6 seconds for faster failure
  private static readonly RETRY_DELAY_MS = 300; // Reduced initial delay
  private static readonly CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds
  
  private static lastHealthCheck = 0;
  private static isHealthy = true;
  private static operationQueue: Array<() => Promise<any>> = [];
  private static isProcessingQueue = false;

  /**
   * Execute a database operation with enhanced retry logic and connection pool management
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'database operation'
  ): Promise<T> {
    // Queue operations to prevent connection pool exhaustion
    return this.queueOperation(async () => {
      // Ensure connection is established before operation
      await this.ensureHealthyConnection();
      
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          // Add timeout to the operation with shorter timeout for faster failure
          const result = await Promise.race([
            operation(),
            this.createTimeoutPromise<T>(operationName)
          ]);

          // Reset health status on successful operation
          this.isHealthy = true;
          return result;
        } catch (error) {
          lastError = error as Error;
          
          console.warn(`${operationName} attempt ${attempt}/${this.MAX_RETRIES} failed:`, {
            error: error instanceof Error ? error.message : String(error),
            code: (error as any)?.code,
            meta: (error as any)?.meta
          });

          // Check if this is a connection-related error
          if (this.isConnectionError(error)) {
            this.isHealthy = false;
            // Clean up connection pool on connection errors
            if (this.isPoolExhaustionError(error)) {
              console.warn('Connection pool exhaustion detected, cleaning up...');
              await cleanupConnectionPool();
            }
            // Try to reconnect on connection errors
            try {
              await ensureDatabaseConnection();
            } catch (reconnectError) {
              console.warn('Failed to reconnect:', reconnectError);
            }
          }

          // Don't retry on certain types of errors
          if (this.isNonRetryableError(error)) {
            throw error;
          }

          // Wait before retrying (except on last attempt)
          if (attempt < this.MAX_RETRIES) {
            const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
            await this.delay(delay);
          }
        }
      }

      // All retries failed
      this.isHealthy = false;
      throw new Error(`${operationName} failed after ${this.MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
    });
  }

  /**
   * Queue operations to prevent connection pool exhaustion
   */
  private static async queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * Process queued operations with concurrency control
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    // Process operations with limited concurrency (reduced for shared database)
    const CONCURRENT_OPERATIONS = process.env.NODE_ENV === 'production' ? 2 : 3;
    
    while (this.operationQueue.length > 0) {
      const batch = this.operationQueue.splice(0, CONCURRENT_OPERATIONS);
      await Promise.all(batch.map(op => op().catch(console.error)));
      
      // Add small delay between batches to prevent overwhelming the database
      if (this.operationQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Enhanced health check with caching and connection pool monitoring
   */
  static async healthCheck(): Promise<{ 
    healthy: boolean; 
    latency?: number; 
    error?: string; 
    cached?: boolean;
    connectionPool?: any;
  }> {
    const now = Date.now();
    
    // Return cached result if recent
    if (now - this.lastHealthCheck < this.CONNECTION_CHECK_INTERVAL && this.isHealthy) {
      return { healthy: true, cached: true };
    }
    
    const startTime = Date.now();
    
    try {
      const healthResult = await checkDatabaseHealth();
      const latency = Date.now() - startTime;
      
      this.lastHealthCheck = now;
      this.isHealthy = healthResult.healthy;
      
      return { 
        healthy: healthResult.healthy, 
        latency,
        error: healthResult.error,
        connectionPool: healthResult.connectionPool
      };
    } catch (error) {
      this.isHealthy = false;
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Ensure database connection is ready and healthy with connection pool management
   */
  static async ensureHealthyConnection(): Promise<void> {
    const health = await this.healthCheck();
    if (!health.healthy) {
      try {
        await ensureDatabaseConnection();
        // Verify connection works
        await prisma.$queryRaw`SELECT 1`;
        this.isHealthy = true;
      } catch (error) {
        console.error('Failed to establish healthy database connection:', error);
        throw new Error('Database connection unavailable');
      }
    }
  }

  /**
   * Check if error is connection-related
   */
  private static isConnectionError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || '';
    
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('pool') ||
      errorMessage.includes('maxclientsinssessionmode') ||
      errorMessage.includes('max clients reached') ||
      errorCode === 'P1001' || // Can't reach database server
      errorCode === 'P1008' || // Operations timed out
      errorCode === 'P1017'    // Server has closed the connection
    );
  }

  /**
   * Check if error is specifically pool exhaustion
   */
  private static isPoolExhaustionError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    return (
      errorMessage.includes('maxclientsinssessionmode') ||
      errorMessage.includes('max clients reached') ||
      errorMessage.includes('connection pool exhausted') ||
      errorMessage.includes('too many connections')
    );
  }

  /**
   * Create a timeout promise that rejects after specified time
   */
  private static createTimeoutPromise<T>(operationName: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${this.TIMEOUT_MS}ms`));
      }, this.TIMEOUT_MS);
    });
  }

  /**
   * Check if an error should not be retried
   */
  private static isNonRetryableError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || '';
    
    // Don't retry on authentication/authorization errors
    if (errorMessage.includes('authentication') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('permission denied') ||
        errorCode === 'P1000') { // Authentication failed
      return true;
    }

    // Don't retry on validation errors
    if (errorMessage.includes('validation') ||
        errorMessage.includes('constraint') ||
        errorMessage.includes('unique') ||
        errorCode.startsWith('P2')) { // Prisma validation errors
      return true;
    }

    // Don't retry on syntax errors
    if (errorMessage.includes('syntax error') ||
        errorMessage.includes('invalid query') ||
        errorCode === 'P1012') { // Schema validation error
      return true;
    }

    return false;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection statistics with enhanced pool monitoring
   */
  static getConnectionStats() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      timeSinceLastCheck: Date.now() - this.lastHealthCheck,
      queueLength: this.operationQueue.length,
      isProcessingQueue: this.isProcessingQueue
    };
  }

  /**
   * Force cleanup of connection pool (emergency use)
   */
  static async forceCleanup(): Promise<void> {
    console.log('Force cleaning up database connections...');
    this.isHealthy = false;
    this.operationQueue = [];
    this.isProcessingQueue = false;
    await cleanupConnectionPool();
  }
}

// Export a wrapper function for common database operations
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<T> {
  return DatabaseConnection.withRetry(operation, operationName);
}