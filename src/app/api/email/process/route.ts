import { NextRequest, NextResponse } from "next/server";
import { getEmailQueueProcessor } from "@/lib/email/queue-processor";
import { NotificationScheduler } from "@/lib/email/scheduler";

/**
 * API endpoint for processing pending email notifications
 * This should be called by a cron job or scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (you might want to add API key authentication)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log('Starting email notification processing...');

    // Get the queue processor
    const processor = getEmailQueueProcessor();

    // Process pending emails
    const stats = await processor.processPendingEmails(50); // Process up to 50 emails

    // Clean up old notifications (older than 30 days)
    const cleanedUp = await NotificationScheduler.cleanupOldNotifications(30);

    console.log('Email processing completed:', {
      ...stats,
      cleanedUp
    });

    return NextResponse.json({
      success: true,
      message: "Email processing completed",
      stats: {
        ...stats,
        cleanedUp
      }
    });

  } catch (error) {
    console.error('Email processing error:', error);
    
    return NextResponse.json(
      { 
        error: "Email processing failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get email processing status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const processor = getEmailQueueProcessor();
    const status = processor.getProcessingStatus();
    const notificationStats = await NotificationScheduler.getNotificationStats();

    return NextResponse.json({
      processingStatus: status,
      notificationStats
    });

  } catch (error) {
    console.error('Error getting email processing status:', error);
    
    return NextResponse.json(
      { 
        error: "Failed to get status",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}