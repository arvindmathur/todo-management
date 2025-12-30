# Requirements Document

## Introduction

Fix critical task filtering issues in the Todo Management SaaS application where date-based filters are not working correctly due to timezone handling problems and incorrect date calculations. The system currently shows incorrect task counts and displays tasks in wrong filter categories, particularly affecting Today, Focus, Upcoming, and completed task visibility.

## Glossary

- **Task**: A single actionable item with a description, status, and optional metadata
- **Filter**: A view that displays tasks based on specific criteria (due date, status, etc.)
- **Focus**: Tasks that are due today or overdue (actionable items requiring immediate attention)
- **Today**: Tasks specifically due on the current date
- **Overdue**: Tasks with due dates in the past that are not completed
- **Upcoming**: Tasks with due dates in the future (excluding today)
- **Completed_Tasks**: Tasks marked as complete within a specified time window
- **User_Timezone**: The timezone setting for the current user (e.g., UTC+8 for Singapore)
- **System**: The todo management application

## Requirements

### Requirement 1: Correct Today Task Filtering

**User Story:** As a user, I want to see tasks due today plus completed tasks (based on my preference setting) in the Today filter, so that I can focus on what needs to be done today while seeing recent accomplishments.

#### Acceptance Criteria

1. WHEN the current date is calculated, THE System SHALL use the user's timezone to determine "today"
2. WHEN a task has a due date matching the current date in the user's timezone, THE System SHALL include it in the Today count and display it in the Today view
3. WHEN a task was completed on the current date and within the user's completed task visibility window, THE System SHALL include it in the Today count and display
4. WHEN a task has a due date other than the current date and is not completed today, THE System SHALL exclude it from the Today filter
5. WHEN calculating date comparisons, THE System SHALL use the user's timezone consistently, not server timezone or UTC
6. THE System SHALL update Today filter results dynamically as the date changes at midnight in the user's timezone

### Requirement 2: Correct Focus Task Filtering

**User Story:** As a user, I want the Focus filter to show tasks that need immediate attention (today + overdue + completed tasks based on preference), so that I can prioritize my most urgent work while seeing recent accomplishments.

#### Acceptance Criteria

