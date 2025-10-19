# Self-Hosted Guru Framework Setup

**Solution**: Run Your Own Guru Engine + Minimal Flow API Proxy
**Goal**: Independent deployment without relying on external Flow API
**Status**: ✅ **RECOMMENDED - Complete Control**

---

## 🎯 Architecture: Simplified Self-Hosted Stack

```
┌─────────────────────────────────────────┐
│     Next.js Frontend (Port 3001)        │
│  - Clerk authentication                 │
│  - BPMN UI components                   │
│  - Real-time workflow monitoring        │
└──────────────┬──────────────────────────┘
               │ HTTP + Clerk JWT
               │
┌──────────────▼──────────────────────────┐
│  Minimal FastAPI Proxy (Port 8000)      │
│  - Clerk JWT verification ✅            │
│  - User → Camunda credential mapping    │
│  - Thin wrapper around Engine REST API  │
└──────────────┬──────────────────────────┘
               │ BasicAuth (demo:demo or user:pass)
               │
┌──────────────▼──────────────────────────┐
│  Guru Engine (Camunda) (Port 8080)      │
│  FROM: guru-framework/engine/           │
│  - BPMN execution                        │
│  - Built-in H2 database OR Postgres     │
│  - Demo user: demo/demo                  │
└──────────────┬──────────────────────────┘
               │ External Task Polling
               │
┌──────────────▼──────────────────────────┐
│  Python Workers (guru-framework/worker) │
│  - Custom BPMN task handlers            │
│  - Wallet operations, API calls, etc.   │
└──────────────────────────────────────────┘
```

**What You Control**:
- ✅ Guru Engine (Java/Spring Boot)
- ✅ Python Workers
- ✅ Minimal FastAPI proxy (you build)
- ✅ Next.js frontend (you build)
- ✅ All data stays local

**What You DON'T Need**:
- ❌ External Flow API team coordination
- ❌ Complex multi-tenant infrastructure
- ❌ Thirdweb integration (unless you want it)

---

## 📁 Project Structure

```
content-gen/
├── guru-framework/              # Existing (already cloned)
│   ├── engine/                  # Camunda BPMN Engine
│   ├── worker/                  # Python workers
│   └── docker-compose.yaml      # Infrastructure
│
├── fastapi-proxy/               # NEW - You build this
│   ├── main.py
│   ├── auth.py                  # Clerk JWT verification
│   ├── camunda_client.py        # Engine REST client
│   ├── models.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── src/                         # Existing Next.js (modify)
│   ├── lib/api/
│   │   └── workflows.ts         # API client for proxy
│   └── app/workflows/
│       └── page.tsx             # Workflow UI
│
└── docker-compose.override.yaml # NEW - Tie it all together
```

---

## 🚀 Implementation Plan

### Phase 1: Start Guru Engine Locally (30 minutes)

**Step 1: Configure Engine**

Create `/Users/maksdizzy/repos/content-gen/guru-framework/engine/.env`:
```bash
# Database (use H2 for simplicity, or Postgres for production)
BBPA_ENGINE_DB_URL=jdbc:h2:mem:workflow
BBPA_ENGINE_DB_USER=workflow
BBPA_ENGINE_DB_PASS=workflow
BBPA_ENGINE_DB_DRIVER_CLASS=org.h2.Driver
BBPA_ENGINE_DB_DRIVER=h2

# JWT Authentication (optional, can use demo:demo initially)
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256

# Disable optional features
INSCRIPTIONS_HISTORY_ENABLED=false
RABBITMQ_ENABLED=false
```

**Step 2: Start Engine**

```bash
cd /Users/maksdizzy/repos/content-gen/guru-framework/engine

# Build and start
docker-compose up -d

# Verify it's running
curl http://localhost:8080/engine-rest/process-definition
# Expected: JSON list of process definitions
```

**Step 3: Access Camunda Cockpit**

- Open: http://localhost:8080/camunda/app/welcome/default/
- Login: `demo` / `demo`
- ✅ Should see Camunda admin interface

---

### Phase 2: Build Minimal FastAPI Proxy (2-3 hours)

**Why?** To handle Clerk JWT → Camunda BasicAuth transformation

**File**: `/Users/maksdizzy/repos/content-gen/fastapi-proxy/main.py`

