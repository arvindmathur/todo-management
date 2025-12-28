# Error Handling and User Feedback System

This document describes the comprehensive error handling and user feedback system implemented in the Todo Management SaaS application.

## Overview

The error handling system provides:
- **Comprehensive error classification** - Different error types with appropriate handling
- **User-friendly feedback** - Toast notifications, error messages, and loading states
- **Automatic error reporting** - Logging and monitoring of errors
- **Graceful degradation** - Fallback UIs and recovery options
- **Developer experience** - Detailed error information in development

## Architecture

### Core Components

#### 1. Error Classes (`src/lib/errors.ts`)
- `AppError` - Base application error class
- `ValidationError` - Input validation errors
- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Permission denied errors
- `NotFoundError` - Resource not found errors
- `ConflictError` - Resource conflicts
- `RateLimitError` - Rate limiting errors
- `DatabaseError` - Database operation failures
- `ExternalServiceError` - Third-party service errors

#### 2. API Error Handler (`src/lib/api-error-handler.ts`)
- `withErrorHandling()` - Wrapper for API route handlers
- `validateRequest()` - Request validation with error handling
- `requireAuth()` - Authentication requirement helper
- `requireResource()` - Resource existence validation
- `checkRateLimit()` - Rate limiting implementation

#### 3. Client Error Handling (`src/hooks/useErrorHandling.ts`)
- `useErrorHandling()` - Main error handling hook
- `useApiCall()` - API calls with automatic error handling
- `useFormSubmission()` - Form submissions with error handling
- `useAsyncOperation()` - Generic async operations
- `useRetryOperation()` - Retry logic with exponential backoff

#### 4. Loading States (`src/hooks/useLoadingState.ts`)
- `useLoadingState()` - Basic loading state management
- `useAsyncState()` - Advanced async state with timeout
- `useMultipleLoadingStates()` - Multiple concurrent loading states
- `useDebouncedLoading()` - Debounced loading for search/filter
- `useProgressLoading()` - Progress tracking for long operations

### UI Components

#### 1. Error Boundaries (`src/components/error/ErrorBoundary.tsx`)
- React error boundary for catching component errors
- Automatic error reporting
- Fallback UI with recovery options
- Development vs production error display

#### 2. Toast Notifications (`src/components/feedback/Toast.tsx`)
- Success, error, warning, and info toasts
- Auto-dismiss with configurable duration
- Action buttons for user interaction
- Stacked notifications with proper positioning

#### 3. Error Messages (`src/components/feedback/ErrorMessage.tsx`)
- Contextual error display with appropriate icons
- Retry functionality
- Expandable error details for debugging
- Field-level error messages for forms

#### 4. Loading Components (`src/components/feedback/LoadingSpinner.tsx`)
- Various loading spinners and indicators
- Loading buttons with disabled state
- Skeleton loading cards and tables
- Loading overlays for full-screen operations

#### 5. Empty States (`src/components/feedback/ErrorMessage.tsx`)
- User-friendly empty state displays
- Call-to-action buttons
- Customizable icons and messaging

## Usage Examples

### API Route Error Handling

```typescript
import { withErrorHandling, validateRequest, requireAuth } from "@/lib/api-error-handler"

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const body = await request.json()
  const validatedData = validateRequest(createTaskSchema, body, "Task creation")

  // Your business logic here
  const task = await prisma.task.create({ data: validatedData })

  return NextResponse.json({ task }, { status: 201 })
}, "createTask")
```

### Component Error Handling

```typescript
import { useErrorHandling, useLoadingState } from "@/hooks/useErrorHandling"
import { LoadingButton, useSuccessToast } from "@/components/feedback"

function TaskComponent() {
  const { handleError } = useErrorHandling()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const showSuccess = useSuccessToast()

  const handleSubmit = async () => {
    startLoading()
    try {
      await createTask(taskData)
      showSuccess("Task Created", "Your task has been created successfully")
    } catch (error) {
      await handleError(error, "Task creation")
    } finally {
      stopLoading()
    }
  }

  return (
    <LoadingButton loading={isLoading} onClick={handleSubmit}>
      Create Task
    </LoadingButton>
  )
}
```

### Form Validation

```typescript
import { useFormSubmission } from "@/hooks/useErrorHandling"
import { FieldError } from "@/components/feedback"

function TaskForm() {
  const { submitForm } = useFormSubmission()
  const [errors, setErrors] = useState({})

  const handleSubmit = async (formData) => {
    const result = await submitForm(
      () => createTask(formData),
      {
        onSuccess: (data) => {
          // Handle success
        },
        onError: (error) => {
          if (error.type === "validation" && error.details) {
            setErrors(error.details)
          }
        }
      }
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      <FieldError error={errors.title} />
      {/* More form fields */}
    </form>
  )
}
```

## Error Types and Handling

