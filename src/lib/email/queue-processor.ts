import { getEmailService } from './email-service';
import { NotificationScheduler } from './scheduler';
import { SummaryService } from './summary-service';
import { generateReminderEmailTemplate } from './templates';
import { UserPreferences } from '@/hooks/useUserPreferences';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';

export interface ProcessingStats {
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Email queue processor for background job processing
 */
export class EmailQueueProcessor {
  private emailService = getEmailService();
  private isProcessing = false;
  private processingStats: ProcessingStats = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: []
  };

  /**
   * Process pending email notifications
   */
  async processPendingEmails(batchSize: number = 50): Promise<ProcessingStats> {
    if (this.isProcessing) {
      console.log('Email processing already in progress, skipping...');
      return this.processingStats;
    }

    this.isProcessing = true;
    this.resetStats();

    try {
      console.log(`Starting email processing batch (size: ${batchSize})`);
      
      // Get pending notifications
      const notifications = await NotificationScheduler.getPendingNotifications(batchSize);
      
      if (notifications.length === 0) {
        console.log('No pending notifications to process');
        return this.processingStats;
      }

      console.log(`Processing ${notifications.length} notifications`);

      // Process notifications with rate limiting
      for (const notification of notifications) {
        await this.processNotification(notification);
        
        // Add small delay between emails to avoid overwhelming SMTP server
        await this.delay(100);
      }

      console.log(`Email processing completed. Stats:`, this.processingStats);
      return this.processingStats;

    } catch (error) {
      console.error('Email processing error:', error);
      this.processingStats.errors.push(
        error instanceof Error ? error.message : 'Unknown processing error'
      );
      return this.processingStats;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single notification
   */
  private async processNotification(notification: any): Promise<void> {
    try {
      // Mark as processing
      await NotificationScheduler.markAsProcessing(notification.id);
      
      const userPreferences = this.parseUserPreferences(notification.user.preferences);
      
      // Check if user still has email notifications enabled
      if (!userPreferences.notifications?.email) {
        console.log(`Skipping notification ${notification.id} - user has disabled email notifications`);
        await this.markAsCancelled(notification.id);
        return;
      }

      let template;
      
      if (notification.type === 'summary') {
        // Check if summary emails are still enabled
        if (!userPreferences.emailNotifications?.summaryEnabled) {
          console.log(`Skipping summary notification ${notification.id} - user has disabled summary emails`);
          await this.markAsCancelled(notification.id);
          return;
        }

        template = await this.generateSummaryEmail(notification, userPreferences);
      } else if (notification.type === 'reminder') {
        // Check if reminders are still enabled
        if (!userPreferences.emailNotifications?.remindersEnabled) {
          console.log(`Skipping reminder notification ${notification.id} - user has disabled reminders`);
          await this.markAsCancelled(notification.id);
          return;
        }

        template = await this.generateReminderEmail(notification, userPreferences);
      } else {
        throw new Error(`Unknown notification type: ${notification.type}`);
      }

      // Send email
      const result = await this.emailService.sendEmail(
        notification.user.email,
        template,
        {
          notificationId: notification.id
        }
      );

      if (result.success) {
        this.processingStats.sent++;
        console.log(`✅ Sent ${notification.type} email to ${notification.user.email}`);
      } else {
        this.processingStats.failed++;
        this.processingStats.errors.push(`Failed to send to ${notification.user.email}: ${result.error}`);
        console.error(`❌ Failed to send ${notification.type} email to ${notification.user.email}: ${result.error}`);
      }

      this.processingStats.processed++;

    } catch (error) {
      this.processingStats.failed++;
      this.processingStats.processed++;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.processingStats.errors.push(`Notification ${notification.id}: ${errorMessage}`);
      
      console.error(`❌ Error processing notification ${notification.id}:`, error);
      
      // Mark as failed in database
      await this.markAsFailed(notification.id, errorMessage);
    }
  }

  /**
   * Generate summary email template
   */
  private async generateSummaryEmail(notification: any, preferences: UserPreferences) {
    const frequency = notification.frequency as 'daily' | 'weekly';
    const timezone = preferences.timezone || 'UTC';

    return await SummaryService.generateSummaryEmail({
      userId: notification.userId,
      tenantId: notification.tenantId,
      frequency,
      userTimezone: timezone,
      preferences
    });
  }

  /**
   * Generate reminder email template
   */
  private async generateReminderEmail(notification: any, preferences: UserPreferences) {
    if (!notification.task) {
      throw new Error('Task not found for reminder notification');
    }

    const task = notification.task;
    const userName = notification.user.name || notification.user.email.split('@')[0];
    
    // Calculate days until due
    const daysUntilDue = task.dueDate 
      ? Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return generateReminderEmailTemplate({
      userName,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        projectName: task.project?.name,
        contextName: task.context?.name,
        areaName: task.area?.name
      },
      daysUntilDue,
      preferences
    });
  }

  /**
   * Parse user preferences with fallback to defaults
   */
  private parseUserPreferences(preferencesJson: any): UserPreferences {
    try {
      const preferences = typeof preferencesJson === 'string' 
        ? JSON.parse(preferencesJson) 
        : preferencesJson || {};
      
      // Merge with defaults to ensure all required fields exist
      return {
        ...DEFAULT_PREFERENCES,
        ...preferences,
        notifications: {
          ...DEFAULT_PREFERENCES.notifications,
          ...preferences.notifications
        },
        emailNotifications: {
          ...DEFAULT_PREFERENCES.emailNotifications,
          ...preferences.emailNotifications
        }
      };
    } catch (error) {
      console.warn('Failed to parse user preferences, using defaults:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Mark notification as cancelled
   */
  private async markAsCancelled(notificationId: string): Promise<void> {
    try {
      await NotificationScheduler.cancelTaskNotifications(notificationId);
    } catch (error) {
      console.error(`Failed to mark notification ${notificationId} as cancelled:`, error);
    }
  }

  /**
   * Mark notification as failed
   */
  private async markAsFailed(notificationId: string, errorMessage: string): Promise<void> {
    try {
      // This would be handled by the email service, but we can add additional logging here
      console.error(`Notification ${notificationId} failed: ${errorMessage}`);
    } catch (error) {
      console.error(`Failed to mark notification ${notificationId} as failed:`, error);
    }
  }

  /**
   * Reset processing statistics
   */
  private resetStats(): void {
    this.processingStats = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Add delay between operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current processing status
   */
  getProcessingStatus(): {
    isProcessing: boolean;
    stats: ProcessingStats;
  } {
    return {
      isProcessing: this.isProcessing,
      stats: { ...this.processingStats }
    };
  }

  /**
   * Test email configuration by sending a test email
   */
  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    try {
      const template = {
        subject: 'Test Email from Todo Management App',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p>If you received this email, your email notifications are set up properly!</p>
        `,
        text: 'Test Email\n\nThis is a test email to verify your email configuration is working correctly.\n\nIf you received this email, your email notifications are set up properly!'
      };

      const result = await this.emailService.sendEmail(to, template);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
let queueProcessorInstance: EmailQueueProcessor | null = null;

export function getEmailQueueProcessor(): EmailQueueProcessor {
  if (!queueProcessorInstance) {
    queueProcessorInstance = new EmailQueueProcessor();
  }
  return queueProcessorInstance;
}