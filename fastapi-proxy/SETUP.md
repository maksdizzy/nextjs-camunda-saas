# FastAPI Proxy Setup Guide

Complete step-by-step guide to get the Clerk-Camunda proxy running.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Python 3.11 or higher installed
- [ ] Camunda Engine running locally at http://localhost:8080
- [ ] Clerk account with a configured application
- [ ] Git (for cloning the repository)

## Step 1: Verify Camunda Engine

First, verify your Camunda Engine is running and accessible:

```bash
# Test engine connectivity
curl -u demo:demo http://localhost:8080/engine-rest/version

# Expected output (example):
# {"version":"7.20.0"}
```

If this fails:
1. Start your Camunda Engine
2. Verify it's running on port 8080
3. Check username/password (default: demo/demo)

## Step 2: Get Clerk JWKS URL

### Option A: From Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to **API Keys**
4. Find your **Frontend API** URL (e.g., `https://enabled-snake-12.clerk.accounts.dev`)
5. Your JWKS URL will be: `https://enabled-snake-12.clerk.accounts.dev/.well-known/jwks.json`

### Option B: From Next.js Environment

If you already have Clerk configured in Next.js:

```bash
# Check your .env.local file
cat .env.local | grep NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Example output:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_enabled-snake-12.clerk.accounts.dev

# Your JWKS URL is:
# https://enabled-snake-12.clerk.accounts.dev/.well-known/jwks.json
```

## Step 3: Install and Configure Proxy

### Quick Setup (Recommended)

```bash
cd /Users/maksdizzy/repos/content-gen/fastapi-proxy

# Copy environment template
cp .env.example .env

# Edit .env with your Clerk JWKS URL
nano .env  # or use your preferred editor
```

Update these required values in `.env`:

```env
# REQUIRED: Update with your actual Clerk JWKS URL
CLERK_JWKS_URL=https://YOUR-CLERK-INSTANCE.clerk.accounts.dev/.well-known/jwks.json

# Optional: Update if your engine uses different settings
ENGINE_URL=http://localhost:8080/engine-rest
ENGINE_USER=demo
ENGINE_PASS=demo

# Optional: Update if your Next.js runs on different port
CORS_ORIGINS=http://localhost:3000
```

### Run Setup Script

```bash
# Make script executable (if not already)
chmod +x run.sh

# Run the proxy
./run.sh
```

The script will:
1. Create a Python virtual environment
2. Install all dependencies
3. Verify Camunda Engine connectivity
4. Start the FastAPI server with auto-reload

### Manual Setup (Alternative)

If the script doesn't work:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

## Step 4: Verify Installation

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-18T...",
  "engine_url": "http://localhost:8080/engine-rest",
  "engine_reachable": true
}
```

If `engine_reachable` is `false`, check your Camunda Engine.

### Test 2: Interactive API Docs

Open in your browser:
```
http://localhost:8000/docs
```

You should see the FastAPI Swagger UI with all endpoints documented.

### Test 3: Authentication Test

Get a JWT token from your Next.js app:

```javascript
// In your Next.js browser console
const { getToken } = await import('@clerk/nextjs');
const token = await getToken();
console.log(token);
```

Test with the token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/processes
```

Expected: List of process definitions (or empty array if none deployed).

## Step 5: Next.js Integration

### Install API Client in Next.js

Create the API client file:

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

    return response.status === 204 ? null : response.json();
  };

  return {
    getProcesses: () => apiCall('/api/processes'),
    startProcess: (key: string, variables: any) =>
      apiCall(`/api/processes/${key}/start`, {
        method: 'POST',
        body: JSON.stringify({ variables }),
      }),
    getTasks: () => apiCall('/api/tasks'),
    completeTask: (taskId: string, variables: any) =>
      apiCall(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ variables }),
      }),
  };
}
```

### Test Integration

Create a test page:

```typescript
// app/test-proxy/page.tsx
'use client';

import { useCamundaAPI } from '@/lib/camunda-api';
import { useEffect, useState } from 'react';

