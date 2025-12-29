import { prisma } from '@/lib/prisma';
import { UserPreferences } from '@/hooks/useUserPreferences';
import { TaskSummary, SummaryEmailData, generateSummaryEmailTemplate } from './templates';

export interface SummaryServiceOptions {
  userId: string;
  tenantId: string;
  frequency: 'daily' | 'weekly';
  userTimezone: string;
  preferences: UserPreferences;
}

/**
 * Service for generating task summary email data
 */
export class SummaryService {
  /**
   * Generate summary email data for a user
   */
  static async generateSummaryData(options: SummaryServiceOptions): Promise<SummaryEmailData> {
    const { userId, tenantId, frequency, userTimezone, preferences } = options;

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userName = user.name || user.email.split('@')[0];

    // Calculate date ranges based on frequency and timezone
    const now = new Date();
    const { focusStart, focusEnd, upcomingStart, upcomingEnd, completedStart, completedEnd } = 
      this.calculateDateRanges(now, frequency, userTimezone);

    // Fetch tasks in parallel for better performance
    const [focusTasks, upcomingTasks, completedTasks] = await Promise.all([
      this.getFocusTasks(tenantId, userId, focusStart, focusEnd, preferences),
      this.getUpcomingTasks(tenantId, userId, upcomingStart, upcomingEnd, preferences),
      this.getCompletedTasks(tenantId, userId, completedStart, completedEnd, preferences)
    ]);

    return {
      userName,
      focusTasks,
      upcomingTasks,
      completedTasks,
      frequency,
      preferences
    };
  }

  /**
   * Calculate date ranges for different task categories
   */
  private static calculateDateRanges(now: Date, frequency: 'daily' | 'weekly', timezone: string) {
    // Convert to user's timezone
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    if (frequency === 'daily') {
      // Focus: overdue + today
      const todayStart = new Date(userNow);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(userNow);
      todayEnd.setHours(23, 59, 59, 999);

      // Upcoming: tomorrow
      const tomorrowStart = new Date(todayEnd);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Completed: yesterday
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayStart);
      yesterdayEnd.setMilliseconds(-1);

      return {
        focusStart: new Date('1970-01-01'), // Include all overdue
        focusEnd: todayEnd,
        upcomingStart: tomorrowStart,
        upcomingEnd: tomorrowEnd,
        completedStart: yesterdayStart,
        completedEnd: yesterdayEnd
      };
    } else {
      // Weekly frequency
      const weekStart = new Date(userNow);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // End of current week (Saturday)
      weekEnd.setHours(23, 59, 59, 999);

      // Next week
      const nextWeekStart = new Date(weekEnd);
      nextWeekStart.setDate(nextWeekStart.getDate() + 1);
      nextWeekStart.setHours(0, 0, 0, 0);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
      nextWeekEnd.setHours(23, 59, 59, 999);

      // Last week
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(weekStart);
      lastWeekEnd.setMilliseconds(-1);

      return {
        focusStart: new Date('1970-01-01'), // Include all overdue
        focusEnd: weekEnd,
        upcomingStart: nextWeekStart,
        upcomingEnd: nextWeekEnd,
        completedStart: lastWeekStart,
        completedEnd: lastWeekEnd
      };
    }
  }

  /**
   * Get focus tasks (overdue + current period)
   */
  private static async getFocusTasks(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    preferences: UserPreferences
  ): Promise<TaskSummary[]> {
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        userId,
        status: 'active',
        OR: [
          // Overdue tasks
          {
            dueDate: {
              lt: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          // Tasks due in current period
          {
            dueDate: {
              gte: startDate,
              lte: endDate
            }
          }
        ]
      },
      include: {
        project: { select: { name: true } },
        context: { select: { name: true } },
        area: { select: { name: true } }
      },
      orderBy: this.buildOrderBy(preferences.taskSorting)
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      projectName: task.project?.name,
      contextName: task.context?.name,
      areaName: task.area?.name
    }));
  }

  /**
   * Get upcoming tasks (next period)
   */
  private static async getUpcomingTasks(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    preferences: UserPreferences
  ): Promise<TaskSummary[]> {
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        userId,
        status: 'active',
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        project: { select: { name: true } },
        context: { select: { name: true } },
        area: { select: { name: true } }
      },
      orderBy: this.buildOrderBy(preferences.taskSorting)
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      projectName: task.project?.name,
      contextName: task.context?.name,
      areaName: task.area?.name
    }));
  }

  /**
   * Get completed tasks (last period)
   */
  private static async getCompletedTasks(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    preferences: UserPreferences
  ): Promise<TaskSummary[]> {
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        userId,
        status: 'completed',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        project: { select: { name: true } },
        context: { select: { name: true } },
        area: { select: { name: true } }
      },
      orderBy: { completedAt: 'desc' }
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      projectName: task.project?.name,
      contextName: task.context?.name,
      areaName: task.area?.name
    }));
  }

  /**
   * Build Prisma orderBy clause from user preferences
   */
  private static buildOrderBy(taskSorting?: UserPreferences['taskSorting']) {
    if (!taskSorting) {
      return [
        { priority: 'desc' as const },
        { dueDate: 'asc' as const },
        { title: 'asc' as const }
      ];
    }

    const orderBy: any[] = [];

    // Primary sort
    if (taskSorting.primary) {
      const field = taskSorting.primary === 'created' ? 'createdAt' : taskSorting.primary;
      orderBy.push({ [field]: taskSorting.primaryOrder || 'asc' });
    }

    // Secondary sort
    if (taskSorting.secondary && taskSorting.secondary !== taskSorting.primary) {
      const field = taskSorting.secondary === 'created' ? 'createdAt' : taskSorting.secondary;
      orderBy.push({ [field]: taskSorting.secondaryOrder || 'asc' });
    }

    // Tertiary sort
    if (taskSorting.tertiary && 
        taskSorting.tertiary !== taskSorting.primary && 
        taskSorting.tertiary !== taskSorting.secondary) {
      const field = taskSorting.tertiary === 'created' ? 'createdAt' : taskSorting.tertiary;
      orderBy.push({ [field]: taskSorting.tertiaryOrder || 'asc' });
    }

    return orderBy.length > 0 ? orderBy : [
      { priority: 'desc' as const },
      { dueDate: 'asc' as const },
      { title: 'asc' as const }
    ];
  }

  /**
   * Generate complete summary email template
   */
  static async generateSummaryEmail(options: SummaryServiceOptions) {
    const summaryData = await this.generateSummaryData(options);
    return generateSummaryEmailTemplate(summaryData);
  }
}