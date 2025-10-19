# Next.js + Guru Framework BPMN Integration Architecture

**Project**: Lightweight Next.js Frontend → Guru Engine BPMN Integration
**Date**: 2025-10-18
**Status**: Architecture Specification

---

## 🎯 Project Goals

- **Lightweight Frontend**: Minimal proxy layer, connect directly to deployed Guru Engine
- **User BPMN Triggering**: Users can start workflows, view status, complete tasks from UI
- **Real-time Monitoring**: Display active/completed workflows with live updates
- **Secure Authentication**: Clerk JWT → FastAPI → Guru Engine JWT transformation

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Clerk Auth   │  │ BPMN Trigger │  │ Workflow Dashboard    │ │
│  │ (JWT Token)  │  │ UI Components│  │ (Real-time Status)    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────────────┘ │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP + Clerk JWT
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    FastAPI Proxy Layer                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ JWT Middleware                                              │ │
│  │  - Verify Clerk JWT signature                              │ │
│  │  - Extract user identity (email, ID)                       │ │
│  │  - Create/retrieve Camunda user credentials                │ │
│  │  - Generate Guru Engine-compatible JWT                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Camunda Service Layer                                       │ │
│  │  - Start process instances                                  │ │
│  │  - Get process definitions & forms                          │ │
│  │  - Fetch user tasks (active & history)                      │ │
│  │  - Complete tasks with form variables                       │ │
│  │  - Query process instance status                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────────┘
                            │ BasicAuth (camunda_user_id:camunda_key)
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│              Deployed Guru Engine (Camunda)                     │
│  URL: https://engine-content-generator.apps.gurunetwork.ai     │
│  Credentials: demo/demo OR user-specific via JWT auto-creation │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ JWT Authentication Filter                                   │ │
│  │  - Verify JWT signature (shared secret)                    │ │
│  │  - Auto-create Camunda user if not exists                  │ │
│  │  - Extract camunda_user_id & camunda_key from JWT claims   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ BPMN Runtime Engine                                         │ │
│  │  - Process execution (JS delegates)                         │ │
│  │  - External task polling (Python workers)                   │ │
│  │  - RabbitMQ event bus (optional)                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### Phase 1: User Authentication (Clerk → FastAPI)

1. **User logs in** via Clerk (Next.js frontend)
2. **Clerk generates JWT** with user claims (email, userId, etc.)
3. **Next.js stores JWT** in httpOnly cookie / localStorage
4. **All API requests** include `Authorization: Bearer <clerk-jwt>`

### Phase 2: FastAPI JWT Transformation

```python
# FastAPI Middleware Flow
async def sys_key_or_jwt_depends(request, auth: AuthJWT):
    if request.headers.get("Authorization"):
        # Verify Clerk JWT
        await auth.jwt_required()

        # Extract user identity
        jwt_claims = await auth.get_raw_jwt()
        user_email = jwt_claims.get("email")
        user_id = jwt_claims.get("sub")

        # Get or create Camunda user
        camunda_user = await get_or_create_camunda_user(
            email=user_email,
            clerk_user_id=user_id
        )

        # Return Camunda credentials
        return {
            "camunda_user_id": camunda_user.camunda_user_id,
            "camunda_key": camunda_user.camunda_key
        }
```

### Phase 3: Camunda Engine JWT Auto-Creation

The Guru Engine's `JwtAuthenticationFilter` (Java) handles:
- **JWT signature verification** (shared secret)
- **Auto-user creation**: If user doesn't exist in Camunda, create it
- **Group assignment**: Add user to `camunda-admin` or custom groups

**Reference**: `/Users/maksdizzy/repos/guru-repos/dexguru/engine/src/main/java/ai/hhrdr/chainflow/engine/config/JwtAuthenticationFilter.java`

---

## 📋 API Endpoints Specification

### FastAPI Proxy Layer

#### Base URL
`http://localhost:8000` (local dev)
`https://your-fastapi-proxy.com` (production)

#### Core Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/processes` | GET | List all process definitions | Clerk JWT |
| `/api/processes/:key/start` | POST | Start a process instance | Clerk JWT |
| `/api/processes/:key/form` | GET | Get start form variables | Clerk JWT |
| `/api/tasks` | GET | Get user tasks (active + history) | Clerk JWT |
| `/api/tasks/:taskId` | GET | Get task form variables | Clerk JWT |
| `/api/tasks/:taskId/complete` | POST | Complete task with variables | Clerk JWT |
| `/api/instances` | GET | Get user's process instances | Clerk JWT |
| `/api/instances/:id` | GET | Get process instance details | Clerk JWT |
| `/health` | GET | Health check | Public |