```python
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from typing import Optional
import jwt
from jwt import PyJWKClient

app = FastAPI(title="Guru Framework Proxy")

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
CLERK_JWKS_URL = os.getenv(
    "CLERK_JWKS_URL",
    "https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json"
)
ENGINE_URL = os.getenv("ENGINE_URL", "http://localhost:8080/engine-rest")
ENGINE_USER = os.getenv("ENGINE_USER", "demo")
ENGINE_PASS = os.getenv("ENGINE_PASS", "demo")

# Clerk JWT verification
jwks_client = PyJWKClient(CLERK_JWKS_URL)

async def verify_clerk_jwt(authorization: str = Header(None)) -> dict:
    """Verify Clerk JWT and return user claims"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")

    token = authorization.split(" ")[1]

    try:
        # Get signing key from Clerk's JWKS
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Verify and decode JWT
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}  # Clerk doesn't always set aud
        )

        return claims
    except Exception as e:
        raise HTTPException(401, f"Invalid JWT: {str(e)}")


# Camunda client
async def camunda_request(
    method: str,
    endpoint: str,
    data: dict = None,
    params: dict = None
):
    """Make authenticated request to Camunda Engine"""
    url = f"{ENGINE_URL}/{endpoint}"

    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=method,
            url=url,
            json=data,
            params=params,
            auth=httpx.BasicAuth(ENGINE_USER, ENGINE_PASS),
            timeout=30.0
        )

        response.raise_for_status()
        return response.json() if response.text else None


# API Endpoints

@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/processes")
async def get_processes(claims: dict = Depends(verify_clerk_jwt)):
    """List all process definitions"""
    processes = await camunda_request("GET", "process-definition")
    return processes


@app.post("/api/processes/{key}/start")
async def start_process(
    key: str,
    variables: dict,
    claims: dict = Depends(verify_clerk_jwt)
):
    """Start a process instance"""
    # Add user identity to process variables
    variables["clerk_user_id"] = {"value": claims.get("sub"), "type": "String"}
    variables["email"] = {"value": claims.get("email"), "type": "String"}

    result = await camunda_request(
        "POST",
        f"process-definition/key/{key}/start",
        data={"variables": variables}
    )
    return result


@app.get("/api/tasks")
async def get_tasks(claims: dict = Depends(verify_clerk_jwt)):
    """Get all tasks (simplified - not user-filtered yet)"""
    tasks = await camunda_request("GET", "task")
    return tasks


@app.post("/api/tasks/{task_id}/complete")
async def complete_task(
    task_id: str,
    variables: dict,
    claims: dict = Depends(verify_clerk_jwt)
):
    """Complete a task"""
    await camunda_request(
        "POST",
        f"task/{task_id}/complete",
        data={"variables": variables}
    )
    return {"success": True}


@app.get("/api/instances")
async def get_instances(claims: dict = Depends(verify_clerk_jwt)):
    """Get process instances"""
    instances = await camunda_request("GET", "process-instance")
    return instances


@app.get("/api/instances/{id}")
async def get_instance(
    id: str,
    claims: dict = Depends(verify_clerk_jwt)
):
    """Get process instance details"""
    instance = await camunda_request("GET", f"process-instance/{id}")
    return instance
```

**File**: `/Users/maksdizzy/repos/content-gen/fastapi-proxy/requirements.txt`

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
httpx==0.25.1
pyjwt==2.8.0
cryptography==41.0.7
python-dotenv==1.0.0
```

**File**: `/Users/maksdizzy/repos/content-gen/fastapi-proxy/.env`

```bash
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
ENGINE_URL=http://localhost:8080/engine-rest
ENGINE_USER=demo
ENGINE_PASS=demo
```

**Run FastAPI Proxy**:

```bash
cd /Users/maksdizzy/repos/content-gen/fastapi-proxy

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000

# Test
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

---

### Phase 3: Update Next.js to Use Local Proxy (1-2 hours)

**File**: `/Users/maksdizzy/repos/content-gen/src/lib/api/workflows.ts`

```typescript
import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useWorkflowApi = () => {
  const { getToken } = useAuth();

  const request = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  };

  return {
    // Process operations
    getProcesses: () => request('/api/processes'),

    startProcess: (key: string, variables: Record<string, any>) =>
      request(`/api/processes/${key}/start`, {
        method: 'POST',
        body: JSON.stringify(variables),
      }),

    // Task operations
    getTasks: () => request('/api/tasks'),

    completeTask: (taskId: string, variables: Record<string, any>) =>
      request(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify(variables),
      }),

    // Instance operations
    getInstances: () => request('/api/instances'),

    getInstance: (id: string) => request(`/api/instances/${id}`),
  };
};
```

**File**: `/Users/maksdizzy/repos/content-gen/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

### Phase 4: Docker Compose Everything Together (Optional)

**File**: `/Users/maksdizzy/repos/content-gen/docker-compose.yaml`

```yaml
version: '3.8'