1. WHEN tasks are due today, overdue, or recently completed (based on user preference), THE System SHALL include them in the Focus filter
2. WHEN a task is due on the current date in the user's timezone, THE System SHALL include it in Focus count and display
3. WHEN a task is overdue (due date before the current date in user's timezone), THE System SHALL include it in Focus count and display
4. WHEN a task was completed within the user's configured time window, THE System SHALL include it in Focus count and display
5. WHEN a task is due in the future (after the current date) and not completed, THE System SHALL exclude it from Focus filter
6. THE System SHALL calculate Focus count as the sum of Today tasks plus Overdue tasks plus recently completed tasks (based on user preference)

### Requirement 3: Correct Upcoming Task Filtering

**User Story:** As a user, I want the Upcoming filter to show future tasks plus completed tasks (based on preference), so that I can plan ahead while seeing recent accomplishments.

#### Acceptance Criteria

1. WHEN a task has a due date after the current date in the user's timezone, THE System SHALL include it in the Upcoming filter
2. WHEN a task was completed within the user's configured time window and had a future due date, THE System SHALL include it in the Upcoming filter
3. WHEN a task is due on the current date in the user's timezone, THE System SHALL exclude it from the Upcoming filter
4. WHEN a task is overdue (due before current date), THE System SHALL exclude it from the Upcoming filter
5. WHEN calculating date comparisons for upcoming tasks, THE System SHALL use the user's timezone consistently
6. THE System SHALL display upcoming tasks in chronological order by due date

### Requirement 4: Correct Completed Task Visibility

**User Story:** As a user, I want to see completed tasks based on my preference settings in all relevant filters, displayed at the end of each list, so that I can track my recent accomplishments while keeping active tasks prioritized.

#### Acceptance Criteria

1. WHEN a user has configured their completed task visibility preference, THE System SHALL include completed tasks from within that time window in All Tasks, Today, Focus, Overdue, and Upcoming filters
2. WHEN a task was completed within the user's configured time window, THE System SHALL include it in all relevant filter counts and displays
3. WHEN a task was completed outside the user's configured time window, THE System SHALL exclude it from all filter views
4. WHEN calculating the completed task time window, THE System SHALL use the user's timezone for date calculations
5. WHEN displaying completed tasks in any filter, THE System SHALL show them with completion date and disabled interaction controls
6. WHEN displaying tasks in any filter that includes completed tasks, THE System SHALL sort completed tasks to appear at the end of the list, after all active tasks
7. THE System SHALL allow users to configure the completed task visibility window (1 day, 7 days, 30 days) and apply this setting consistently across all filters

### Requirement 5: Timezone-Aware Date Calculations

**User Story:** As a user in any timezone, I want all date-based filters to work correctly in my local timezone and refresh automatically when dates change, so that tasks appear in the right categories based on my local time.

#### Acceptance Criteria

1. WHEN the system calculates the current date, THE System SHALL use the user's timezone settings, not UTC or server timezone
2. WHEN comparing task due dates, THE System SHALL convert all dates to the user's timezone before comparison
3. WHEN a user has configured their timezone in settings, THE System SHALL use that timezone for all date calculations
4. WHEN storing task due dates, THE System SHALL store all dates in UTC format and use the user's timezone setting to determine the current date for comparisons
5. WHEN creating due dates from user input (YYYY-MM-DD format), THE System SHALL interpret the date in the user's timezone and store it as UTC
6. THE System SHALL handle timezone transitions (daylight saving time changes, etc.) correctly for date calculations
7. WHEN the date changes at midnight in the user's timezone, THE System SHALL automatically refresh all filter counts and task categorizations without requiring user action
8. WHEN a user's browser remains open across a date boundary, THE System SHALL detect the date change and update the interface in real-time

### Requirement 11: Fix Current Date Storage Issues

**User Story:** As a developer, I want to fix the current timezone handling issues in the codebase, so that all date operations work correctly for users in different timezones.

#### Acceptance Criteria

1. WHEN creating due dates from YYYY-MM-DD input, THE System SHALL convert the date to UTC using the user's timezone instead of server timezone
2. WHEN filtering tasks by date ranges (today, overdue, upcoming), THE System SHALL calculate date boundaries using the user's timezone
3. WHEN storing dates in the database, THE System SHALL ensure all DateTime fields are stored in UTC format
4. WHEN retrieving user timezone preferences, THE System SHALL use a default timezone if none is configured
5. WHEN performing date comparisons in task utilities, THE System SHALL use user timezone instead of server timezone
6. THE System SHALL update all existing date creation and comparison logic to be timezone-aware
7. THE System SHALL ensure consistent timezone handling across API routes, database queries, and utility functions

### Requirement 6: Consistent Filter Counts

**User Story:** As a user, I want the filter tab counts to match the actual number of tasks displayed in each filter, so that I can trust the interface and navigate efficiently.

#### Acceptance Criteria

1. WHEN displaying filter tabs, THE System SHALL show accurate counts that match the filtered task lists
2. WHEN a task moves between filters (due to date changes or status updates), THE System SHALL update all affected filter counts immediately
3. WHEN the date changes at midnight, THE System SHALL recalculate all date-based filter counts automatically
4. WHEN tasks are added, completed, or deleted, THE System SHALL update relevant filter counts in real-time
5. THE System SHALL ensure Focus count equals Today count plus Overdue count

### Requirement 7: Overdue Task Identification

**User Story:** As a user, I want overdue tasks plus completed tasks (based on preference) to be clearly identified and counted correctly, so that I can prioritize catching up on missed deadlines while seeing recent accomplishments.

#### Acceptance Criteria

1. WHEN a task's due date is before today and the task is not completed, THE System SHALL mark it as overdue
2. WHEN a task was completed within the user's configured time window and was originally overdue, THE System SHALL include it in the Overdue filter
3. WHEN calculating overdue status, THE System SHALL use the user's timezone for date comparison
4. WHEN a task becomes overdue at midnight, THE System SHALL automatically update its status and move it to appropriate filters
5. WHEN an overdue task is completed, THE System SHALL update filter counts immediately but may keep it visible based on user preference
6. THE System SHALL display overdue tasks with visual indicators (red text, overdue badges, etc.)

### Requirement 8: No Due Date Task Handling

**User Story:** As a user, I want tasks without due dates to be properly categorized and counted, so that I can manage both scheduled and unscheduled work effectively.

#### Acceptance Criteria

1. WHEN a task has no due date assigned, THE System SHALL include it in the "No Due Date" filter only
2. WHEN a task has no due date, THE System SHALL exclude it from Today, Overdue, and Upcoming filters
3. WHEN a task has no due date, THE System SHALL include it in the All Tasks count and Focus count (as it's always actionable)
4. WHEN a user assigns a due date to a previously undated task, THE System SHALL move it to the appropriate date-based filter
5. THE System SHALL allow users to work on undated tasks as part of their daily workflow

### Requirement 9: Real-time Filter Updates

**User Story:** As a user, I want filter counts and task lists to update automatically as time passes, dates change, and my timezone settings change, so that my task organization stays current without manual refresh.

#### Acceptance Criteria

1. WHEN the date changes at midnight in the user's timezone, THE System SHALL automatically recalculate all filter counts and task categorizations
2. WHEN a task's due date arrives (becomes "today" in user's timezone), THE System SHALL move it from Upcoming to Today filter automatically
3. WHEN a task becomes overdue at midnight in the user's timezone, THE System SHALL move it from Today to Overdue filter automatically
4. WHEN the user's browser is open across midnight in their timezone, THE System SHALL update the interface without requiring a page refresh
5. WHEN a user changes their timezone settings, THE System SHALL immediately recalculate all date-based filters using the new timezone
6. THE System SHALL handle multiple users in different timezones correctly with individual date calculations based on each user's timezone settings
7. WHEN the system detects a date change, THE System SHALL update filter tabs, counts, and task lists within 5 seconds

### Requirement 10: Filter Performance and Accuracy

**User Story:** As a user, I want task filters to load quickly and show accurate results, so that I can efficiently navigate my tasks without delays or confusion.

#### Acceptance Criteria

1. WHEN a user switches between filters, THE System SHALL display results within 200ms
2. WHEN calculating filter counts, THE System SHALL use optimized database queries that handle timezone conversions efficiently
3. WHEN the system has many tasks, THE System SHALL maintain filter performance through proper indexing and query optimization
4. WHEN filter calculations are performed, THE System SHALL ensure consistency between backend calculations and frontend display
5. THE System SHALL cache filter results appropriately while ensuring real-time accuracy for time-sensitive data