import { UserPreferences } from '@/hooks/useUserPreferences';

export interface TaskSummary {
  id: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: Date;
  projectName?: string;
  contextName?: string;
  areaName?: string;
}

export interface SummaryEmailData {
  userName: string;
  focusTasks: TaskSummary[];
  upcomingTasks: TaskSummary[];
  completedTasks: TaskSummary[];
  frequency: 'daily' | 'weekly';
  preferences: UserPreferences;
}

export interface ReminderEmailData {
  userName: string;
  task: TaskSummary;
  daysUntilDue: number;
  preferences: UserPreferences;
}

/**
 * Generate HTML email template for task summaries
 */
export function generateSummaryEmailTemplate(data: SummaryEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, focusTasks, upcomingTasks, completedTasks, frequency } = data;
  const periodLabel = frequency === 'daily' ? 'Today' : 'This Week';
  const nextPeriodLabel = frequency === 'daily' ? 'Tomorrow' : 'Next Week';
  const lastPeriodLabel = frequency === 'daily' ? 'Yesterday' : 'Last Week';

  const subject = `${periodLabel}'s Task Summary - ${focusTasks.length} tasks need your attention`;

  // Helper function to format task list
  const formatTaskList = (tasks: TaskSummary[], emptyMessage: string) => {
    if (tasks.length === 0) {
      return `<p style="color: #666; font-style: italic;">${emptyMessage}</p>`;
    }

    return tasks.map(task => {
      const priorityColor = {
        urgent: '#dc2626',
        high: '#ea580c',
        medium: '#ca8a04',
        low: '#16a34a'
      }[task.priority] || '#6b7280';

      const dueDateText = task.dueDate 
        ? `Due: ${task.dueDate.toLocaleDateString()}`
        : 'No due date';

      const contextInfo = [
        task.projectName && `📁 ${task.projectName}`,
        task.contextName && `🏷️ ${task.contextName}`,
        task.areaName && `📂 ${task.areaName}`
      ].filter(Boolean).join(' • ');

      return `
        <div style="border-left: 4px solid ${priorityColor}; padding: 12px; margin: 8px 0; background: #f9fafb; border-radius: 4px;">
          <h4 style="margin: 0 0 4px 0; color: #111827;">${task.title}</h4>
          ${task.description ? `<p style="margin: 4px 0; color: #4b5563; font-size: 14px;">${task.description}</p>` : ''}
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
            <span style="background: ${priorityColor}; color: white; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; font-weight: bold;">${task.priority}</span>
            <span style="margin-left: 12px;">${dueDateText}</span>
            ${contextInfo ? `<br><span style="margin-top: 4px; display: inline-block;">${contextInfo}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
        <h1 style="margin: 0; font-size: 24px;">📋 Task Summary</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Hello ${userName}! Here's your ${frequency} task overview.</p>
      </div>

      <!-- Focus Tasks (Overdue + Today) -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px; margin-bottom: 16px;">
          🔥 Focus Tasks (${focusTasks.length})
        </h2>
        <p style="color: #666; margin-bottom: 16px;">Tasks that need your immediate attention:</p>
        ${formatTaskList(focusTasks, 'Great job! No urgent tasks today.')}
      </div>

      <!-- Upcoming Tasks -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px;">
          📅 Upcoming (${upcomingTasks.length})
        </h2>
        <p style="color: #666; margin-bottom: 16px;">Tasks coming up ${nextPeriodLabel.toLowerCase()}:</p>
        ${formatTaskList(upcomingTasks, `No tasks scheduled for ${nextPeriodLabel.toLowerCase()}.`)}
      </div>

      <!-- Completed Tasks -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 8px; margin-bottom: 16px;">
          ✅ Completed (${completedTasks.length})
        </h2>
        <p style="color: #666; margin-bottom: 16px;">Tasks you completed ${lastPeriodLabel.toLowerCase()}:</p>
        ${formatTaskList(completedTasks, `No tasks completed ${lastPeriodLabel.toLowerCase()}.`)}
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>This email was sent from your Todo Management app.</p>
        <p>
          <a href="mailto:unsubscribe@todoapp.com?subject=Unsubscribe" style="color: #6b7280;">Unsubscribe</a> |
          <a href="/dashboard/preferences" style="color: #6b7280;">Manage Preferences</a>
        </p>
      </div>

    </body>
    </html>
  `;

  // Generate plain text version
  const text = `
${periodLabel}'s Task Summary - Hello ${userName}!

🔥 FOCUS TASKS (${focusTasks.length}) - Need immediate attention:
${focusTasks.length === 0 ? 'Great job! No urgent tasks today.' : 
  focusTasks.map(task => `• ${task.title} (${task.priority.toUpperCase()}) ${task.dueDate ? `- Due: ${task.dueDate.toLocaleDateString()}` : ''}`).join('\n')}

📅 UPCOMING (${upcomingTasks.length}) - Coming up ${nextPeriodLabel.toLowerCase()}:
${upcomingTasks.length === 0 ? `No tasks scheduled for ${nextPeriodLabel.toLowerCase()}.` :
  upcomingTasks.map(task => `• ${task.title} (${task.priority.toUpperCase()}) ${task.dueDate ? `- Due: ${task.dueDate.toLocaleDateString()}` : ''}`).join('\n')}

✅ COMPLETED (${completedTasks.length}) - Tasks you completed ${lastPeriodLabel.toLowerCase()}:
${completedTasks.length === 0 ? `No tasks completed ${lastPeriodLabel.toLowerCase()}.` :
  completedTasks.map(task => `• ${task.title}`).join('\n')}

---
This email was sent from your Todo Management app.
To unsubscribe: unsubscribe@todoapp.com
Manage preferences: /dashboard/preferences
  `;

  return { subject, html, text };
}

/**
 * Generate HTML email template for task reminders
 */
export function generateReminderEmailTemplate(data: ReminderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, task, daysUntilDue } = data;
  
  const dueDateText = task.dueDate 
    ? task.dueDate.toLocaleDateString()
    : 'No due date set';

  const urgencyText = daysUntilDue === 0 
    ? 'due today' 
    : daysUntilDue === 1 
    ? 'due tomorrow'
    : `due in ${daysUntilDue} days`;

  const subject = `⏰ Reminder: "${task.title}" is ${urgencyText}`;

  const priorityColor = {
    urgent: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a'
  }[task.priority] || '#6b7280';

  const contextInfo = [
    task.projectName && `📁 ${task.projectName}`,
    task.contextName && `🏷️ ${task.contextName}`,
    task.areaName && `📂 ${task.areaName}`
  ].filter(Boolean).join(' • ');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border-radius: 8px;">
        <h1 style="margin: 0; font-size: 24px;">⏰ Task Reminder</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Hello ${userName}! Don't forget about this task.</p>
      </div>

      <div style="border-left: 4px solid ${priorityColor}; padding: 20px; margin: 20px 0; background: #f9fafb; border-radius: 8px;">
        <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 20px;">${task.title}</h2>
        
        ${task.description ? `<p style="margin: 12px 0; color: #4b5563; font-size: 16px;">${task.description}</p>` : ''}
        
        <div style="margin: 16px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="background: ${priorityColor}; color: white; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; font-weight: bold; font-size: 12px; margin-right: 12px;">${task.priority}</span>
            <span style="color: #dc2626; font-weight: bold; font-size: 16px;">Due: ${dueDateText}</span>
          </div>
          ${contextInfo ? `<div style="color: #6b7280; font-size: 14px; margin-top: 8px;">${contextInfo}</div>` : ''}
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>This reminder was sent from your Todo Management app.</p>
        <p>
          <a href="mailto:unsubscribe@todoapp.com?subject=Unsubscribe" style="color: #6b7280;">Unsubscribe</a> |
          <a href="/dashboard/preferences" style="color: #6b7280;">Manage Preferences</a>
        </p>
      </div>

    </body>
    </html>
  `;

  const text = `
⏰ TASK REMINDER

Hello ${userName}!

Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}
Priority: ${task.priority.toUpperCase()}
Due Date: ${dueDateText}
${contextInfo ? `Context: ${contextInfo}` : ''}

This task is ${urgencyText}.

View your tasks: /dashboard

---
This reminder was sent from your Todo Management app.
To unsubscribe: unsubscribe@todoapp.com
Manage preferences: /dashboard/preferences
  `;

  return { subject, html, text };
}

/**
 * Cache templates to improve performance
 */
const templateCache = new Map<string, { subject: string; html: string; text: string }>();

export function getCachedTemplate(
  type: 'summary' | 'reminder',
  data: SummaryEmailData | ReminderEmailData
): { subject: string; html: string; text: string } {
  const cacheKey = `${type}-${JSON.stringify(data)}`;
  
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  let template;
  if (type === 'summary') {
    template = generateSummaryEmailTemplate(data as SummaryEmailData);
  } else {
    template = generateReminderEmailTemplate(data as ReminderEmailData);
  }

  // Cache for 5 minutes
  templateCache.set(cacheKey, template);
  setTimeout(() => templateCache.delete(cacheKey), 5 * 60 * 1000);

  return template;
}