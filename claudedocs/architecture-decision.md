# Architecture Decision: Use Existing Flow API Directly

**Date**: 2025-10-18
**Decision**: Option A - Direct Integration with Deployed Flow API
**Status**: ✅ **RECOMMENDED APPROACH**

---

## 🎯 Final Architecture

```
┌─────────────────────────────────────────┐
│       Next.js Frontend (Clerk)          │
│  - User login via Clerk                 │
│  - UI components for workflows          │
│  - Real-time task dashboard             │
└──────────────┬──────────────────────────┘
               │ HTTP + Clerk JWT (Authorization: Bearer)
               │
┌──────────────▼──────────────────────────┐
│  Existing Flow API (DEPLOYED) ✅        │
│  URL: flowapi-content-generator...      │
│  - JWT Authentication middleware         │
│  - Camunda endpoints already exist!      │
│  - User management built-in              │
└──────────────┬──────────────────────────┘
               │ BasicAuth to Camunda Engine
               │
┌──────────────▼──────────────────────────┐
│  Guru Engine (Camunda BPMN)             │
│  URL: engine-content-generator...       │
│  - Process execution                     │
│  - Python workers                        │
│  - JS delegates                          │
└──────────────────────────────────────────┘
```

---

## ✅ Why This Works

### 1. Flow API Already Has Everything We Need!

**Discovered Endpoints** (from OpenAPI spec):

#### Process Management
- `GET /engine/process-definition` - List all process definitions ✅
- `GET /engine/process-definition/key/{key}/start/variables` - Get start form ✅
- `POST /engine/process-definition/key/{key}/start` - Start process ✅
- `GET /engine/process-definition/key/{key}/deployed-start-form` - Get deployed form ✅

#### Task Management
- `GET /engine/task` - List user tasks ✅
- `GET /engine/task/{task_id}/form-variables` - Get task form ✅
- `POST /engine/task/{task_id}/complete` - Complete task ✅
- `GET /engine/task/{task_id}/deployed-form` - Get deployed form ✅

#### Process Instances
- `GET /engine/process-instance` - List process instances ✅
- `GET /engine/process-instance/{instance_id}` - Get instance details ✅
- `GET /engine/process-instance/{instance_id}/variables` - Get instance variables ✅
- `PUT /engine/process-instance/{instance_id}/suspended` - Suspend/resume ✅

#### Flow Management (Metadata)
- `GET /api/flows` - List flows (BPMN metadata) ✅
- `GET /api/flow/{flow_id}` - Get flow details ✅
- `POST /api/flow` - Create flow metadata ✅

### 2. Authentication Already Configured

From the OpenAPI spec:
```json
"security": [{"AuthJWTBearer": []}]
```

**Flow API already supports**:
- ✅ JWT Bearer token authentication
- ✅ User identity extraction
- ✅ Camunda credential mapping

**What you need**:
- Share JWT secret between Clerk and Flow API OR
- Configure Flow API to accept Clerk's public key for JWT verification

---

## 🚀 Implementation Plan (SIMPLIFIED)

### ❌ **NO NEED** to build FastAPI proxy!

### ✅ **ONLY BUILD** Next.js Frontend Components

---

## 📋 Revised Implementation Phases

### Phase 1: Authentication Setup (1-2 days)

**Goal**: Configure Clerk JWT to work with Flow API

**Option A: Shared Secret (Simpler)**
```bash
# Configure Clerk to use same JWT secret as Flow API
CLERK_JWT_SECRET=<same-as-flowapi-AUTHJWT_SECRET_KEY>
```

**Option B: Public Key Verification (More Secure)**
```bash
# Configure Flow API to verify Clerk's public key
# Add Clerk's JWKS endpoint to Flow API config
```

**Task**: Coordinate with Flow API admin to:
1. Get `AUTHJWT_SECRET_KEY` from Flow API config OR
2. Configure Flow API to accept Clerk's public key

### Phase 2: Next.js API Client (2-3 days)

**File Structure**:
```typescript
src/lib/api/
├── client.ts           // Base HTTP client with Clerk JWT
├── workflows.ts        // Workflow/process operations
└── tasks.ts            // Task operations
```

