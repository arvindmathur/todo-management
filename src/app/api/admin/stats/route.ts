import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DatabaseConnection } from "@/lib/db-connection";
import { NotificationScheduler } from "@/lib/email/scheduler";

/**
 * Get admin dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await DatabaseConnection.withRetry(
      () => prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true }
      }),
      'check-admin-user'
    );

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get date ranges
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay()); // Start of week (Sunday)
    const nextWeek = new Date(thisWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get user statistics
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth
    ] = await Promise.all([
      DatabaseConnection.withRetry(
        () => prisma.user.count(),
        'count-total-users'
      ),
      DatabaseConnection.withRetry(
        () => prisma.user.count({
          where: {
            sessions: {
              some: {
                expires: { gt: now }
              }
            }
          }
        }),
        'count-active-users'
      ),
      DatabaseConnection.withRetry(
        () => prisma.user.count({
          where: {
            createdAt: { gte: today, lt: tomorrow }
          }
        }),
        'count-new-users-today'
      ),
      DatabaseConnection.withRetry(
        () => prisma.user.count({
          where: {
            createdAt: { gte: thisWeek, lt: nextWeek }
          }
        }),
        'count-new-users-week'
      ),
      DatabaseConnection.withRetry(
        () => prisma.user.count({
          where: {
            createdAt: { gte: thisMonth, lt: nextMonth }
          }
        }),
        'count-new-users-month'
      )
    ]);

    // Get task statistics
    const [
      totalTasks,
      activeTasks,
      completedTasks,
      overdueTasks,
      tasksCreatedToday,
      tasksCompletedToday
    ] = await Promise.all([
      DatabaseConnection.withRetry(
        () => prisma.task.count(),
        'count-total-tasks'
      ),
      DatabaseConnection.withRetry(
        () => prisma.task.count({ where: { status: 'active' } }),
        'count-active-tasks'
      ),
      DatabaseConnection.withRetry(
        () => prisma.task.count({ where: { status: 'completed' } }),
        'count-completed-tasks'
      ),
      DatabaseConnection.withRetry(
        () => prisma.task.count({
          where: {
            status: 'active',
            dueDate: { lt: today }
          }
        }),
        'count-overdue-tasks'
      ),
      DatabaseConnection.withRetry(
        () => prisma.task.count({
          where: {
            createdAt: { gte: today, lt: tomorrow }
          }
        }),
        'count-tasks-created-today'
      ),
      DatabaseConnection.withRetry(
        () => prisma.task.count({
          where: {
            status: 'completed',
            completedAt: { gte: today, lt: tomorrow }
          }
        }),
        'count-tasks-completed-today'
      )
    ]);

    // Get email notification statistics in parallel
    const [emailStats, usersWithEmailNotifications, recentFailedEmails] = await Promise.all([
      NotificationScheduler.getNotificationStats(),
      DatabaseConnection.withRetry(
        () => prisma.user.count({
          where: {
            preferences: {
              path: ['notifications', 'email'],
              equals: true
            }
          }
        }),
        'count-users-with-email-notifications'
      ),
      DatabaseConnection.withRetry(
        () => prisma.emailNotification.findMany({
          where: {
            status: 'failed',
            updatedAt: { gte: today }
          },
          select: {
            id: true,
            type: true,
            errorMessage: true,
            retryCount: true,
            updatedAt: true,
            user: {
              select: {
                email: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 10
        }),
        'get-recent-failed-emails'
      )
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        withEmailNotifications: usersWithEmailNotifications
      },
      tasks: {
        total: totalTasks,
        active: activeTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        createdToday: tasksCreatedToday,
        completedToday: tasksCompletedToday
      },
      emails: {
        ...emailStats,
        recentFailures: recentFailedEmails
      },
      system: {
        timestamp: now.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    
    return NextResponse.json(
      { 
        error: "Failed to get admin statistics",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}