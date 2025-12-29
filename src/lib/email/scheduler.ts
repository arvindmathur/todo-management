import { prisma } from '@/lib/prisma';
import { UserPreferences } from '@/hooks/useUserPreferences';

export interface ScheduleOptions {
  userId: string;
  tenantId: string;
  type: 'summary' | 'reminder';
  frequency?: 'daily' | 'weekly';
  taskId?: string;
  scheduledFor: Date;
  userTimezone: string;
}

/**
 * Service for scheduling email notifications
 */
export class NotificationScheduler {
  /**
   * Schedule a summary email notification
   */
  static async scheduleSummaryEmail(
    userId: string,
    tenantId: string,
    frequency: 'daily' | 'weekly',
    userTimezone: string
  ): Promise<string> {
    // Calculate next 6am in user's timezone
    const scheduledFor = this.calculateNext6AM(userTimezone, frequency);

    const notification = await prisma.emailNotification.create({
      data: {
        tenantId,
        userId,
        type: 'summary',
        frequency,
        scheduledFor,
        status: 'pending'
      }
    });

    return notification.id;
  }

  /**
   * Schedule a task reminder email
   */
  static async scheduleTaskReminder(
    userId: string,
    tenantId: string,
    taskId: string,
    dueDate: Date,
    reminderDays: number,
    userTimezone: string
  ): Promise<string> {
    // Calculate reminder date (reminderDays before due date at 6am user time)
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);
    
    // Set to 6am in user's timezone
    const scheduledFor = this.setTo6AM(reminderDate, userTimezone);

    // Don't schedule if the reminder time has already passed
    if (scheduledFor <= new Date()) {
      throw new Error('Reminder time has already passed');
    }

    const notification = await prisma.emailNotification.create({
      data: {
        tenantId,
        userId,
        type: 'reminder',
        taskId,
        scheduledFor,
        status: 'pending'
      }
    });