**Example Implementation**:
```typescript
// src/lib/api/client.ts
import { useAuth } from '@clerk/nextjs';

export const createApiClient = () => {
  const { getToken } = useAuth();

  const request = async (endpoint: string, options = {}) => {
    const token = await getToken();

    return fetch(`https://flowapi-content-generator.apps.gurunetwork.ai${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
  };

  return {
    // Process operations
    getProcessDefinitions: () =>
      request('/engine/process-definition').then(r => r.json()),

    startProcess: (key: string, variables: any) =>
      request(`/engine/process-definition/key/${key}/start`, {
        method: 'POST',
        body: JSON.stringify({ variables })
      }).then(r => r.json()),

    // Task operations
    getTasks: () =>
      request('/engine/task').then(r => r.json()),

    completeTask: (taskId: string, variables: any) =>
      request(`/engine/task/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ variables })
      })
  };
};
```

### Phase 3: UI Components (1 week)

Same as before:
- Workflow dashboard
- Process trigger forms
- Task management interface
- Real-time status updates

---

## 🔐 Authentication Configuration Steps

### Step 1: Check Flow API JWT Settings

**You need to know** (ask Flow API admin):
```bash
# From flowapi settings.py
AUTHJWT_SECRET_KEY=?     # The JWT signing secret
AUTHJWT_ALGORITHM=?      # Usually HS256
```

### Step 2: Configure Clerk JWT Template

In Clerk Dashboard:
1. Go to **JWT Templates**
2. Create/edit template for your app
3. Add custom claims:
```json
{
  "email": "{{user.primary_email_address}}",
  "camunda_user_id": "{{user.id}}",
  "sub": "{{user.id}}"
}
```

### Step 3: Test Authentication

```bash
# 1. Get Clerk JWT from Next.js
const clerkJwt = await getToken();

# 2. Test Flow API endpoint
curl -H "Authorization: Bearer $CLERK_JWT" \\
  https://flowapi-content-generator.apps.gurunetwork.ai/api/flows

# Expected: 200 OK with list of flows
# OR: 401 if JWT verification fails (need to coordinate secrets)
```

---

## 🎯 Next Steps

### Immediate Actions:

1. **Contact Flow API Admin**:
   - Get `AUTHJWT_SECRET_KEY` value OR
   - Request they configure Clerk public key for JWT verification
   - Confirm JWT algorithm (likely `HS256`)

2. **Configure Clerk JWT Template**:
   - Add custom claims for Camunda user mapping
   - Set JWT expiration (default 1 hour is fine)

3. **Build Next.js API Client**:
   - Create typed API client for Flow API endpoints
   - Implement error handling and retries
   - Add loading states

4. **Build UI Components**:
   - Workflow selection page
   - Process start form (dynamic based on BPMN)
   - Task dashboard
   - Task completion forms

---

## 📊 Benefits of This Approach

✅ **No new backend infrastructure** - Flow API already deployed and working
✅ **Faster development** - Just build frontend
✅ **Lower maintenance** - One less service to manage
✅ **Battle-tested** - Flow API already proven in dex-guru
✅ **Cost-effective** - No additional hosting costs
✅ **Secure** - JWT authentication already implemented

---

## ❓ Questions to Resolve

### Critical (Must answer before proceeding):
1. **JWT Secret Coordination**: Can you get `AUTHJWT_SECRET_KEY` from Flow API admin?
   - If YES → Use shared secret approach (simpler)
   - If NO → Use Clerk public key approach (requires Flow API config change)

2. **User Provisioning**: How are Camunda users created?
   - Does Flow API auto-create users from JWT? (likely YES based on dex-guru code)
   - Or do users need manual registration?

### Optional (Can resolve during development):
3. **Rate Limiting**: Does Flow API have rate limits we need to handle?
4. **CORS Configuration**: Is Flow API configured to accept requests from your Next.js domain?
5. **WebSocket Support**: Does Flow API support WebSocket for real-time updates?

---

## 📝 Summary

**Old Plan**: Build FastAPI proxy → Complex, more code, more deployment
**New Plan**: Use existing Flow API → Simple, less code, already deployed

**You only need to build**:
- ✅ Next.js API client wrapper
- ✅ UI components for workflows
- ✅ Clerk JWT configuration

**You DON'T need to build**:
- ❌ FastAPI proxy layer
- ❌ Database for user mapping (Flow API has this)
- ❌ Camunda service wrapper (Flow API has this)

---

**Ready to proceed?** Let me know:
1. Can you coordinate JWT secrets with Flow API admin?
2. Should I generate the Next.js API client code?
3. Do you want to start with authentication testing first?
