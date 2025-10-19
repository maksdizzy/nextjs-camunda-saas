# API Examples

Complete examples for all proxy endpoints with curl and JavaScript/TypeScript.

## Prerequisites

All authenticated endpoints require a Clerk JWT token in the Authorization header:

```bash
Authorization: Bearer <your-clerk-jwt-token>
```

Get your token from Next.js:
```javascript
const { getToken } = useAuth();
const token = await getToken();
```

## Health Check

**Endpoint**: `GET /health`
**Authentication**: Not required

### curl

```bash
curl http://localhost:8000/health
```

### JavaScript

```javascript
const response = await fetch('http://localhost:8000/health');
const health = await response.json();
console.log(health);
```

### Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-18T12:00:00.000Z",
  "engine_url": "http://localhost:8080/engine-rest",
  "engine_reachable": true
}
```

## Process Definitions

### List All Processes

**Endpoint**: `GET /api/processes`
**Authentication**: Required

#### curl

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/processes
```

#### JavaScript

```javascript
const api = useCamundaAPI();
const processes = await api.getProcesses();
```

#### Response

```json
[
  {
    "id": "invoice-process:1:d5f8a9b1-123",
    "key": "invoice-process",
    "name": "Invoice Approval Process",
    "version": 1,
    "deploymentId": "abc-123",
    "suspended": false
  }
]
```

### Get Process by Key

**Endpoint**: `GET /api/processes/{key}`
**Authentication**: Required

#### curl

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/processes/invoice-process
```

#### JavaScript

```javascript
const process = await api.getProcess('invoice-process');
```

### Get Start Form Variables

**Endpoint**: `GET /api/processes/{key}/form`
**Authentication**: Required

#### curl

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/processes/invoice-process/form
```

#### JavaScript

```javascript
const formVars = await api.getStartForm('invoice-process');
```

#### Response

```json
{
  "amount": {
    "value": null,
    "type": "Double"
  },
  "invoiceNumber": {
    "value": null,
    "type": "String"
  }
}
```

## Process Instances

### Start Process Instance

**Endpoint**: `POST /api/processes/{key}/start`
**Authentication**: Required

#### curl

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "amount": 1500.50,
      "invoiceNumber": "INV-2025-001",
      "vendor": "ACME Corp"
    },
    "businessKey": "invoice-001"
  }' \
  http://localhost:8000/api/processes/invoice-process/start
```

#### JavaScript

```javascript
const instance = await api.startProcess('invoice-process', {
  amount: 1500.50,
  invoiceNumber: 'INV-2025-001',
  vendor: 'ACME Corp'
}, 'invoice-001');  // businessKey is optional
```

#### TypeScript Example

```typescript
interface InvoiceVariables {
  amount: number;
  invoiceNumber: string;
  vendor: string;
}

const startInvoiceProcess = async (vars: InvoiceVariables, businessKey?: string) => {
  const api = useCamundaAPI();
  const instance = await api.startProcess('invoice-process', vars, businessKey);
  return instance;
};
```

#### Response

```json
{
  "id": "abc-123-def-456",
  "definitionId": "invoice-process:1:d5f8a9b1-123",
  "businessKey": "invoice-001",
  "ended": false,
  "suspended": false
}
```

**Note**: The proxy automatically adds these variables:
- `initiator`: User ID from JWT (`user_2abc123`)
- `initiatorEmail`: User email
- `initiatorName`: User full name

### List Process Instances

**Endpoint**: `GET /api/instances`
**Authentication**: Required

#### curl

```bash
# All instances
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/instances

# Filter by process key
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/instances?processDefinitionKey=invoice-process"
```

#### JavaScript

```javascript
// All instances
const instances = await api.getInstances();

// Filter by process key
const invoiceInstances = await api.getInstances('invoice-process');
```

### Get Process Instance

**Endpoint**: `GET /api/instances/{instanceId}`
**Authentication**: Required

#### curl

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/instances/abc-123-def-456
```

#### JavaScript

```javascript
const instance = await api.getInstance('abc-123-def-456');
```

### Get Instance Variables

