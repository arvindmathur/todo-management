# Design Document

## Overview

This design document outlines the UI/UX optimization for the Todo Management SaaS application. The primary goals are to reduce wasted screen space, streamline the interface, and improve task creation efficiency through header consolidation, enhanced filtering, and inline task creation.

## Architecture

### Component Hierarchy Changes

```
Dashboard Page
├── Consolidated Navigation Header (modified)
├── Main Content Area
│   ├── Section Header with Tagline (modified)
│   ├── Enhanced Task View Tabs (modified)
│   │   ├── Focus Tab (new)
│   │   └── Filter Settings Icon (new)
│   ├── Collapsible Additional Filters (new)
│   ├── Task List Container (modified)
│   │   ├── Inline Task Creation Row (new)
│   │   └── Existing Task Items
│   └── Version Display (unchanged)
```

### State Management Updates

The application will need to manage additional state for:
- Filter panel collapse/expand state
- Inline task creation row state
- Focus view calculations
- Filter settings icon active state

## Components and Interfaces

### 1. Enhanced Dashboard Layout (`src/app/dashboard/page.tsx`)

**Changes:**
- Consolidate header structure
- Remove separate New Task button
- Add state for collapsible filters
- Integrate inline task creation

**New State Variables:**
```typescript
const [showAdditionalFilters, setShowAdditionalFilters] = useState(false)
const [inlineTaskData, setInlineTaskData] = useState({
  title: '',
  priority: 'medium' as TaskPriority,
  dueDate: null as Date | null
})
```

### 2. Enhanced Task View Tabs (`src/components/tasks/TaskViewTabs.tsx`)

**New Features:**
- Focus tab with combined overdue + today tasks
- Filter settings icon with toggle functionality
- Tooltip support for Focus tab explanation

**Interface Updates:**
```typescript
interface TaskViewTabsProps {
  activeView: string
  onViewChange: (view: string, filters: Partial<TaskFilters>) => void
  taskCounts?: {
    all: number
    today: number
    overdue: number
    upcoming: number
    noDueDate: number
    focus: number // New
  }
  showAdditionalFilters: boolean // New
  onToggleAdditionalFilters: () => void // New
}
```

**Focus View Logic:**
```typescript
const focusFilters = {
  status: "active" as const,
  dueDate: ["overdue", "today"] // Combined filter logic
}
```

### 3. Collapsible Additional Filters (`src/components/tasks/CollapsibleFilters.tsx`)

**New Component:**
```typescript
interface CollapsibleFiltersProps {
  isOpen: boolean
  filters: TaskFilters
  onFiltersChange: (filters: Partial<TaskFilters>) => void
  onClearFilters: () => void
  isLoading?: boolean
}
```

**Features:**
- Smooth expand/collapse animation
- Status, Priority, Context, Area filters only
- Visual indicator when filters are active
- Mobile-responsive layout

### 4. Inline Task Creation Row (`src/components/tasks/InlineTaskCreator.tsx`)

**New Component:**
```typescript
interface InlineTaskCreatorProps {
  onTaskCreate: (taskData: CreateTaskRequest) => Promise<any>
  isLoading: boolean
}
```

**Features:**
- Looks like a regular task item when empty
- Click-to-edit functionality for all fields
- Auto-save on Enter or blur
- Excel-like editing experience
- Placeholder text management

### 5. Enhanced Task List (`src/components/tasks/TaskList.tsx`)

**Modifications:**
- Integrate inline task creation row at the top
- Maintain existing task item functionality
- Handle empty state differently (no "create task" message)

## Data Models

### Focus View Calculation

The Focus view combines overdue and today's tasks:

```typescript
// API endpoint modification for focus view
const getFocusTasks = async (tenantId: string, userId: string) => {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  return prisma.task.findMany({
    where: {
      tenantId,
      userId,
      status: "active",
      OR: [
        { dueDate: { lt: todayStart } }, // Overdue
        { 
          dueDate: { 
            gte: todayStart, 
            lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) 
          } 
        } // Today
      ]
    }
  })
}
```

### Filter State Management

