# Email Notification System

This document describes the email notification system implemented in the Todo Management SaaS application.

## Overview

The email notification system provides users with:
- **Daily/Weekly Task Summaries**: Automated emails sent at 6am local time with Focus, Upcoming, and Completed tasks
- **Task Reminders**: Email reminders sent before tasks are due (configurable days in advance)
- **Admin Dashboard**: System monitoring and email statistics for administrators

## Features

### 1. Task Summary Emails

**Daily Summaries** (sent every morning at 6am local time):
- **Focus Tasks**: Overdue tasks + tasks due today
- **Upcoming Tasks**: Tasks due tomorrow
- **Completed Tasks**: Tasks completed yesterday

**Weekly Summaries** (sent Monday mornings at 6am local time):
- **Focus Tasks**: Overdue tasks + tasks due this week
- **Upcoming Tasks**: Tasks due next week
- **Completed Tasks**: Tasks completed last week

### 2. Task Reminders

- Single reminder per task (on/off toggle)
- Configurable reminder days (1-30 days before due date)
- Default reminder setting per user (configurable in preferences)
- Automatic cancellation when tasks are completed or deleted

### 3. Admin Dashboard

Available at `/admin` for `arvind8mathur@gmail.com`:
- User and task statistics
- Email delivery metrics and failure rates
- Recent failed email monitoring
- Test email functionality
- System health overview

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# SMTP Configuration for Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@todoapp.com

# Cron Job Authentication
CRON_SECRET=your-secret-token-for-cron-jobs

# Application URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password as `SMTP_PASS`

## Database Schema

### New Tables

**EmailNotification**:
- Tracks all scheduled and sent email notifications
- Includes retry logic and error tracking
- Indexed for efficient processing

**User Table Updates**:
- Added `isAdmin` field for admin access control
- Admin status automatically set for `arvind8mathur@gmail.com`

**Task Table Updates**:
- Added `reminderEnabled` and `reminderDays` fields
- Supports per-task reminder configuration

## API Endpoints

### Email Processing
- `POST /api/email/process` - Process pending notifications (cron job)
- `GET /api/email/process` - Get processing status
- `POST /api/email/test` - Send test email (admin only)

### Admin Dashboard
- `GET /api/admin/stats` - Get system statistics (admin only)

## User Interface

### Preferences Page

New "Email Notification Settings" section includes:
- **Summary Emails**: Enable/disable with frequency selection (daily/weekly)
- **Task Reminders**: Enable/disable with default reminder days
- **Master Toggle**: Email notifications must be enabled first

### Dashboard Navigation

Admin users see an "Admin Panel" link next to the Preferences button.

### Task Creation/Editing

Tasks now include:
- Reminder enabled checkbox
- Reminder days selection (1-30 days)
- Uses user's default reminder settings

## Background Processing

### Cron Job Script

Use `scripts/process-emails.js` to process pending notifications:

```bash
# Process emails
node scripts/process-emails.js

# Check status
node scripts/process-emails.js status
```

### Recommended Schedule

Run the email processor every 5-10 minutes:

```bash
# Crontab example (every 5 minutes)
*/5 * * * * cd /path/to/app && node scripts/process-emails.js >> /var/log/email-processor.log 2>&1
```

### Vercel Cron Jobs

For Vercel deployment, use Vercel Cron Jobs:

```json
{
  "crons": [
    {
      "path": "/api/email/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Email Templates

### Summary Email Template

- Responsive HTML design
- Three sections: Focus, Upcoming, Completed
- Task details include priority, due date, project/context/area
- Plain text fallback included
- Unsubscribe links for compliance

### Reminder Email Template

- Task-focused design with clear call-to-action
- Priority and due date highlighting
- Context information (project, area, etc.)
- Direct link to view task

## Error Handling & Monitoring

### Retry Logic

- Automatic retry with exponential backoff
- Maximum 3 retry attempts
- Failed emails tracked in database

### Admin Monitoring

- Real-time failure rate tracking
- Recent failed emails with error details
- System health indicators
- Email delivery statistics

### Logging

- Comprehensive logging for debugging
- Processing statistics
- Connection pool monitoring

## Security & Privacy

### Email Security

- TLS/SSL encryption for SMTP connections
- Unsubscribe links in all emails
- No sensitive data in email content
- Admin access restricted to specific email

### API Security

- Cron job authentication with secret token
- Admin endpoints require authentication
- Rate limiting on email sending

## Performance Optimization

### Database Optimization

- Proper indexing on EmailNotification table
- Connection pool management
- Batch processing of notifications

### Email Processing

- Template caching for improved performance
- Batch email sending with rate limiting
- Background processing to avoid blocking

### Cleanup

- Automatic cleanup of old notifications (30+ days)
- Configurable retention periods
- Database maintenance included

## Troubleshooting

### Common Issues

1. **Emails not sending**:
   - Check SMTP configuration
   - Verify Gmail app password
   - Check admin dashboard for errors

2. **Cron job not running**:
   - Verify CRON_SECRET matches
   - Check application URL is correct
   - Review cron job logs

3. **Database connection errors**:
   - Monitor connection pool usage
   - Check database connection limits
   - Review connection pool configuration

### Testing

1. **Test Email Configuration**:
   - Use admin dashboard test email feature
   - Check SMTP connection in logs

2. **Test Notifications**:
   - Create task with reminder
   - Enable summary emails in preferences
   - Monitor admin dashboard for processing

## Version History

- **v2.15.0**: Initial email notification system implementation
  - Task summary emails (daily/weekly)
  - Task reminder emails
  - Admin dashboard
  - User preferences integration
  - Background processing system

## Support

For issues or questions about the email notification system:
1. Check the admin dashboard for system status
2. Review application logs for errors
3. Verify environment configuration
4. Test email connectivity using admin tools