services:
  # Guru Engine (Camunda)
  engine:
    build:
      context: ./guru-framework/engine
    ports:
      - "8080:8080"
    environment:
      - BBPA_ENGINE_DB_URL=jdbc:h2:mem:workflow
      - INSCRIPTIONS_HISTORY_ENABLED=false
      - RABBITMQ_ENABLED=false
    networks:
      - guru-net

  # Python Workers
  workers:
    build:
      context: ./guru-framework/worker
    environment:
      - CAMUNDA_URL=http://engine:8080/engine-rest
      - CAMUNDA_USER=demo
      - CAMUNDA_PASSWORD=demo
    depends_on:
      - engine
    networks:
      - guru-net

  # FastAPI Proxy
  proxy:
    build:
      context: ./fastapi-proxy
    ports:
      - "8000:8000"
    environment:
      - ENGINE_URL=http://engine:8080/engine-rest
      - ENGINE_USER=demo
      - ENGINE_PASS=demo
      - CLERK_JWKS_URL=${CLERK_JWKS_URL}
    depends_on:
      - engine
    networks:
      - guru-net

  # Next.js Frontend (optional - usually run separately in dev)
  # frontend:
  #   build:
  #     context: .
  #     dockerfile: Dockerfile
  #   ports:
  #     - "3001:3000"
  #   environment:
  #     - NEXT_PUBLIC_API_URL=http://proxy:8000
  #   depends_on:
  #     - proxy
  #   networks:
  #     - guru-net

networks:
  guru-net:
    driver: bridge
```

---

## 🧪 Testing the Stack

### Step 1: Start All Services

```bash
# Terminal 1: Start Engine + Workers
cd /Users/maksdizzy/repos/content-gen/guru-framework
docker-compose up

# Terminal 2: Start FastAPI Proxy
cd /Users/maksdizzy/repos/content-gen/fastapi-proxy
uvicorn main:app --reload --port 8000

# Terminal 3: Start Next.js
cd /Users/maksdizzy/repos/content-gen
npm run dev -- --port 3001
```

### Step 2: Test End-to-End Flow

1. **Login to Next.js** (http://localhost:3001)
   - Clerk handles authentication
   - JWT token stored in browser

2. **View Processes**
   - Navigate to `/workflows`
   - Should see list of BPMN processes from Engine

3. **Start a Process**
   - Click "Start" on a process
   - Fill in variables
   - Submit → Process instance created in Engine

4. **View Tasks**
   - Navigate to `/tasks`
   - Should see active tasks assigned to you

5. **Complete Task**
   - Click task → Fill form → Submit
   - Task completed in Engine

### Step 3: Verify in Camunda Cockpit

- Open: http://localhost:8080/camunda
- Login: demo/demo
- Check "Processes" tab → See your running instances
- Check "Tasks" tab → See active/completed tasks

---

## 📊 Comparison: Self-Hosted vs External Flow API

| Aspect | Self-Hosted (This Solution) | External Flow API |
|--------|----------------------------|------------------|
| **Control** | ✅ Full control | ❌ Depends on external team |
| **Customization** | ✅ Modify anything | ⚠️ Limited to API capabilities |
| **Data Privacy** | ✅ All local | ⚠️ Data on external servers |
| **Setup Time** | ⚠️ 1 day initial setup | ✅ Immediate (if auth works) |
| **Maintenance** | ⚠️ You maintain | ✅ Team maintains |
| **Cost** | ✅ Free (local hosting) | ⚠️ May have usage limits |
| **Scalability** | ⚠️ You scale | ✅ Already scaled |
| **Complexity** | ⚠️ Moderate | ✅ Simple |

**Recommendation**: **Self-Hosted** if:
- ✅ You can't coordinate with Flow API team
- ✅ You need full control and customization
- ✅ Data privacy is important
- ✅ You're building a production app

**Use External Flow API** if:
- ✅ Flow API team can help with auth setup
- ✅ You want fastest path to production
- ✅ You don't need deep customization

---

## 🎯 Next Steps

**Choose your path**:

### **Option A: Self-Hosted (RECOMMENDED for you)**

1. ✅ I'll generate complete FastAPI proxy code
2. ✅ I'll create Next.js workflow UI components
3. ✅ I'll provide step-by-step setup guide
4. ✅ You own everything end-to-end

### **Option B: Hybrid (Best of Both Worlds)**

1. Use self-hosted Engine for development
2. Use external Flow API for production (if auth gets resolved)
3. Same Next.js code works with both

**Which option do you prefer?** Let me know and I'll generate all the code!
