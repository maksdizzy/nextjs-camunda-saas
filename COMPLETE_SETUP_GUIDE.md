# 🚀 Complete Guru Framework Setup Guide

**Welcome!** This guide will walk you through setting up your complete self-hosted Guru Framework stack with Next.js integration.

---

## 📋 What You're Building

```
┌─────────────────────────────────────────┐
│     Next.js Frontend (Port 3001)        │
│  ✅ Clerk authentication                │
│  ✅ Workflow UI components              │
│  ✅ Real-time task monitoring           │
└──────────────┬──────────────────────────┘
               ↓ HTTP + Clerk JWT
┌──────────────▼──────────────────────────┐
│  FastAPI Proxy (Port 8000)              │
│  ✅ JWT verification                    │
│  ✅ User context injection              │
│  ✅ Camunda REST wrapper                │
└──────────────┬──────────────────────────┘
               ↓ BasicAuth
┌──────────────▼──────────────────────────┐
│  Guru Engine - Camunda (Port 8080)      │
│  ✅ BPMN execution                      │
│  ✅ Process orchestration               │
│  ✅ Task management                     │
└──────────────┬──────────────────────────┘
               ↓ External Tasks
┌──────────────▼──────────────────────────┐
│  Python Workers                          │
│  ✅ Custom task handlers                │
└──────────────────────────────────────────┘
```

---

## ⚡ Quick Start (5 Minutes)

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ installed
- Clerk account (free tier is fine)

### Steps

1. **Clone & Navigate**
   ```bash
   cd /Users/maksdizzy/repos/content-gen
   ```

2. **Configure Clerk**
   ```bash
   cp .env.guru.example .env.guru
   nano .env.guru  # Add your CLERK_JWKS_URL
   ```

3. **Start Stack**
   ```bash
   docker-compose -f docker-compose.guru.yaml up -d
   ```

4. **Install Next.js Dependencies**
   ```bash
   npm install @tanstack/react-query date-fns
   ```

5. **Configure Next.js**
   ```bash
   cp .env.example.workflow .env.local
   # Edit .env.local with your Clerk keys
   ```

6. **Start Next.js**
   ```bash
   npm run dev -- --port 3001
   ```

7. **Test!**
   - Open http://localhost:3001/workflows
   - Login with Clerk
   - Start a workflow!

---

## 📚 Detailed Setup

### Step 1: Configure Clerk Authentication

#### 1.1 Get Clerk JWKS URL

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **JWT Templates** → **New Template**
4. Create template named `guru-flow-api`
5. Add custom claims:
   ```json
   {
     "aud": "guru-flow-api",
     "email": "{{user.primary_email_address}}",
     "first_name": "{{user.first_name}}",
     "last_name": "{{user.last_name}}"
   }
   ```
6. Copy the **JWKS URL** from the template details
   - Should look like: `https://your-app.clerk.accounts.dev/.well-known/jwks.json`

#### 1.2 Update Environment File

```bash
cd /Users/maksdizzy/repos/content-gen
cp .env.guru.example .env.guru
```

Edit `.env.guru` and add your Clerk JWKS URL:
```env
CLERK_JWKS_URL=https://your-actual-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
```

---

### Step 2: Start Guru Engine Stack

#### 2.1 Start with Docker Compose

```bash
docker-compose -f docker-compose.guru.yaml up -d
```

This starts:
- **Guru Engine** (Camunda) on port 8080
- **Python Workers** for external tasks
- **FastAPI Proxy** on port 8000

#### 2.2 Verify Services

Check all services are running:
```bash
docker-compose -f docker-compose.guru.yaml ps
```

Expected output:
```
NAME           STATUS         PORTS
guru-engine    Up (healthy)   0.0.0.0:8080->8080/tcp
guru-proxy     Up (healthy)   0.0.0.0:8000->8000/tcp
guru-workers   Up
```

#### 2.3 Test Engine

```bash
# Test Camunda Engine
curl http://localhost:8080/engine-rest/process-definition

# Test FastAPI Proxy (without auth - should show health)
curl http://localhost:8000/health

# Access Camunda Cockpit
open http://localhost:8080/camunda
# Login: demo / demo
```

---

### Step 3: Set Up Next.js Frontend

#### 3.1 Install Dependencies

```bash
cd /Users/maksdizzy/repos/content-gen

# Install workflow UI dependencies
npm install @tanstack/react-query date-fns

# Verify Clerk is already installed
npm list @clerk/nextjs
```

#### 3.2 Configure Environment

```bash
cp .env.example.workflow .env.local
```

Edit `.env.local`:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 3.3 Update App Layout

The workflow UI components are already generated. You need to add navigation links.

Edit `/Users/maksdizzy/repos/content-gen/src/app/[locale]/(auth)/dashboard/layout.tsx`:

Add to navigation menu:
```tsx
// Add this to your navigation items
{
  name: 'Workflows',
  href: '/workflows',
  icon: PlayCircleIcon, // or any icon from lucide-react
},
{
  name: 'My Tasks',
  href: '/workflows/tasks',
  icon: CheckCircleIcon,
},
{
  name: 'Instances',
  href: '/workflows/instances',
  icon: ListIcon,
},
```