---

## 🔧 Implementation Components

### 1. FastAPI Proxy Layer

**File Structure**:
```
fastapi-proxy/
├── main.py                 # FastAPI app initialization
├── dependencies.py         # JWT auth dependencies
├── services/
│   ├── camunda_service.py  # Camunda client wrapper
│   └── user_service.py     # User management
├── routes/
│   ├── processes.py        # Process-related endpoints
│   ├── tasks.py            # Task-related endpoints
│   └── instances.py        # Process instance endpoints
├── models.py               # Pydantic schemas
├── config.py               # Settings (Clerk, Engine URLs)
└── requirements.txt        # Dependencies
```

**Key Dependencies** (from dex-guru reference):
```python
# requirements.txt
fastapi==0.104.1
async-fastapi-jwt-auth==0.6.0
httpx==0.25.1
pydantic==2.5.0
python-dotenv==1.0.0
```

**Environment Variables**:
```bash
# .env
CLERK_SECRET_KEY=<your-clerk-secret>
ENGINE_URL=https://engine-content-generator.apps.gurunetwork.ai
ENGINE_JWT_SECRET=<shared-with-guru-engine>
ENGINE_JWT_ALGORITHM=HS256
ENGINE_USERNAME=demo
ENGINE_PASSWORD=demo
DATABASE_URL=postgresql://user:pass@localhost/flowapi_db
```

### 2. Next.js Frontend Components

**File Structure**:
```
src/
├── app/
│   └── [locale]/(auth)/
│       └── workflows/
│           ├── page.tsx              # Workflows dashboard
│           ├── [processKey]/
│           │   └── start/page.tsx   # Start process form
│           └── tasks/
│               └── [taskId]/page.tsx # Complete task form
├── components/
│   ├── workflows/
│   │   ├── ProcessList.tsx          # Available processes
│   │   ├── ProcessCard.tsx          # Process definition card
│   │   ├── StartProcessForm.tsx     # Dynamic form renderer
│   │   ├── TaskList.tsx             # User tasks list
│   │   ├── TaskCard.tsx             # Task item component
│   │   ├── CompleteTaskForm.tsx     # Task completion form
│   │   └── ProcessInstanceStatus.tsx # Real-time status widget
│   └── ui/
│       └── (shadcn components)
├── lib/
│   ├── api/
│   │   ├── workflows.ts             # API client for workflows
│   │   └── tasks.ts                 # API client for tasks
│   └── types/
│       └── workflow.ts              # TypeScript types
└── hooks/
    ├── useProcesses.ts              # Fetch processes hook
    ├── useTasks.ts                  # Fetch tasks hook
    └── useProcessInstance.ts        # Fetch instance status
```

### 3. Database Schema (FastAPI)

```sql
-- User mapping table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    camunda_user_id TEXT UNIQUE NOT NULL,
    camunda_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Process instance tracking (optional, for UI optimization)
CREATE TABLE process_instances (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    process_definition_key TEXT NOT NULL,
    business_key TEXT,
    status TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP
);
```

---

## 🚀 Implementation Phases

### Phase 1: FastAPI Proxy Setup (Week 1)

**Tasks**:
1. ✅ Create FastAPI project structure
2. ✅ Implement Clerk JWT verification middleware
3. ✅ Implement user mapping service (Clerk → Camunda)
4. ✅ Create Camunda service wrapper (based on dex-guru reference)
5. ✅ Implement core endpoints:
   - `GET /api/processes` (list process definitions)
   - `POST /api/processes/:key/start` (start process)
   - `GET /api/tasks` (get user tasks)
6. ✅ Test with Postman/curl against deployed engine

**Acceptance Criteria**:
- FastAPI runs locally on port 8000
- Can authenticate with Clerk JWT
- Successfully starts BPMN process on deployed engine
- Returns process instance details

### Phase 2: Next.js UI Components (Week 2)

**Tasks**:
1. ✅ Create `/workflows` dashboard page
2. ✅ Implement ProcessList component (fetch from `/api/processes`)
3. ✅ Implement StartProcessForm (dynamic form based on BPMN start form)
4. ✅ Create TaskList component (fetch user tasks)
5. ✅ Implement CompleteTaskForm (dynamic form for user tasks)
6. ✅ Add real-time status updates (polling or WebSocket)

**Acceptance Criteria**:
- User can view available workflows
- User can start a workflow with input variables
- User sees active tasks assigned to them
- User can complete tasks via form submission

### Phase 3: Real-time Updates & Polish (Week 3)

