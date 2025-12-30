# Filter Count Race Condition Fixes - COMPLETE

## Version: 2.25.0

## Issues Fixed

### 1. Race Condition in useTasks Hook
**Problem**: The `useTasks` hook was calling `fetchTasks` before user preferences were loaded, defaulting to `"none"` for completed task visibility, causing inconsistent behavior.

**Solution**: 
- Modified `fetchTasks` callback to wait for `preferencesData` to be loaded before making API calls
- Updated useEffect to only fetch tasks when `preferencesData !== null`
- Updated dependency array to include `preferencesData` instead of just the specific preference

**Files Modified**:
- `src/hooks/useTasks.ts`

### 2. Race Condition in useTaskCounts Hook
**Problem**: Similar race condition where task counts were fetched before user preferences were loaded.

**Solution**:
- Modified `fetchCounts` callback to wait for `preferencesData` to be loaded before making API calls
- Updated useEffect to only fetch counts when `preferencesData !== null`
- Updated dependency array to include full `preferencesData` object

**Files Modified**:
- `src/hooks/useTaskCounts.ts`

### 3. Focus Filter Including Upcoming Tasks
**Problem**: The Focus filter was incorrectly including upcoming tasks when it should only show Today + Overdue tasks.

**Solution**:
- Fixed the Focus filter logic in `buildDateFilter` method to use `boundaries.tomorrowStart` instead of `boundaries.todayEnd`
- This ensures Focus filter only includes tasks due before tomorrow (i.e., today and overdue)
- Updated both active and completed task branches of the OR condition

**Files Modified**:
- `src/lib/task-filter-service.ts`

## Technical Details

### Race Condition Prevention
The race condition occurred because:
1. `useUserPreferences` hook starts with `preferencesData: null` while loading
2. `useTasks` and `useTaskCounts` hooks would immediately call APIs with default `"none"` value
3. When preferences loaded later, the hooks would call APIs again, but caching could cause inconsistencies

**Fix**: Both hooks now wait for `preferencesData !== null` before making any API calls.

### Focus Filter Logic
The Focus filter should show:
- **Active tasks**: Due today or overdue (due before tomorrow start)
- **Completed tasks**: Due today/overdue OR completed today (based on user preference)

**Before**: Used `boundaries.todayEnd` which included tasks due at end of today
**After**: Uses `boundaries.tomorrowStart` which excludes upcoming tasks properly

## Expected Behavior After Fix

1. **All Tasks Filter**: Shows all active tasks + completed tasks based on user preference (1, 7, or 30 days)
2. **Focus Filter**: Shows only Today + Overdue tasks + completed tasks based on preference
3. **Consistent Counts**: Filter counts match displayed tasks exactly
4. **No Race Conditions**: Both page refresh and navigation show identical results
5. **Proper Caching**: User preferences are included in cache keys to prevent stale data

## Testing Recommendations

1. Test All Tasks filter with different completed task visibility settings
2. Test Focus filter to ensure it excludes upcoming tasks
3. Test navigation between filters vs page refresh for consistency
4. Verify filter counts match displayed task counts
5. Test with different timezones to ensure date boundaries work correctly