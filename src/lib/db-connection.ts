import { prisma } from './prisma';

// Database connection utilities with retry logic and timeout handling
export class DatabaseConnection {
  private static readonly MAX_RETRIES = 3;
  private static readonly TIMEOUT_MS = 10000; // 10 seconds
  private static readonly RETRY_DELAY_MS = 1000; // 1 second

  /**
   * Execute a database operation with retry logic and timeout handling
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'database operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Add timeout to the operation
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(operationName)
        ]);

        return result;
      } catch (error) {
        lastError = error as Error;
        
        console.warn(`${operationName} attempt ${attempt} failed:`, error);

        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY_MS * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed
    throw new Error(`${operationName} failed after ${this.MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Check database connection health
   */
  static async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.withRetry(
        () => prisma.$queryRaw`SELECT 1`,
        'health check'
      );
      
      const latency = Date.now() - startTime;
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Ensure database connection is ready
   */
  static async ensureConnection(): Promise<void> {
    try {
      await this.withRetry(
        () => prisma.$connect(),
        'database connection'
      );
    } catch (error) {
      console.error('Failed to establish database connection:', error);
      throw error;
    }
  }

  /**
   * Gracefully disconnect from database
   */
  static async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.warn('Error during database disconnect:', error);
    }
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
    
    // Don't retry on authentication/authorization errors
    if (errorMessage.includes('authentication') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('permission denied')) {
      return true;
    }

    // Don't retry on validation errors
    if (errorMessage.includes('validation') ||
        errorMessage.includes('constraint') ||
        errorMessage.includes('unique')) {
      return true;
    }

    // Don't retry on syntax errors
    if (errorMessage.includes('syntax error') ||
        errorMessage.includes('invalid query')) {
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
}

// Export a wrapper function for common database operations
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<T> {
  return DatabaseConnection.withRetry(operation, operationName);
}