export default function TestProxyPage() {
  const api = useCamundaAPI();
  const [processes, setProcesses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProcesses()
      .then(setProcesses)
      .catch(err => setError(err.message));
  }, []);

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Processes ({processes.length})</h1>
      <pre>{JSON.stringify(processes, null, 2)}</pre>
    </div>
  );
}
```

Visit `http://localhost:3000/test-proxy` to verify.

## Troubleshooting

### Issue: "Cannot connect to Engine"

**Symptoms**: Health check shows `engine_reachable: false`

**Solutions**:
```bash
# 1. Verify engine is running
curl http://localhost:8080/engine-rest/version

# 2. Check engine logs for errors

# 3. Verify credentials in .env
ENGINE_USER=demo
ENGINE_PASS=demo
```

### Issue: "Invalid authentication token"

**Symptoms**: 401 errors when calling authenticated endpoints

**Solutions**:
1. Verify `CLERK_JWKS_URL` in `.env` is correct
2. Check token is not expired (Clerk tokens expire after 1 hour by default)
3. Verify token format: Must be `Bearer <token>`, not just `<token>`

```bash
# Test with correct format
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:8000/api/processes
```

### Issue: CORS errors in browser

**Symptoms**: Browser console shows CORS policy errors

**Solutions**:
```bash
# Update .env with your Next.js URL
CORS_ORIGINS=http://localhost:3000

# Restart the proxy
# CORS changes require restart
```

### Issue: Port 8000 already in use

**Symptoms**: `Address already in use` error

**Solutions**:
```bash
# Option 1: Kill existing process
lsof -ti:8000 | xargs kill -9

# Option 2: Use different port
uvicorn main:app --reload --port 8001

# Update Next.js to use new port
# fetch('http://localhost:8001/api/processes')
```

### Issue: Module import errors

**Symptoms**: `ModuleNotFoundError` when running

**Solutions**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install --force-reinstall -r requirements.txt

# Verify installation
pip list | grep fastapi
```

## Docker Deployment

For production or isolated testing:

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f proxy

# Stop
docker-compose down
```

### Using Docker Directly

```bash
# Build image
docker build -t clerk-camunda-proxy .

# Run container
docker run -d \
  --name proxy \
  -p 8000:8000 \
  --env-file .env \
  --add-host host.docker.internal:host-gateway \
  clerk-camunda-proxy

# View logs
docker logs -f proxy

# Stop
docker stop proxy && docker rm proxy
```

**Note**: Docker containers need `host.docker.internal` to access services on your host machine (like Camunda Engine on localhost:8080).

## Production Deployment

For production deployments:

### 1. Environment Configuration

```env
# Use HTTPS for JWKS
CLERK_JWKS_URL=https://production-instance.clerk.accounts.dev/.well-known/jwks.json

# Use production engine URL
ENGINE_URL=https://camunda-engine.yourdomain.com/engine-rest

# Strong credentials
ENGINE_USER=production_user
ENGINE_PASS=strong_random_password_here

# Production CORS
CORS_ORIGINS=https://yourdomain.com

# Production settings
DEBUG=false
LOG_LEVEL=WARNING
```

### 2. Use Process Manager

```bash
# Install gunicorn for production
pip install gunicorn

# Run with multiple workers
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### 3. Add HTTPS Reverse Proxy

Use nginx or Caddy in front of the FastAPI proxy:

```nginx
# nginx example
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Next Steps

Once everything is working:

1. **Deploy a BPMN Process**: Add a process definition to your Camunda Engine
2. **Test Complete Flow**: Start process → Get tasks → Complete tasks
3. **Add Error Handling**: Implement proper error handling in your Next.js app
4. **Monitor Performance**: Watch logs and add monitoring if needed
5. **Security Review**: Ensure HTTPS, strong credentials, and proper CORS in production

## Support

If you encounter issues not covered here:

1. Check the main [README.md](README.md) for API documentation
2. Review FastAPI logs for detailed error messages
3. Test endpoints using the Swagger UI at `/docs`
4. Verify Camunda Engine separately from the proxy