**Endpoint**: `GET /api/instances/{instanceId}/variables`
**Authentication**: Required

#### curl

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/instances/abc-123-def-456/variables
```

#### JavaScript

```javascript
const variables = await api.getInstanceVariables('abc-123-def-456');
```

#### Response

```json
{
  "amount": {
    "value": 1500.50,
    "type": "Double"
  },
  "invoiceNumber": {
    "value": "INV-2025-001",
    "type": "String"
  },
  "initiator": {
    "value": "user_2abc123",
    "type": "String"
  },
  "initiatorEmail": {
    "value": "john@example.com",
    "type": "String"
  }
}
```

## Tasks

### List All Tasks

**Endpoint**: `GET /api/tasks`
**Authentication**: Required

#### curl

```bash
# All tasks
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/tasks

# Filter by assignee
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/tasks?assignee=user_2abc123"

# Filter by process instance
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/tasks?processInstanceId=abc-123-def-456"
```

#### JavaScript

```javascript
// All tasks
const tasks = await api.getTasks();

// Filter by assignee
const myTasks = await api.getTasks('user_2abc123');

// Filter by instance
const instanceTasks = await api.getTasks(null, 'abc-123-def-456');
```

#### Response

```json
[
  {
    "id": "task-123",
    "name": "Approve Invoice",
    "assignee": "user_2abc123",
    "created": "2025-01-18T12:00:00.000Z",
    "due": null,
    "processInstanceId": "abc-123-def-456",
    "processDefinitionId": "invoice-process:1:d5f8a9b1-123",
    "taskDefinitionKey": "approveInvoice",
    "formKey": null,
    "priority": 50,
    "suspended": false
  }
]
```

### Get Task

**Endpoint**: `GET /api/tasks/{taskId}`
**Authentication**: Required

#### curl

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/tasks/task-123
```

#### JavaScript

```javascript
const task = await api.getTask('task-123');
```

### Get Task Form Variables

**Endpoint**: `GET /api/tasks/{taskId}/form`
**Authentication**: Required

#### curl

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/tasks/task-123/form
```

#### JavaScript

```javascript
const formVars = await api.getTaskForm('task-123');
```

#### Response

```json
{
  "amount": {
    "value": 1500.50,
    "type": "Double"
  },
  "approved": {
    "value": null,
    "type": "Boolean"
  },
  "comments": {
    "value": null,
    "type": "String"
  }
}
```

### Complete Task

**Endpoint**: `POST /api/tasks/{taskId}/complete`
**Authentication**: Required

#### curl

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "approved": true,
      "comments": "Invoice approved - payment authorized"
    }
  }' \
  http://localhost:8000/api/tasks/task-123/complete
```

#### JavaScript

```javascript
await api.completeTask('task-123', {
  approved: true,
  comments: 'Invoice approved - payment authorized'
});
```

#### TypeScript Example

```typescript
interface ApprovalVariables {
  approved: boolean;
  comments: string;
}

const approveInvoice = async (taskId: string, comments: string) => {
  const api = useCamundaAPI();
  await api.completeTask(taskId, {
    approved: true,
    comments
  } as ApprovalVariables);
};
```

#### Response

204 No Content (success)

## Complete Workflow Examples

### Example 1: Invoice Approval Flow