### Network Errors
- **Detection**: Connection failures, timeout errors
- **User Feedback**: "Connection issue" warning toast
- **Recovery**: Automatic retry with exponential backoff

### Validation Errors
- **Detection**: Zod validation failures, malformed input
- **User Feedback**: Field-level error messages, validation toast
- **Recovery**: Form highlighting, correction guidance

### Authentication Errors
- **Detection**: Missing/invalid session, expired tokens
- **User Feedback**: "Please sign in" error message
- **Recovery**: Automatic redirect to sign-in page

### Authorization Errors
- **Detection**: Insufficient permissions, tenant isolation violations
- **User Feedback**: "Access denied" error message
- **Recovery**: Redirect to safe page, contact support option

### Server Errors
- **Detection**: 5xx HTTP status codes, database failures
- **User Feedback**: "Server error" message with error ID
- **Recovery**: Retry option, error reporting to team

### Rate Limiting
- **Detection**: 429 HTTP status code
- **User Feedback**: "Too many requests" warning with retry time
- **Recovery**: Automatic retry after cooldown period

## Configuration

### Environment Variables
```bash
# Error reporting (optional)
SENTRY_DSN=your_sentry_dsn_here
ERROR_REPORTING_ENABLED=true

# Development settings
NODE_ENV=development  # Shows detailed errors
```

### Toast Configuration
```typescript
// Default toast durations
const TOAST_DURATIONS = {
  success: 5000,
  error: 7000,
  warning: 5000,
  info: 5000
}
```

### Retry Configuration
```typescript
// Default retry settings
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
}
```

## Error Monitoring

### Logging
- All errors are logged with context information
- Error IDs for tracking and debugging
- User actions and system state at time of error

### Reporting
- Integration ready for services like Sentry
- Error aggregation and alerting
- Performance impact monitoring

### Analytics
- Error frequency and patterns
- User impact assessment
- Recovery success rates

## Best Practices

### For Developers

1. **Use Typed Errors**: Always use specific error classes instead of generic Error
2. **Provide Context**: Include relevant information in error messages
3. **Handle Gracefully**: Always provide fallback UI and recovery options
4. **Test Error Paths**: Write tests for error scenarios
5. **Monitor Production**: Set up error monitoring and alerting

### For API Routes

1. **Use Error Wrapper**: Always wrap API handlers with `withErrorHandling`
2. **Validate Input**: Use `validateRequest` for all user input
3. **Check Permissions**: Use `requireAuth` and `requireResource` helpers
4. **Log Appropriately**: Use audit logging for security-sensitive operations

### For Components

1. **Use Error Boundaries**: Wrap components that might fail
2. **Show Loading States**: Always indicate when operations are in progress
3. **Provide Feedback**: Use toasts for operation results
4. **Handle Edge Cases**: Consider empty states and error conditions

## Testing

### Unit Tests
```typescript
// Test error handling hooks
describe('useErrorHandling', () => {
  it('should handle network errors correctly', async () => {
    // Test implementation
  })
})
```

### Integration Tests
```typescript
// Test API error responses
describe('API Error Handling', () => {
  it('should return proper error format for validation failures', async () => {
    // Test implementation
  })
})
```

### Error Simulation
Use the `ErrorHandlingDemo` component to test all error scenarios in development.

## Migration Guide

### Updating Existing Components

1. Replace manual error handling with hooks:
```typescript
// Before
const [error, setError] = useState(null)
const [loading, setLoading] = useState(false)

// After
const { handleError } = useErrorHandling()
const { isLoading, startLoading, stopLoading } = useLoadingState()
```

2. Replace manual API calls with error-aware versions:
```typescript
// Before
try {
  const response = await fetch('/api/tasks')
  const data = await response.json()
} catch (error) {
  console.error(error)
}

// After
const { apiCall } = useApiCall()
const data = await apiCall(() => fetch('/api/tasks').then(r => r.json()))
```

3. Add error boundaries to page layouts:
```typescript
// Before
export default function Layout({ children }) {
  return <div>{children}</div>
}

// After
import { ErrorBoundary } from "@/components/feedback"

export default function Layout({ children }) {
  return (
    <ErrorBoundary>
      <div>{children}</div>
    </ErrorBoundary>
  )
}
```

## Troubleshooting

### Common Issues

1. **Toast not showing**: Ensure `ToastProvider` is in your app layout
2. **Errors not caught**: Check that error boundaries are properly placed
3. **API errors not handled**: Verify `withErrorHandling` wrapper is used
4. **Loading states not working**: Confirm hooks are used correctly

### Debug Mode

Set `NODE_ENV=development` to see:
- Detailed error messages
- Stack traces in error boundaries
- Validation error details
- Network request/response information

This comprehensive error handling system ensures a robust, user-friendly experience while providing developers with the tools needed to debug and monitor application health.