**Tasks**:
1. ✅ Implement process instance status tracking
2. ✅ Add WebSocket integration for real-time updates (optional)
3. ✅ Create ProcessInstanceStatus widget for dashboard
4. ✅ Add error handling and loading states
5. ✅ Implement pagination for tasks/instances
6. ✅ Add filters (process type, status, date range)

**Acceptance Criteria**:
- Dashboard shows real-time workflow status
- Users see completed/failed processes
- UI is responsive and handles errors gracefully

---

## 📊 Data Flow Examples

### Example 1: Start Process

```typescript
// 1. User clicks "Start Workflow" button
const handleStartProcess = async (processKey: string, variables: Record<string, any>) => {
  // 2. Next.js makes API call with Clerk JWT
  const response = await fetch(`/api/processes/${processKey}/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkJwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ variables })
  });

  // 3. FastAPI proxy:
  //    - Verifies Clerk JWT
  //    - Gets/creates Camunda user
  //    - Calls Guru Engine with BasicAuth

  // 4. Guru Engine:
  //    - Starts BPMN process
  //    - Returns process instance ID

  const processInstance = await response.json();
  return processInstance; // { id, definitionId, businessKey, ... }
};
```

### Example 2: Complete Task

```typescript
// 1. User submits task form
const handleCompleteTask = async (taskId: string, formData: Record<string, any>) => {
  // 2. Next.js API call
  const response = await fetch(`/api/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkJwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ variables: formData })
  });

  // 3. FastAPI → Camunda Engine (complete task with variables)
  // 4. BPMN continues execution (may trigger Python workers)

  return response.ok;
};
```

---

## 🔄 Real-time Updates Strategy

### Option A: Polling (Simpler)

```typescript
// Poll for task updates every 5 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const tasks = await fetchTasks();
    setTasks(tasks);
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

### Option B: WebSocket (Advanced)

```python
# FastAPI WebSocket endpoint
@app.websocket("/ws/tasks")
async def websocket_tasks(websocket: WebSocket, auth: AuthJWT):
    await websocket.accept()
    user_id = await auth.get_jwt_subject()

    while True:
        tasks = await get_tasks_for_user(user_id)
        await websocket.send_json(tasks)
        await asyncio.sleep(2)
```

**Recommendation**: Start with **polling** (simpler), upgrade to WebSocket if performance requires it.

---

## 🧪 Testing Strategy

### 1. FastAPI Unit Tests
```python
# tests/test_processes.py
async def test_start_process_with_jwt():
    client = TestClient(app)
    response = client.post(
        "/api/processes/test_process/start",
        headers={"Authorization": f"Bearer {test_jwt}"},
        json={"variables": {"input": "test"}}
    )
    assert response.status_code == 200
```

### 2. Next.js Component Tests
```typescript
// __tests__/ProcessList.test.tsx
it('renders process list from API', async () => {
  render(<ProcessList />);
  await waitFor(() => {
    expect(screen.getByText('Test Process')).toBeInTheDocument();
  });
});
```

### 3. Integration Tests
- Use deployed Guru Engine for E2E testing
- Test full flow: Login → Start Process → Complete Task → View Status

---

## 🎯 Success Metrics

- ✅ Users can start BPMN workflows from Next.js UI
- ✅ Tasks appear in dashboard within 5 seconds of creation
- ✅ Forms dynamically render based on BPMN definitions
- ✅ Process status updates in real-time or near-real-time
- ✅ Authentication works seamlessly (no manual Camunda login)
- ✅ Lightweight: FastAPI proxy < 200MB memory, Next.js standard footprint

---

## 📚 Reference Implementation

**DexGuru Source**:
- JWT Auth: `/Users/maksdizzy/repos/guru-repos/dexguru/flowapi/flow_api/dependencies.py`
- Camunda Service: `/Users/maksdizzy/repos/guru-repos/dexguru/flowapi/services/camunda_service.py`
- Camunda Client: `/Users/maksdizzy/repos/guru-repos/dexguru/flowapi/camunda_client/clients/engine/client.py`

**Deployed Resources**:
- **Flow API**: https://flowapi-content-generator.apps.gurunetwork.ai/docs
- **Guru Engine**: https://engine-content-generator.apps.gurunetwork.ai/ (demo/demo)

---

## 🚧 Next Steps

1. **Review this architecture** with stakeholders
2. **Set up FastAPI project** using dex-guru patterns
3. **Create database schema** for user mapping
4. **Implement Phase 1** endpoints and test against deployed engine
5. **Build Next.js UI components** for workflow triggering
6. **Iterate based on feedback** from user testing

---

**Questions? Next Actions?** Reply with specific implementation questions or request code generation for any component above.
