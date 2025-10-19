# Clerk-Camunda Proxy

FastAPI-based authentication proxy that transforms Clerk JWT tokens into Camunda Engine BasicAuth credentials, enabling secure integration between Clerk-authenticated Next.js frontends and local Guru Framework (Camunda) engines.

## Features

- **JWT Verification**: Validates Clerk JWTs using JWKS endpoint
- **Authentication Translation**: Converts JWT bearer tokens to BasicAuth for Camunda Engine
- **User Context Injection**: Automatically adds user information to process variables
- **Complete API Coverage**: All essential Camunda REST endpoints proxied
- **Production Ready**: Error handling, logging, health checks, and Docker support
- **Type Safe**: Full Pydantic validation for requests and responses
- **Async Performance**: Built on FastAPI with async/await throughout

## Architecture

```
Next.js Frontend (Clerk Auth)
       ↓ JWT Bearer Token
FastAPI Proxy (this service)
       ↓ BasicAuth (demo:demo)
Camunda Engine (localhost:8080)
```

## Prerequisites

- Python 3.11+
- Camunda Engine running locally (default: http://localhost:8080)
- Clerk account with JWKS URL

## Quick Start

### 1. Installation

```bash
cd fastapi-proxy
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configuration

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Required: Get this from Clerk Dashboard → API Keys
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json

# Camunda Engine settings
ENGINE_URL=http://localhost:8080/engine-rest
ENGINE_USER=demo
ENGINE_PASS=demo

# CORS for your Next.js app
CORS_ORIGINS=http://localhost:3000
```

### 3. Run the Server

```bash
# Development mode with auto-reload
uvicorn main:app --reload --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at: http://localhost:8000

Interactive API docs: http://localhost:8000/docs

### 4. Docker Deployment (Optional)

```bash
# Build image
docker build -t clerk-camunda-proxy .

# Run container
docker run -d \
  --name clerk-camunda-proxy \
  --env-file .env \
  -p 8000:8000 \
  clerk-camunda-proxy
```

## API Endpoints

### Health Check

```bash
GET /health
```

No authentication required. Returns service and engine status.

### Process Definitions

```bash
# List all process definitions
GET /api/processes
Authorization: Bearer <clerk-jwt>

# Get specific process definition
GET /api/processes/{key}
Authorization: Bearer <clerk-jwt>

# Get start form variables
GET /api/processes/{key}/form
Authorization: Bearer <clerk-jwt>
```

### Process Instances

```bash
# Start new process instance
POST /api/processes/{key}/start
Authorization: Bearer <clerk-jwt>
Content-Type: application/json

{
  "variables": {
    "customerName": "John Doe",
    "amount": 1000
  },
  "businessKey": "order-12345"  // optional
}

# List process instances
GET /api/instances
GET /api/instances?processDefinitionKey=order-process
Authorization: Bearer <clerk-jwt>

# Get specific instance
GET /api/instances/{instanceId}
Authorization: Bearer <clerk-jwt>

# Get instance variables
GET /api/instances/{instanceId}/variables
Authorization: Bearer <clerk-jwt>
```

### Tasks

```bash
# List tasks
GET /api/tasks
GET /api/tasks?assignee=user123
GET /api/tasks?processInstanceId=abc-123
Authorization: Bearer <clerk-jwt>

# Get task form variables
GET /api/tasks/{taskId}/form
Authorization: Bearer <clerk-jwt>

# Complete task
POST /api/tasks/{taskId}/complete
Authorization: Bearer <clerk-jwt>
Content-Type: application/json

{
  "variables": {
    "approved": true,
    "comments": "Looks good"
  }
}
```

## User Context Injection

When starting a process, the proxy automatically adds user information from the JWT:

```javascript
// Frontend sends
{
  "variables": {
    "customerName": "ACME Corp"
  }
}

// Engine receives
{
  "variables": {
    "customerName": { "value": "ACME Corp", "type": "String" },
    "initiator": { "value": "user_2abc123", "type": "String" },
    "initiatorEmail": { "value": "john@example.com", "type": "String" },
    "initiatorName": { "value": "John Doe", "type": "String" }
  }
}
```

These variables can be used in your BPMN processes for:
- Assignee expressions: `${initiator}`
- Audit trails: Track who started each process
- Business logic: User-specific workflows

## Next.js Integration

### Example API Client

```typescript
// lib/camunda-api.ts
import { useAuth } from '@clerk/nextjs';

export function useCamundaAPI() {
  const { getToken } = useAuth();

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();

    const response = await fetch(`http://localhost:8000${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  };

  return {
    // Process definitions
    getProcesses: () => apiCall('/api/processes'),
    getProcess: (key: string) => apiCall(`/api/processes/${key}`),
    getStartForm: (key: string) => apiCall(`/api/processes/${key}/form`),

    // Process instances
    startProcess: (key: string, variables: any, businessKey?: string) =>
      apiCall(`/api/processes/${key}/start`, {
        method: 'POST',
        body: JSON.stringify({ variables, businessKey }),
      }),

    getInstances: (processKey?: string) => {
      const params = processKey ? `?processDefinitionKey=${processKey}` : '';
      return apiCall(`/api/instances${params}`);
    },

    getInstance: (id: string) => apiCall(`/api/instances/${id}`),
    getInstanceVariables: (id: string) => apiCall(`/api/instances/${id}/variables`),

    // Tasks
    getTasks: (assignee?: string, instanceId?: string) => {
      const params = new URLSearchParams();
      if (assignee) params.append('assignee', assignee);
      if (instanceId) params.append('processInstanceId', instanceId);
      const query = params.toString() ? `?${params}` : '';
      return apiCall(`/api/tasks${query}`);
    },

    getTaskForm: (taskId: string) => apiCall(`/api/tasks/${taskId}/form`),

    completeTask: (taskId: string, variables: any) =>
      apiCall(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ variables }),
      }),
  };
}
```

### Example Component

```typescript
// app/processes/page.tsx
'use client';

import { useCamundaAPI } from '@/lib/camunda-api';
import { useEffect, useState } from 'react';

export default function ProcessesPage() {
  const api = useCamundaAPI();
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProcesses()
      .then(setProcesses)
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (processKey: string) => {
    const variables = {
      requestDate: new Date().toISOString(),
      // Add your process variables
    };

    const instance = await api.startProcess(processKey, variables);
    console.log('Started instance:', instance.id);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Available Processes</h1>
      {processes.map((process: any) => (
        <div key={process.id}>
          <h2>{process.name || process.key}</h2>
          <button onClick={() => handleStart(process.key)}>
            Start Process
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

The proxy returns consistent error responses:

```json
{
  "error": "Error message",
  "detail": "Additional details",
  "timestamp": "2025-01-18T12:00:00Z"
}
```

HTTP Status Codes:
- `401` - Invalid or missing JWT token
- `404` - Resource not found (process, task, instance)
- `500` - Internal server error
- `502` - Camunda Engine error or unreachable
- `504` - Engine request timeout

## Development

### Project Structure

```
fastapi-proxy/
├── main.py              # FastAPI app and endpoints
├── auth.py              # Clerk JWT verification
├── camunda_client.py    # Camunda Engine HTTP client
├── models.py            # Pydantic models
├── config.py            # Configuration management
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
├── Dockerfile           # Container definition
└── README.md           # This file
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### Code Quality

```bash
# Format code
black .

# Lint
ruff check .

# Type checking
mypy .
```

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLERK_JWKS_URL` | Yes | - | Clerk JWKS endpoint for JWT verification |
| `CLERK_AUDIENCE` | No | - | JWT audience claim to validate |
| `ENGINE_URL` | No | `http://localhost:8080/engine-rest` | Camunda Engine REST API URL |
| `ENGINE_USER` | No | `demo` | Engine BasicAuth username |
| `ENGINE_PASS` | No | `demo` | Engine BasicAuth password |
| `ENGINE_TIMEOUT` | No | `30` | Request timeout in seconds |
| `CORS_ORIGINS` | No | `["http://localhost:3000"]` | Allowed CORS origins (comma-separated) |
| `APP_NAME` | No | `Clerk-Camunda Proxy` | Application name |
| `DEBUG` | No | `false` | Enable debug mode |
| `LOG_LEVEL` | No | `INFO` | Logging level |

## Security Considerations

1. **HTTPS Required**: In production, always use HTTPS for the proxy
2. **CORS Configuration**: Restrict `CORS_ORIGINS` to your actual frontend domain
3. **Engine Credentials**: Use strong BasicAuth credentials for Camunda Engine
4. **JWT Validation**: The proxy validates JWT signature, expiration, and issuer
5. **Network Isolation**: Consider running the proxy in a private network with the Engine

## Troubleshooting

### "Cannot connect to Engine"

- Verify Engine is running: `curl http://localhost:8080/engine-rest/version`
- Check `ENGINE_URL` in `.env`
- Ensure no firewall blocking connection

### "Invalid authentication token"

- Verify `CLERK_JWKS_URL` is correct in `.env`
- Check token is not expired
- Ensure frontend is sending token in `Authorization: Bearer <token>` header

### "CORS error in browser"

- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Restart the proxy after changing `.env`

## License

MIT

## Support

For issues and questions:
- Check the [FastAPI documentation](https://fastapi.tiangolo.com/)
- Review [Camunda REST API docs](https://docs.camunda.org/manual/latest/reference/rest/)
- Open an issue in the project repository