    return notification.id;
  }

  /**
   * Cancel notifications for a specific task
   */
  static async cancelTaskNotifications(taskId: string): Promise<number> {
    const result = await prisma.emailNotification.updateMany({
      where: {
        taskId,
        status: 'pending'
      },
      data: {
        status: 'cancelled'
      }
    });

    return result.count;
  }

  /**
   * Cancel all pending notifications for a user
   */
  static async cancelUserNotifications(userId: string, type?: 'summary' | 'reminder'): Promise<number> {
    const where: any = {
      userId,
      status: 'pending'
    };

    if (type) {
      where.type = type;
    }

    const result = await prisma.emailNotification.updateMany({
      where,
      data: {
        status: 'cancelled'
      }
    });

    return result.count;
  }

  /**
   * Reschedule summary emails for a user (when preferences change)
   */
  static async rescheduleSummaryEmails(
    userId: string,
    tenantId: string,
    preferences: UserPreferences
  ): Promise<void> {
    // Cancel existing summary notifications
    await this.cancelUserNotifications(userId, 'summary');

    // Schedule new ones if enabled
    if (preferences.emailNotifications?.summaryEnabled && preferences.notifications?.email) {
      const frequency = preferences.emailNotifications.summaryFrequency;
      const timezone = preferences.timezone || 'UTC';

      await this.scheduleSummaryEmail(userId, tenantId, frequency, timezone);
    }
  }

  /**
   * Update task reminder when task is modified
   */
  static async updateTaskReminder(
    taskId: string,
    userId: string,
    tenantId: string,
    dueDate: Date | null,
    reminderEnabled: boolean,
    reminderDays: number,
    userTimezone: string
  ): Promise<void> {
    // Cancel existing reminders for this task
    await this.cancelTaskNotifications(taskId);

    // Schedule new reminder if enabled and has due date
    if (reminderEnabled && dueDate) {
      try {
        await this.scheduleTaskReminder(userId, tenantId, taskId, dueDate, reminderDays, userTimezone);
      } catch (error) {
        // Ignore if reminder time has passed
        console.log(`Could not schedule reminder for task ${taskId}: ${error}`);
      }
    }
  }

  /**
   * Get pending notifications ready to be sent
   */
  static async getPendingNotifications(limit: number = 100): Promise<Array<{
    id: string;
    tenantId: string;
    userId: string;
    type: 'summary' | 'reminder';
    frequency?: string;
    taskId?: string;
    scheduledFor: Date;
    user: {
      name: string | null;
      email: string;
      preferences: any;
      timezone?: string;
    };
    task?: {
      id: string;
      title: string;
      description: string | null;
      priority: string;
      dueDate: Date | null;
      project?: { name: string } | null;
      context?: { name: string } | null;
      area?: { name: string } | null;
    } | null;
  }>> {
    const now = new Date();

    const notifications = await prisma.emailNotification.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: now
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            preferences: true
          }
        },
        // Include task details for reminder emails
        ...(await this.getTaskInclude())
      },
      orderBy: {
        scheduledFor: 'asc'
      },
      take: limit
    });

    // Transform the result to match the expected type
    return notifications.map(notification => ({
      id: notification.id,
      tenantId: notification.tenantId,
      userId: notification.userId,
      type: notification.type as 'summary' | 'reminder',
      frequency: notification.frequency || undefined,
      taskId: notification.taskId || undefined,
      scheduledFor: notification.scheduledFor,
      user: {
        name: notification.user.name,
        email: notification.user.email,
        preferences: notification.user.preferences,
        timezone: undefined // Will be extracted from preferences if needed
      },
      task: notification.task || undefined
    }));
  }

  /**
   * Mark notification as being processed
   */
  static async markAsProcessing(notificationId: string): Promise<void> {
    await prisma.emailNotification.update({
      where: { id: notificationId },
      data: { 
        status: 'processing',
        updatedAt: new Date()
      }
    });
  }

  /**
   * Calculate next 6am in user's timezone
   */
  private static calculateNext6AM(userTimezone: string, frequency: 'daily' | 'weekly'): Date {
    const now = new Date();
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    
    let nextSchedule = new Date(userNow);
    nextSchedule.setHours(6, 0, 0, 0);

    if (frequency === 'daily') {
      // If it's already past 6am today, schedule for tomorrow
      if (userNow.getHours() >= 6) {
        nextSchedule.setDate(nextSchedule.getDate() + 1);
      }
    } else {
      // Weekly: schedule for next Monday at 6am
      const daysUntilMonday = (1 - nextSchedule.getDay() + 7) % 7;
      if (daysUntilMonday === 0 && userNow.getHours() >= 6) {
        // If it's Monday and past 6am, schedule for next Monday
        nextSchedule.setDate(nextSchedule.getDate() + 7);
      } else {
        nextSchedule.setDate(nextSchedule.getDate() + daysUntilMonday);
      }
    }

    // Convert back to UTC for storage
    return new Date(nextSchedule.toLocaleString('en-US', { timeZone: 'UTC' }));
  }

  /**
   * Set a date to 6am in user's timezone
   */
  private static setTo6AM(date: Date, userTimezone: string): Date {
    const userDate = new Date(date.toLocaleString('en-US', { timeZone: userTimezone }));
    userDate.setHours(6, 0, 0, 0);
    
    // Convert back to UTC for storage
    return new Date(userDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  }

  /**
   * Get task include configuration for Prisma queries
   */
  private static async getTaskInclude() {
    // This is a workaround for dynamic includes in Prisma
    return {
      task: {
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          dueDate: true,
          project: {
            select: { name: true }
          },
          context: {
            select: { name: true }
          },
          area: {
            select: { name: true }
          }
        }
      }
    };
  }

  /**
   * Clean up old notifications (completed, failed, cancelled)
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.emailNotification.deleteMany({
      where: {
        OR: [
          { status: 'sent', sentAt: { lt: cutoffDate } },
          { status: 'failed', updatedAt: { lt: cutoffDate } },
          { status: 'cancelled', updatedAt: { lt: cutoffDate } }
        ]
      }
    });

    return result.count;
  }

  /**
   * Get notification statistics for admin dashboard
   */
  static async getNotificationStats(): Promise<{
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    totalToday: number;
    failureRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [pending, sent, failed, cancelled, totalToday] = await Promise.all([
      prisma.emailNotification.count({ where: { status: 'pending' } }),
      prisma.emailNotification.count({ where: { status: 'sent' } }),
      prisma.emailNotification.count({ where: { status: 'failed' } }),
      prisma.emailNotification.count({ where: { status: 'cancelled' } }),
      prisma.emailNotification.count({
        where: {
          createdAt: { gte: today, lt: tomorrow }
        }
      })
    ]);

    const total = sent + failed;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    return {
      pending,
      sent,
      failed,
      cancelled,
      totalToday,
      failureRate: Math.round(failureRate * 100) / 100
    };
  }
}