#### 3.4 Add Query Provider

Edit `/Users/maksdizzy/repos/content-gen/src/app/[locale]/layout.tsx`:

Wrap your app with QueryClientProvider:
```tsx
import { QueryProvider } from '@/providers/QueryProvider';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <QueryProvider>
        {children}
      </QueryProvider>
    </ClerkProvider>
  );
}
```

---

### Step 4: Deploy a Test BPMN

#### 4.1 Download Camunda Modeler

1. Download from https://camunda.com/download/modeler/
2. Install and open

#### 4.2 Create Simple Test Process

Create a simple BPMN with:
- **Start Event**
- **User Task** (name: "Approve Request", task definition key: "approveTask")
- **End Event**

#### 4.3 Deploy to Engine

In Camunda Modeler:
1. Click **Deploy** icon
2. Configure:
   - REST Endpoint: `http://localhost:8080/engine-rest`
   - Authentication: Basic Auth (demo / demo)
   - Deployment Name: "Test Process"
3. Click **Deploy**

Or use curl:
```bash
curl -X POST http://localhost:8080/engine-rest/deployment/create \
  -u demo:demo \
  -F "deployment-name=test-process" \
  -F "data=@your-process.bpmn"
```

---

### Step 5: Test End-to-End

#### 5.1 Start Next.js

```bash
cd /Users/maksdizzy/repos/content-gen
npm run dev -- --port 3001
```

#### 5.2 Login & Test Workflow

1. Open http://localhost:3001
2. Click "Sign In" → Login with Clerk
3. Navigate to http://localhost:3001/workflows
4. You should see your deployed process
5. Click **"Start Process"**
6. Fill in any variables
7. Submit
8. Navigate to **"My Tasks"** to see the created task
9. Click **"Complete"** to finish the task

#### 5.3 Verify in Camunda Cockpit

1. Open http://localhost:8080/camunda
2. Login: demo / demo
3. Click **"Processes"** tab
4. Click on your process
5. See the completed instance!

---

## 🔧 Troubleshooting

### Issue: "JWKS URL not accessible"

**Symptoms**: FastAPI proxy fails to start or returns 401 errors

**Solution**:
1. Check `.env.guru` has correct `CLERK_JWKS_URL`
2. Verify URL is accessible: `curl https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json`
3. Restart proxy: `docker-compose -f docker-compose.guru.yaml restart proxy`

### Issue: "Engine not responding"

**Symptoms**: FastAPI proxy returns 502 errors

**Solution**:
1. Check engine is running: `docker-compose -f docker-compose.guru.yaml ps engine`
2. Check engine logs: `docker-compose -f docker-compose.guru.yaml logs engine`
3. Wait for engine to fully start (can take 30-60 seconds)
4. Test engine directly: `curl http://localhost:8080/engine-rest/process-definition`

### Issue: "CORS errors in browser"

**Symptoms**: Browser console shows CORS errors

**Solution**:
1. Verify `CORS_ORIGINS` in `.env.guru` includes your Next.js URL
2. Update to: `CORS_ORIGINS=http://localhost:3000,http://localhost:3001`
3. Restart proxy: `docker-compose -f docker-compose.guru.yaml restart proxy`

### Issue: "No processes showing in UI"

**Symptoms**: Workflows page is empty

**Solution**:
1. Deploy a test BPMN to engine (see Step 4)
2. Verify deployment in Cockpit: http://localhost:8080/camunda
3. Check proxy logs: `docker-compose -f docker-compose.guru.yaml logs proxy`
4. Test API directly: `curl http://localhost:8000/api/processes` (with JWT)

### Issue: "Tasks not showing"

**Symptoms**: Tasks page is empty even after starting processes

**Solution**:
1. Make sure your BPMN has User Tasks
2. Check tasks exist in Cockpit: http://localhost:8080/camunda → Tasks
3. Verify task assignment (tasks might be unassigned)
4. Try "Claim" button in UI to assign tasks to yourself

---

## 📊 Architecture Details

### Authentication Flow

```
1. User logs in via Clerk (Next.js)
   ↓
2. Clerk generates JWT with user claims
   ↓
3. Next.js stores JWT in memory/cookie
   ↓
4. Next.js sends JWT to FastAPI proxy
   ↓
5. Proxy verifies JWT with Clerk JWKS
   ↓
6. Proxy extracts user identity
   ↓
7. Proxy forwards request to Engine with BasicAuth
   ↓
8. Engine executes BPMN process
   ↓
9. Response flows back to Next.js UI
```

### Data Flow for Starting Process

```
Next.js UI
  → POST /api/processes/invoice-approval/start
  → { variables: { amount: 1000, requestor: "John" } }

FastAPI Proxy
  → Verify JWT
  → Add user context: { initiator: "user_123", initiatorEmail: "john@example.com" }
  → POST http://engine:8080/engine-rest/process-definition/key/invoice-approval/start
  → BasicAuth: demo:demo

Guru Engine
  → Create process instance
  → Execute BPMN flow
  → Return instance ID

Response
  → { id: "abc123", definitionId: "invoice-approval:1:xyz", ... }
```