```typescript
interface FilterState {
  activeView: string
  additionalFiltersOpen: boolean
  appliedFilters: {
    status?: TaskStatus
    priority?: TaskPriority
    contextId?: string
    areaId?: string
    search?: string
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">ui-optimization

### Property Reflection

After reviewing the prework analysis, I identified several properties that can be consolidated:

**Consolidation Opportunities:**
- Properties 2.2 and 2.4 both test Focus view filtering logic and can be combined into one comprehensive property
- Properties 2.5 and focus count calculation can be combined with the filtering property
- Properties 4.4 and 4.5 both test inline task creation behavior and can be combined
- Properties 5.3 and 5.4 both test state management in inline creation and can be combined

### Converting EARS to Properties

Based on the prework analysis, here are the testable properties:

**Property 1: Header Space Reduction**
*For any* dashboard page render, the total vertical header space should be at least 30% less than the original header space while maintaining all navigation functionality
**Validates: Requirements 1.4**

**Property 2: Focus View Filtering**
*For any* set of tasks with mixed due dates, when the Focus view is selected, the displayed tasks should include only those that are overdue or due today, and the count should equal the sum of overdue and today tasks
**Validates: Requirements 2.2, 2.4, 2.5**

**Property 3: Filter State Persistence**
*For any* combination of additional filter settings, when the filter panel is collapsed and expanded, all previously applied filter values should remain unchanged
**Validates: Requirements 3.4**

**Property 4: Filter Active Indication**
*For any* additional filter that has a non-default value, the filter settings icon should display a visual indicator that filters are active
**Validates: Requirements 3.5**

**Property 5: Inline Task Creation**
*For any* valid task title entered in the inline creation row, pressing Enter or clicking outside should create a new task and reset the row to its empty state with placeholder text
**Validates: Requirements 4.4, 4.5**

**Property 6: Inline Task Property Persistence**
*For any* combination of properties set in the inline creation row (title, due date, priority), creating the task should apply all set properties to the new task correctly
**Validates: Requirements 5.3, 5.4**

**Property 7: Task Creation Functional Equivalence**
*For any* task creation scenario that was possible with the old New Task button, the same task should be creatable through the inline creation row with equivalent functionality
**Validates: Requirements 6.2**

## Error Handling

### UI State Management Errors

1. **Filter Panel State Errors**
   - Handle cases where filter panel state becomes inconsistent
   - Provide fallback to collapsed state if expansion fails
   - Maintain filter values even if UI state is corrupted

2. **Inline Creation Errors**
   - Handle API failures during inline task creation
   - Preserve user input if creation fails
   - Show appropriate error messages without losing form state

3. **Focus View Calculation Errors**
   - Handle edge cases in date calculations (timezone issues)
   - Provide fallback to "All Tasks" view if Focus calculation fails
   - Ensure count calculations are always accurate

### Mobile and Responsive Errors

1. **Touch Interaction Failures**
   - Provide fallback click handlers for touch events
   - Handle cases where touch targets are too small
   - Ensure keyboard navigation works when touch fails

2. **Layout Breakpoint Issues**
   - Handle cases where responsive breakpoints cause layout issues
   - Provide graceful degradation for very small screens
   - Ensure all functionality remains accessible across screen sizes

## Testing Strategy

### Unit Testing Approach

**Component Testing:**
- Test each new component in isolation
- Mock external dependencies and API calls
- Focus on user interaction scenarios
- Test responsive behavior across breakpoints

**Integration Testing:**
- Test component interactions within the dashboard
- Verify state management between components
- Test filter synchronization between tabs and additional filters
- Validate inline creation integration with task list

### Property-Based Testing Configuration

**Testing Framework:** Jest with fast-check for property-based testing
**Test Configuration:** Minimum 100 iterations per property test
**Test Tags:** Each property test must reference its design document property

**Property Test Examples:**

```typescript
// Property 2: Focus View Filtering
describe('Focus View Filtering', () => {
  it('should show only overdue and today tasks', 
    fc.property(
      fc.array(taskGenerator), // Generate random task arrays
      (tasks) => {
        // Feature: ui-optimization, Property 2: Focus View Filtering
        const focusResult = applyFocusFilter(tasks)
        const expectedTasks = tasks.filter(task => 
          isOverdue(task) || isDueToday(task)
        )
        expect(focusResult.tasks).toEqual(expectedTasks)
        expect(focusResult.count).toBe(expectedTasks.length)
      }
    )
  )
})

// Property 5: Inline Task Creation
describe('Inline Task Creation', () => {
  it('should create task and reset row state',
    fc.property(
      fc.string({ minLength: 1, maxLength: 500 }), // Valid task titles
      async (title) => {
        // Feature: ui-optimization, Property 5: Inline Task Creation
        const initialState = getInlineCreatorState()
        await createTaskFromInlineRow(title)
        const finalState = getInlineCreatorState()
        
        expect(finalState.title).toBe('')
        expect(finalState.showPlaceholder).toBe(true)
        expect(getLastCreatedTask().title).toBe(title)
      }
    )
  )
})
```

### Manual Testing Scenarios

**User Experience Testing:**
1. Header consolidation visual verification
2. Filter panel smooth animations
3. Inline creation Excel-like feel
4. Mobile touch interaction quality
5. Accessibility compliance verification

**Cross-browser Testing:**
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- Keyboard navigation testing
- Screen reader compatibility

### Performance Testing

**Metrics to Monitor:**
- Header render time reduction
- Filter panel animation smoothness (60fps target)
- Inline creation responsiveness (<100ms feedback)
- Task list rendering performance with inline creator
- Memory usage optimization

**Performance Benchmarks:**
- Page load time should not increase
- Filter switching should remain under 200ms
- Inline task creation should complete under 500ms
- Mobile performance should match desktop responsiveness