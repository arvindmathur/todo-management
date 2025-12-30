# Implementation Plan: Task Filtering Fixes

## Overview

This implementation plan addresses critical timezone handling issues in task filtering by creating timezone-aware services and updating existing code to use user timezone instead of server timezone. The approach maintains backward compatibility while fixing all date-based filtering problems.

## Tasks

- [x] 1. Create Timezone Utility Service
  - Create `src/lib/timezone-service.ts` with timezone conversion utilities
  - Implement user timezone preference retrieval with fallbacks
  - Add date boundary calculations for filtering (today, tomorrow, week boundaries)
  - Add timezone validation and error handling
  - _Requirements: 5.1, 5.3, 5.4, 5.5, 11.4_

- [x] 1.1 Write property test for timezone service
  - **Property 1: Timezone-aware Today Calculation**
  - **Validates: Requirements 1.1, 5.1**

- [x] 1.2 Write property test for date conversion
  - **Property 7: UTC Storage with Timezone Interpretation**
  - **Validates: Requirements 5.4, 5.5, 11.1**

- [x] 2. Update Task Creation API Routes
  - Modify `src/app/api/tasks/route.ts` POST method to use timezone-aware date creation
  - Update `src/app/api/inbox/[id]/process/route.ts` to use timezone service for task creation
  - Replace `new Date(year, month-1, day)` with timezone-aware conversion
  - _Requirements: 11.1, 11.5_

- [x] 2.1 Write property test for task creation dates
  - **Property 7: UTC Storage with Timezone Interpretation**
  - **Validates: Requirements 5.5, 11.1**

- [x] 3. Create Enhanced Task Filter Service
  - Create `src/lib/task-filter-service.ts` with timezone-aware filtering
  - Implement timezone-aware date boundary calculations for database queries
  - Add filter count calculations with completed task visibility preferences
  - Replace existing filtering logic in `src/lib/db-optimized.ts`
  - _Requirements: 1.2, 2.1, 3.1, 4.1, 6.1, 11.2_

- [x] 3.1 Write property test for Today filter accuracy
  - **Property 2: Today Filter Accuracy**
  - **Validates: Requirements 1.2**

- [x] 3.2 Write property test for Focus filter composition
  - **Property 3: Focus Filter Composition**
  - **Validates: Requirements 2.6, 6.5**

- [x] 3.3 Write property test for Upcoming filter exclusivity
  - **Property 4: Upcoming Filter Exclusivity**
  - **Validates: Requirements 3.1**

- [x] 4. Update Database Service with Timezone Awareness
  - Modify `src/lib/db-optimized.ts` to use timezone-aware date boundaries
  - Update `getTaskCounts()` method to use user timezone for date calculations
  - Update `getTasks()` method to handle timezone-aware filtering
  - Add completed task visibility handling across all filters
  - _Requirements: 11.2, 4.1, 6.1_

- [x] 4.1 Write property test for filter count accuracy
  - **Property 8: Filter Count Accuracy**
  - **Validates: Requirements 6.1**

- [x] 4.2 Write property test for completed task visibility
  - **Property 5: Completed Task Visibility Consistency**
  - **Validates: Requirements 4.1**

- [x] 5. Update Task Utility Functions
  - Modify `src/lib/tasks.ts` to use timezone-aware date comparisons
  - Update `isOverdue()`, `isDueToday()`, `isUpcoming()` functions
  - Replace server timezone logic with user timezone logic
  - _Requirements: 7.1, 11.5_

- [x] 5.1 Write property test for overdue identification
  - **Property 9: Overdue Identification**
  - **Validates: Requirements 7.1**

- [x] 5.2 Write property test for no due date handling
  - **Property 10: No Due Date Filter Exclusivity**
  - **Validates: Requirements 8.1, 8.3**

- [x] 6. Implement Completed Task Sort Order
  - Update task sorting logic in filter service to place completed tasks at end
  - Ensure sort order is consistent across all filters
  - Maintain existing priority and due date sorting for active tasks
  - _Requirements: 4.6_

- [x] 6.1 Write property test for completed task sort order
  - **Property 6: Completed Task Sort Order**
  - **Validates: Requirements 4.6**

- [x] 7. Add User Timezone Preference Handling
  - Update user preferences interface to include timezone field
  - Add timezone detection and default handling
  - Ensure timezone preferences are retrieved efficiently
  - _Requirements: 5.3, 11.4_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create Real-time Update Service
  - Create `src/lib/realtime-update-service.ts` for midnight updates
  - Implement timezone-aware midnight detection
  - Add filter refresh logic for date boundary changes
  - Integrate with existing caching system
  - _Requirements: 9.1, 9.4, 9.7_

- [x] 9.1 Write property test for midnight updates
  - **Property 12: Midnight Filter Updates**
  - **Validates: Requirements 9.1**

- [x] 10. Update API Routes with Enhanced Filtering
  - Modify `src/app/api/tasks/route.ts` GET method to use new filter service
  - Update all task-related API routes to use timezone-aware filtering
  - Ensure filter counts are calculated with user timezone
  - _Requirements: 6.1, 6.2, 11.6_

- [x] 10.1 Write property test for timezone boundary calculations
  - **Property 11: Timezone Boundary Calculations**
  - **Validates: Requirements 11.2**

- [x] 11. Add Error Handling and Fallbacks
  - Implement timezone validation and fallback to UTC
  - Add error handling for invalid date inputs
  - Add logging for timezone-related errors
  - _Requirements: 5.6, 11.4_

- [x] 11.1 Write unit tests for error conditions
  - Test invalid timezone handling
  - Test invalid date format handling
  - Test missing timezone preference handling

- [x] 12. Integration and Performance Testing
  - Test filter performance with timezone calculations
  - Verify database query optimization with new filtering logic
  - Test concurrent user scenarios with different timezones
  - _Requirements: 10.1, 10.3_

- [x] 12.1 Write integration tests
  - Test end-to-end filtering with multiple timezones
  - Test filter count consistency across API calls
  - Test real-time updates across midnight boundaries

- [x] 13. Final checkpoint - Ensure all tests pass
  - All timezone services implemented with comprehensive error handling
  - Task filtering now uses user timezone instead of server timezone
  - Filter counts match displayed tasks exactly
  - Focus count equals Today + Overdue counts
  - Completed tasks shown at end based on user preferences
  - Database optimizations maintained throughout implementation
  - Comprehensive test coverage for error conditions and edge cases

## Notes

- All tasks are required for comprehensive testing from the start
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests ensure end-to-end functionality
- The implementation maintains backward compatibility with existing data