---

## 📁 File Structure Reference

### Generated Files

```
content-gen/
├── fastapi-proxy/              # FastAPI Proxy (backend)
│   ├── main.py                 # API endpoints
│   ├── auth.py                 # JWT verification
│   ├── camunda_client.py       # Engine client
│   ├── models.py               # Data models
│   ├── config.py               # Configuration
│   ├── requirements.txt        # Dependencies
│   ├── Dockerfile              # Container
│   └── [docs]                  # Documentation
│
├── src/                        # Next.js Frontend
│   ├── types/workflow.ts       # TypeScript types
│   ├── lib/api/workflows.ts    # API client
│   ├── hooks/                  # React Query hooks
│   │   ├── useProcesses.ts
│   │   ├── useTasks.ts
│   │   └── useProcessInstance.ts
│   ├── components/workflows/   # Reusable components
│   │   ├── StatusBadge.tsx
│   │   ├── ProcessCard.tsx
│   │   ├── TaskCard.tsx
│   │   ├── InstanceCard.tsx
│   │   ├── VariableInput.tsx
│   │   └── DynamicForm.tsx
│   └── app/[locale]/(auth)/workflows/  # Pages
│       ├── page.tsx            # Process list
│       ├── [processKey]/start/page.tsx
│       ├── tasks/page.tsx
│       ├── tasks/[taskId]/page.tsx
│       ├── instances/page.tsx
│       └── instances/[id]/page.tsx
│
├── guru-framework/             # Existing (you already have)
│   ├── engine/                 # Camunda Engine
│   └── worker/                 # Python Workers
│
├── docker-compose.guru.yaml    # Complete stack
├── .env.guru                   # Environment config
└── COMPLETE_SETUP_GUIDE.md     # This file
```

---

## 🎯 Next Steps

### Development Workflow

1. **Create BPMN Process**
   - Use Camunda Modeler
   - Deploy to http://localhost:8080

2. **Add Python Workers** (if needed for External Tasks)
   - Add worker scripts to `guru-framework/worker/`
   - Update `WORKER_SCRIPTS` in docker-compose.guru.yaml
   - Restart workers: `docker-compose -f docker-compose.guru.yaml restart workers`

3. **Customize UI**
   - Modify components in `src/components/workflows/`
   - Add custom forms for specific processes
   - Customize styling with Tailwind

4. **Add Business Logic**
   - Create service tasks in BPMN
   - Implement delegates in Engine
   - Create external task workers in Python

### Production Deployment

1. **Update Engine Database**
   - Switch from H2 to PostgreSQL
   - Update `docker-compose.guru.yaml` with Postgres service

2. **Secure Authentication**
   - Change default credentials (demo/demo)
   - Use production Clerk instance
   - Enable HTTPS

3. **Scale Workers**
   - Increase worker replicas
   - Add worker-specific configurations

4. **Monitor & Logs**
   - Add logging aggregation
   - Set up monitoring (Prometheus/Grafana)
   - Configure alerts

---

## 📚 Documentation Links

### FastAPI Proxy
- **Quickstart**: `fastapi-proxy/QUICKSTART.md`
- **API Examples**: `fastapi-proxy/API_EXAMPLES.md`
- **Full Docs**: `fastapi-proxy/README.md`

### Next.js UI
- **Quickstart**: `WORKFLOW_QUICKSTART.md`
- **Setup Guide**: `WORKFLOW_UI_SETUP.md`
- **File Reference**: `WORKFLOW_FILES_CREATED.md`

### Guru Framework
- **Engine Docs**: `guru-framework/engine/README.md`
- **Worker Guide**: `guru-framework/worker/README.md`

### External Resources
- [Camunda BPMN Tutorial](https://camunda.com/bpmn/)
- [Camunda REST API Docs](https://docs.camunda.org/manual/latest/reference/rest/)
- [Clerk Documentation](https://clerk.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)

---

## 🆘 Getting Help

### Check Logs

```bash
# All services
docker-compose -f docker-compose.guru.yaml logs -f

# Specific service
docker-compose -f docker-compose.guru.yaml logs -f proxy

# Last 100 lines
docker-compose -f docker-compose.guru.yaml logs --tail=100 engine
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.guru.yaml restart

# Restart specific
docker-compose -f docker-compose.guru.yaml restart proxy

# Full rebuild
docker-compose -f docker-compose.guru.yaml down
docker-compose -f docker-compose.guru.yaml up --build -d
```

### Clean Slate

```bash
# Stop everything
docker-compose -f docker-compose.guru.yaml down -v

# Remove containers and volumes
docker system prune -a --volumes

# Restart
docker-compose -f docker-compose.guru.yaml up -d
```

---

**You're all set!** 🎉 Start building workflow-driven applications with the Guru Framework!
