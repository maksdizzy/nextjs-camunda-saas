# Workflow UI Quick Start Guide

Complete Next.js workflow management UI for Guru Framework BPMN engine integration.

## Installation (3 steps)

### 1. Install Dependencies

```bash
npm install @tanstack/react-query date-fns
```

### 2. Configure Environment

Add to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Update Dashboard Navigation

Edit `/src/app/[locale]/(auth)/dashboard/layout.tsx` and add workflow menu items:

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
  // ... existing menu items
]}
```

## Done!

Your workflow UI is ready. Visit:

- `/workflows` - Browse and start processes
- `/workflows/tasks` - View and complete tasks
- `/workflows/instances` - Manage process instances

## File Structure

```
src/
├── types/
│   └── workflow.ts                           # TypeScript types
├── lib/
│   └── api/
│       └── workflows.ts                      # API client with Clerk auth
├── hooks/
│   ├── useProcesses.ts                       # Process queries
│   ├── useTasks.ts                           # Task queries
│   └── useProcessInstance.ts                 # Instance queries
├── components/
│   ├── ui/
│   │   ├── card.tsx                          # Card component
│   │   └── skeleton.tsx                      # Loading skeleton
│   └── workflows/
│       ├── StatusBadge.tsx                   # Status indicator
│       ├── ProcessCard.tsx                   # Process card
│       ├── TaskCard.tsx                      # Task card
│       ├── InstanceCard.tsx                  # Instance card
│       ├── VariableInput.tsx                 # Variable input
│       └── DynamicForm.tsx                   # Dynamic form
├── providers/
│   └── QueryProvider.tsx                     # React Query provider
└── app/
    └── [locale]/
        └── (auth)/
            └── workflows/
                ├── layout.tsx                # Workflow layout
                ├── page.tsx                  # Process list
                ├── [processKey]/
                │   └── start/
                │       └── page.tsx          # Start process
                ├── tasks/
                │   ├── page.tsx              # Task list
                │   └── [taskId]/
                │       └── page.tsx          # Complete task
                └── instances/
                    ├── page.tsx              # Instance list
                    └── [id]/
                        └── page.tsx          # Instance details
```

## Features

### Process Management
- Browse all available BPMN processes
- Start processes with dynamic forms
- Search and filter processes

### Task Management
- View all assigned and unassigned tasks
- Claim unassigned tasks
- Complete tasks with dynamic forms
- Auto-refresh every 30 seconds

### Instance Management
- View all process instances
- Filter by status (active, completed, suspended)
- Suspend/resume instances
- Cancel running instances
- View instance details, variables, and timeline

### UI/UX Features
- Responsive design (mobile-first)
- Loading skeletons
- Error handling with retry
- Empty states
- Real-time updates
- WCAG 2.1 AA accessible

## Supported Variable Types

- **String** - Text input with validation
- **Integer/Long** - Number input
- **Boolean** - Checkbox
- **Date** - Date picker
- **Enum** - Select dropdown

## API Integration

The UI automatically integrates with your FastAPI backend at `NEXT_PUBLIC_API_URL`.

### Required Endpoints

All standard Camunda REST API endpoints should be proxied through your FastAPI backend:

- Process Definitions: `/api/v1/process-definitions/*`
- Process Instances: `/api/v1/process-instances/*`
- Tasks: `/api/v1/tasks/*`
- History: `/api/v1/history/*`

### Authentication

Uses Clerk authentication automatically. JWT token is injected in all API calls via the `Authorization` header.

## Development

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/workflows`

### Type Checking

```bash
npm run check-types
```

### Linting

```bash
npm run lint
```

## Customization

### Styling

All components use Tailwind CSS. Customize by:

1. Modifying component class names
2. Updating shadcn/ui theme
3. Adding custom CSS

### Auto-Refresh Intervals

Edit the hooks to change refresh intervals:

```typescript
// src/hooks/useTasks.ts
refetchInterval: 30 * 1000, // Change to your desired interval
```

### Add Translations

Add workflow-related translations to your i18n files:

```json
{
  "Workflows": {
    "title": "Workflows",
    "tasks": "My Tasks",
    "instances": "Instances"
  }
}
```

## Troubleshooting

### API Connection Issues

1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Ensure FastAPI backend is running
3. Check browser console for CORS errors
4. Verify Clerk authentication is working

### Build Errors

If you get TypeScript errors:

```bash
npm run check-types
```

If you get import errors:

```bash
rm -rf .next
npm run dev
```

### Missing Components

If shadcn/ui components are missing, install them:

```bash
npx shadcn-ui@latest add button card input label separator skeleton badge form
```

## Production Deployment

1. Update `NEXT_PUBLIC_API_URL` to production API URL
2. Build the application:

```bash
npm run build
```

3. Test the production build:

```bash
npm run start
```

4. Deploy to your hosting platform (Vercel, etc.)

## Advanced Features (Optional)

Consider adding:

- Process diagram visualization (BPMN.js)
- Real-time notifications (WebSocket)
- Advanced search and filtering
- Bulk operations
- Export functionality
- Process metrics dashboard
- Comments and collaboration

## Support

For detailed documentation, see `WORKFLOW_UI_SETUP.md`

## License

Same as the parent Next.js application.
