# Workflow UI Integration Setup Guide

This guide outlines the complete Next.js workflow management UI for integrating with the Guru Framework BPMN engine via FastAPI proxy.

## Dependencies to Install

Run the following command to install required dependencies:

```bash
npm install @tanstack/react-query date-fns
```

## Files Created

### 1. Type Definitions
- `/src/types/workflow.ts` - Complete TypeScript type definitions for all API responses

### 2. API Client Library
- `/src/lib/api/workflows.ts` - API client with Clerk authentication integration
  - `useWorkflowApi()` hook
  - Methods for all FastAPI proxy endpoints
  - Error handling and loading states
  - Helper functions for variable conversion

### 3. Custom Hooks
- `/src/hooks/useProcesses.ts` - Process definitions queries
- `/src/hooks/useTasks.ts` - Task queries with auto-refresh
- `/src/hooks/useProcessInstance.ts` - Process instance queries

### 4. Reusable Components
- `/src/components/workflows/StatusBadge.tsx` - Status indicator component
- `/src/components/workflows/ProcessCard.tsx` - Process definition card
- `/src/components/workflows/TaskCard.tsx` - Task item card
- `/src/components/workflows/InstanceCard.tsx` - Process instance card
- `/src/components/workflows/VariableInput.tsx` - Variable type input component
- `/src/components/workflows/DynamicForm.tsx` - Dynamic form renderer

### 5. UI Components (shadcn/ui additions)
- `/src/components/ui/card.tsx` - Card component
- `/src/components/ui/skeleton.tsx` - Loading skeleton component

### 6. Page Components
- `/src/app/[locale]/(auth)/workflows/page.tsx` - Workflow dashboard
- `/src/app/[locale]/(auth)/workflows/[processKey]/start/page.tsx` - Start process form
- `/src/app/[locale]/(auth)/workflows/tasks/page.tsx` - Tasks dashboard
- `/src/app/[locale]/(auth)/workflows/tasks/[taskId]/page.tsx` - Complete task form
- `/src/app/[locale]/(auth)/workflows/instances/page.tsx` - Process instances list
- `/src/app/[locale]/(auth)/workflows/instances/[id]/page.tsx` - Instance details

## Configuration

### 1. Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. React Query Provider Setup

You need to wrap your app with React Query's `QueryClientProvider`.