```javascript
'use client';

import { useCamundaAPI } from '@/lib/camunda-api';
import { useState } from 'react';

export default function InvoiceFlow() {
  const api = useCamundaAPI();
  const [instanceId, setInstanceId] = useState('');

  // Step 1: Start process
  const submitInvoice = async (amount: number, vendor: string) => {
    const instance = await api.startProcess('invoice-process', {
      amount,
      vendor,
      submittedDate: new Date().toISOString()
    });
    setInstanceId(instance.id);
    return instance.id;
  };

  // Step 2: Get approval task
  const getApprovalTask = async (instanceId: string) => {
    const tasks = await api.getTasks(null, instanceId);
    return tasks.find(t => t.taskDefinitionKey === 'approveInvoice');
  };

  // Step 3: Approve invoice
  const approveInvoice = async (taskId: string, approved: boolean) => {
    await api.completeTask(taskId, {
      approved,
      approvedDate: new Date().toISOString()
    });
  };

  // Complete flow
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Start process
    const instanceId = await submitInvoice(
      Number(formData.get('amount')),
      formData.get('vendor') as string
    );

    // Wait a moment for task creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get task
    const task = await getApprovalTask(instanceId);
    if (task) {
      // Auto-approve small invoices
      const amount = Number(formData.get('amount'));
      if (amount < 1000) {
        await approveInvoice(task.id, true);
        alert('Invoice auto-approved!');
      } else {
        alert('Invoice submitted for manual approval');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="vendor" placeholder="Vendor" required />
      <input name="amount" type="number" placeholder="Amount" required />
      <button type="submit">Submit Invoice</button>
    </form>
  );
}
```

### Example 2: User Task List

```javascript
'use client';

import { useCamundaAPI } from '@/lib/camunda-api';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function MyTasks() {
  const api = useCamundaAPI();
  const { user } = useUser();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (user) {
      // Get tasks assigned to current user
      api.getTasks(user.id)
        .then(setTasks)
        .catch(console.error);
    }
  }, [user]);

  const handleComplete = async (taskId: string, formData: any) => {
    await api.completeTask(taskId, formData);
    // Refresh task list
    const updated = await api.getTasks(user.id);
    setTasks(updated);
  };

  return (
    <div>
      <h1>My Tasks ({tasks.length})</h1>
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onComplete={handleComplete}
        />
      ))}
    </div>
  );
}
```

### Example 3: Process Instance Monitoring

```javascript
'use client';

import { useCamundaAPI } from '@/lib/camunda-api';
import { useEffect, useState } from 'react';

export default function ProcessMonitor() {
  const api = useCamundaAPI();
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [variables, setVariables] = useState({});

  useEffect(() => {
    // Poll for instances every 5 seconds
    const interval = setInterval(async () => {
      const data = await api.getInstances('invoice-process');
      setInstances(data);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const showDetails = async (instanceId: string) => {
    const instance = await api.getInstance(instanceId);
    const vars = await api.getInstanceVariables(instanceId);
    setSelectedInstance(instance);
    setVariables(vars);
  };

  return (
    <div>
      <h1>Active Processes ({instances.length})</h1>
      {instances.map(instance => (
        <div key={instance.id} onClick={() => showDetails(instance.id)}>
          <p>ID: {instance.id}</p>
          <p>Business Key: {instance.businessKey}</p>
          <p>Status: {instance.ended ? 'Completed' : 'Active'}</p>
        </div>
      ))}

      {selectedInstance && (
        <div>
          <h2>Instance Details</h2>
          <pre>{JSON.stringify(variables, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "detail": "Additional details",
  "timestamp": "2025-01-18T12:00:00.000Z"
}
```

### JavaScript Error Handling

```javascript
try {
  const instance = await api.startProcess('invalid-key', {});
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Process definition not found');
  } else if (error.message.includes('authentication')) {
    console.error('Token expired or invalid');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### TypeScript Error Handling

```typescript
interface APIError {
  error: string;
  detail?: string;
  timestamp: string;
}

const handleAPIError = (error: any) => {
  const apiError = error as APIError;

  switch (true) {
    case apiError.error.includes('authentication'):
      // Redirect to login or refresh token
      break;
    case apiError.error.includes('not found'):
      // Show not found message
      break;
    default:
      // Generic error handling
      break;
  }
};
```

## Rate Limiting Considerations

The proxy doesn't implement rate limiting, but you should:

1. Cache process definitions (they rarely change)
2. Debounce task list refreshes
3. Use WebSocket or polling with appropriate intervals
4. Implement client-side request queuing for bulk operations

```javascript
// Example: Cache process definitions
const processCache = new Map();

const getCachedProcess = async (key: string) => {
  if (processCache.has(key)) {
    return processCache.get(key);
  }

  const process = await api.getProcess(key);
  processCache.set(key, process);
  return process;
};
```
