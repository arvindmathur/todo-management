# Filter Count Consistency Fix - COMPLETE

## Issue Summary
Fixed critical inconsistencies between filter counts (shown in headers) and actual displayed tasks, particularly affecting:
1. **All Tasks filter**: Showing 10 in header but only 8 tasks in list
2. **Focus filter**: Inconsistent behavior between page refresh vs navigation, incorrectly including upcoming tasks

## Root Cause Analysis

### Primary Issue: Missing includeCompleted Parameter in Counts API
- **Problem**: The `getFilterCounts()` method didn't accept an `includeCompleted` parameter, but `getFilteredTasks()` did
- **Result**: Counts API always included completed tasks, while Tasks API only included them based on user preference
- **Impact**: Count vs display mismatches across all filters

### Secondary Issue: Frontend Caching Inconsistency  
- **Problem**: `useTaskCounts` hook wasn't passing user's completed task visibility preference to counts API
- **Result**: Different behavior between page refresh (cached counts) vs navigation (fresh counts)
- **Impact**: Inconsistent Focus filter behavior and count mismatches

## Technical Fixes Applied

### 1. Updated TaskFilterService.getFilterCounts()
```typescript
// Before: No includeCompleted parameter
static async getFilterCounts(tenantId: string, userId: string): Promise<FilterCounts>

// After: Accepts includeCompleted parameter
static async getFilterCounts(
  tenantId: string, 
  userId: string, 
  includeCompleted: string = "none"
): Promise<FilterCounts>
```

### 2. Fixed All Tasks Count Logic
```typescript
// Before: Always included completed tasks
OR: [
  { status: "active" },
  { status: "completed", completedAt: { gte: boundaries.completedTaskCutoff } }
]

// After: Respects user preference
if (includeCompleted !== "none") {
  // Include completed tasks
} else {
  // Only active tasks
}
```

### 3. Updated Focus Count Calculation
```typescript
// Before: Always included completed tasks
const focusTotal = todayTotal + overdueTotal

// After: Respects user preference
const todayTotal = includeCompleted !== "none" ? todayCount + completedTodayCount : todayCount
const overdueTotal = includeCompleted !== "none" ? overdueCount + completedOverdueCount : overdueCount
const focusTotal = todayTotal + overdueTotal
```

### 4. Enhanced Counts API Route
```typescript
// Added includeCompleted parameter from URL
const includeCompleted = searchParams.get('includeCompleted') || 'none'

// Updated cache key to include preference
const cacheKey = `counts:${session.user.tenantId}:${session.user.id}:${includeCompleted}`

// Pass parameter to service
const counts = await TaskFilterService.getFilterCounts(
  session.user.tenantId,
  session.user.id,
  includeCompleted
)
```

### 5. Fixed useTaskCounts Hook
```typescript
// Added user preferences dependency
const { preferencesData } = useUserPreferences()

// Include preference in API call
const completedTaskVisibility = preferencesData?.preferences?.completedTaskVisibility || "none"
const searchParams = new URLSearchParams()
searchParams.append("includeCompleted", completedTaskVisibility)

// Updated cache key to include preference
const cacheKey = `${userId}:${completedTaskVisibility}`

// Added effect to refresh when preference changes
useEffect(() => {
  if (status === "authenticated" && preferencesData?.preferences?.completedTaskVisibility !== undefined) {
    fetchCounts()
  }
}, [preferencesData?.preferences?.completedTaskVisibility, status, fetchCounts])
```

## Files Modified
- `src/lib/task-filter-service.ts` - Core filtering logic
- `src/app/api/tasks/counts/route.ts` - Counts API endpoint  
- `src/hooks/useTaskCounts.ts` - Frontend counts hook

## Expected Results

### ✅ All Tasks Filter
- Count in header now matches displayed tasks exactly
- Respects user's completed task visibility preference (1, 7, or 30 days)

### ✅ Focus Filter  
- Consistent behavior between page refresh and navigation
- Only includes Today + Overdue tasks (no upcoming tasks)
- Properly includes completed tasks based on user preference
- Count matches displayed tasks

### ✅ All Other Filters
- Today, Overdue, Upcoming filters maintain correct behavior
- All counts respect user's completed task visibility preference
- No more cache-related inconsistencies

## Verification Steps
1. ✅ All property tests passing
2. ✅ TypeScript compilation clean
3. ✅ No breaking changes to existing functionality

## Version Update
- Updated from version 2.22.0 → 2.23.0

## Status: COMPLETE ✅
The filter count consistency issues have been fully resolved. Users will now see accurate counts that match displayed tasks across all filters, with consistent behavior regardless of how they navigate to the filter view.