Create `/src/app/[locale]/(auth)/layout.tsx` (if it doesn't exist) or update the existing one:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 3. Update Dashboard Navigation

Update `/src/app/[locale]/(auth)/dashboard/layout.tsx` to add workflow links to the menu:

```tsx
menu={[
  {
    href: '/dashboard',
    label: t('home'),
  },
  {
    href: '/workflows',
    label: 'Workflows',
  },
  {
    href: '/workflows/tasks',
    label: 'My Tasks',
  },
  {
    href: '/workflows/instances',
    label: 'Instances',
  },
  {
    href: '/dashboard/organization-profile/organization-members',
    label: t('members'),
  },
  {
    href: '/dashboard/organization-profile',
    label: t('settings'),
  },
]}
```

## Features

### 1. Workflow Dashboard (`/workflows`)
- List all available BPMN processes
- Search/filter processes by name or key
- Start process button for each
- View instances for each process
- Empty state with helpful messaging

### 2. Start Process Form (`/workflows/[processKey]/start`)
- Dynamic form generation based on process start form variables
- Support for all variable types (String, Integer, Boolean, Date, Enum)
- Business key input (optional)
- Validation with error messages
- Redirect to instance details after success
- Loading states and error handling

### 3. Tasks Dashboard (`/workflows/tasks`)
- List all user tasks (active and unassigned)
- Task cards showing:
  - Task name and description
  - Status badge (active, pending, suspended)
  - Created date, assignee, priority
  - Due date if applicable
- Claim task functionality for unassigned tasks
- Complete task button for assigned tasks
- Link to view process instance
- Search and filter functionality
- Auto-refresh every 30 seconds

### 4. Complete Task Form (`/workflows/tasks/[taskId]`)
- Task details display
- Dynamic form based on task form variables
- Pre-filled with existing values
- Validation and error handling
- Complete task submission
- Redirect to tasks list after success
- Suspended task warning

### 5. Process Instances (`/workflows/instances`)
- List all user's process instances
- Filter by status (all, active, suspended, completed)
- Search by ID, business key, or process
- Instance cards showing:
  - Status badge
  - Process name and version
  - Start/end times
  - Duration
  - Business key
- Suspend/Resume actions
- Cancel instance functionality
- Link to instance details
- Auto-refresh every 30 seconds

### 6. Instance Details (`/workflows/instances/[id]`)
- Comprehensive instance information
- Process variables display
- Active tasks list with links
- Activity timeline showing:
  - Activity name and type
  - Start/end times
  - Duration
  - Assignee
  - Canceled status
- Real-time updates

## Technical Features

### Authentication
- Seamless Clerk integration
- Automatic token injection in API calls
- 401 error handling

### Data Management
- React Query for caching and state management
- Automatic background refetching
- Optimistic updates
- Cache invalidation on mutations

### User Experience
- Loading skeletons for all async operations
- Error states with retry options
- Empty states with helpful messages
- Toast notifications for success/error
- Responsive design (mobile-first)
- Accessible components (WCAG compliant)

### Performance
- Intelligent caching strategies
- Auto-refresh with configurable intervals
- Parallel data fetching where possible
- Optimized re-renders

### Type Safety
- Complete TypeScript coverage
- Type-safe API calls
- Type-safe form handling
- No any types in user code

## Variable Type Support

The dynamic forms support the following Camunda variable types:

1. **String** - Text input with validation (min/max length, pattern)
2. **Integer/Long** - Number input with validation (min/max values)
3. **Boolean** - Checkbox input
4. **Date** - Date picker input
5. **Enum** - Select dropdown with predefined options
6. **Json** - Automatic serialization/deserialization

## Error Handling

All components include comprehensive error handling:

- API errors displayed with user-friendly messages
- Network errors caught and displayed
- Form validation errors shown inline
- Mutation errors shown in toast notifications
- Retry functionality for failed requests

## Accessibility

All components follow WCAG 2.1 AA standards:

- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## Testing Recommendations

### Unit Tests
Test the following with Vitest:
- API client functions
- Variable conversion helpers
- Form validation logic
- Component rendering

### Integration Tests
Test with Playwright:
- Complete workflow: start → task → complete
- Process instance lifecycle
- Task claiming and completion
- Error scenarios

### Example Test
```typescript
import { render, screen } from '@testing-library/react';
import { ProcessCard } from '@/components/workflows/ProcessCard';

test('ProcessCard renders process information', () => {
  const process = {
    id: '1',
    key: 'test-process',
    name: 'Test Process',
    version: 1,
    // ... other fields
  };

  render(<ProcessCard process={process} locale="en" />);

  expect(screen.getByText('Test Process')).toBeInTheDocument();
  expect(screen.getByText('Key: test-process')).toBeInTheDocument();
  expect(screen.getByText('Start Process')).toBeInTheDocument();
});
```

## Next Steps

1. Install dependencies: `npm install @tanstack/react-query date-fns`
2. Set up environment variables
3. Configure React Query provider
4. Update dashboard navigation
5. Test the integration with your FastAPI backend
6. Add custom styling if needed
7. Implement additional features as required

## API Endpoints Expected

The UI expects the following FastAPI endpoints to be available:

- `GET /api/v1/process-definitions` - List all processes
- `GET /api/v1/process-definitions/{key}` - Get process details
- `GET /api/v1/process-definitions/{key}/xml` - Get BPMN XML
- `GET /api/v1/process-definitions/{key}/form-variables` - Get start form
- `POST /api/v1/process-definitions/{key}/start` - Start process
- `GET /api/v1/process-instances` - List instances
- `GET /api/v1/process-instances/{id}` - Get instance details
- `GET /api/v1/process-instances/{id}/variables` - Get variables
- `POST /api/v1/process-instances/{id}/suspend` - Suspend instance
- `POST /api/v1/process-instances/{id}/activate` - Resume instance
- `DELETE /api/v1/process-instances/{id}` - Cancel instance
- `GET /api/v1/process-instances/{id}/activity-instances` - Get activities
- `GET /api/v1/history/activity-instances` - Get activity history
- `GET /api/v1/tasks` - List tasks
- `GET /api/v1/tasks/{id}` - Get task details
- `GET /api/v1/tasks/{id}/form-variables` - Get task form
- `POST /api/v1/tasks/{id}/complete` - Complete task
- `POST /api/v1/tasks/{id}/claim` - Claim task
- `POST /api/v1/tasks/{id}/unclaim` - Unclaim task
- `GET /api/v1/statistics` - Get workflow stats

## Customization

### Styling
All components use Tailwind CSS and can be customized by:
- Modifying the component class names
- Updating the shadcn/ui theme
- Adding custom CSS

### Translations
Add workflow-related translations to your i18n files for internationalization support.

### Additional Features
Consider adding:
- Process diagram visualization (BPMN.js integration)
- Advanced search and filtering
- Bulk operations
- Export functionality
- Notifications system
- Process metrics dashboard
- User preferences for auto-refresh intervals
