#!/usr/bin/env node

/**
 * Email processing cron job script
 * 
 * This script should be run periodically (e.g., every 5-10 minutes) to process
 * pending email notifications.
 * 
 * Usage:
 *   node scripts/process-emails.js
 * 
 * Environment variables required:
 *   - CRON_SECRET: Secret token for API authentication
 *   - NEXT_PUBLIC_APP_URL: Base URL of the application
 */

const https = require('https');
const http = require('http');

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-token';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function processEmails() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/email/process', APP_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EmailProcessor/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('✅ Email processing completed successfully');
            console.log('Stats:', result.stats);
            resolve(result);
          } else {
            console.error('❌ Email processing failed:', result.error);
            reject(new Error(result.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('❌ Failed to parse response:', error.message);
          console.error('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.setTimeout(30000, () => {
      console.error('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function getProcessingStatus() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/email/process', APP_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'EmailProcessor/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Unknown error'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function main() {
  const command = process.argv[2] || 'process';

  console.log(`📧 Email Processor - ${new Date().toISOString()}`);
  console.log(`Command: ${command}`);
  console.log(`App URL: ${APP_URL}`);

  try {
    if (command === 'status') {
      console.log('📊 Getting processing status...');
      const status = await getProcessingStatus();
      console.log('Processing Status:', status.processingStatus);
      console.log('Notification Stats:', status.notificationStats);
    } else {
      console.log('🚀 Starting email processing...');
      const result = await processEmails();
      
      if (result.stats.processed > 0) {
        console.log(`📨 Processed ${result.stats.processed} notifications`);
        console.log(`✅ Sent: ${result.stats.sent}`);
        console.log(`❌ Failed: ${result.stats.failed}`);
        
        if (result.stats.errors.length > 0) {
          console.log('Errors:');
          result.stats.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
          });
        }
      } else {
        console.log('📭 No pending notifications to process');
      }

      if (result.stats.cleanedUp > 0) {
        console.log(`🧹 Cleaned up ${result.stats.cleanedUp} old notifications`);
      }
    }

    console.log('✅ Email processor completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Email processor failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});