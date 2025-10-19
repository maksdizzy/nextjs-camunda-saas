# Quick Start Checklist

This checklist will help you get your complete Guru Framework stack running in **~15 minutes**.

---

## ✅ Pre-Flight Checks

### 1. Verify Prerequisites
- [ ] Docker and Docker Compose installed
- [ ] Node.js 18+ installed
- [ ] Clerk account created (free tier works)

### 2. Verify Files Generated
- [ ] `fastapi-proxy/` directory exists with 25+ files
- [ ] `src/lib/api/workflows.ts` exists
- [ ] `src/components/workflows/` directory exists with 8 components
- [ ] `src/app/[locale]/(auth)/workflows/` directory exists with pages
- [ ] `docker-compose.guru.yaml` exists
- [ ] `.env.guru.example` exists

---

## 🔧 Setup Steps

### Step 1: Configure Clerk (5 minutes)

1. **Get Clerk JWKS URL**:
   ```bash
   # Go to: https://dashboard.clerk.com
   # Navigate to: JWT Templates → New Template
   # Template name: guru-flow-api
   ```

2. **Add Custom Claims**:
   ```json
   {
     "aud": "guru-flow-api",
     "email": "{{user.primary_email_address}}",
     "first_name": "{{user.first_name}}",
     "last_name": "{{user.last_name}}"
   }
   ```

3. **Copy JWKS URL** (looks like):
   ```
   https://your-app.clerk.accounts.dev/.well-known/jwks.json
   ```

### Step 2: Configure Environment (2 minutes)

```bash
# Copy environment template
cp .env.guru.example .env.guru

# Edit .env.guru and add your Clerk JWKS URL
# CLERK_JWKS_URL=https://your-actual-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
# CLERK_SECRET_KEY=sk_test_your_key_here
```

### Step 3: Start Backend Stack (3 minutes)

```bash
# Start Guru Engine + Workers + FastAPI Proxy
docker-compose -f docker-compose.guru.yaml up -d

# Wait ~60 seconds for engine to start

# Verify all services running
docker-compose -f docker-compose.guru.yaml ps

# Expected output:
# NAME           STATUS         PORTS
# guru-engine    Up (healthy)   0.0.0.0:8080->8080/tcp
# guru-proxy     Up (healthy)   0.0.0.0:8000->8000/tcp
# guru-workers   Up

# Check logs if needed
docker-compose -f docker-compose.guru.yaml logs -f
```

### Step 4: Install Frontend Dependencies (2 minutes)

```bash
# Install workflow UI dependencies
npm install @tanstack/react-query date-fns

# Verify Clerk is already installed
npm list @clerk/nextjs
```

### Step 5: Configure Next.js (1 minute)

```bash
# Copy workflow environment template
cp .env.example.workflow .env.local

# Edit .env.local and add:
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
# CLERK_SECRET_KEY=sk_test_your_key_here
```

### Step 6: Start Frontend (1 minute)

```bash
# Start Next.js dev server on port 3001
npm run dev -- --port 3001
```

---

## 🧪 Verification Tests

### Test 1: Backend Health
```bash
# Test Camunda Engine
curl http://localhost:8080/engine-rest/process-definition
# Expected: JSON array (may be empty initially)

# Test FastAPI Proxy
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# Access Camunda Cockpit
open http://localhost:8080/camunda
# Login: demo / demo
```

### Test 2: Frontend Access
```bash
# Open Next.js app
open http://localhost:3001

# Navigate to workflows
open http://localhost:3001/workflows
```

### Test 3: End-to-End Flow

1. **Login**: Sign in with Clerk at http://localhost:3001
2. **Deploy BPMN** (using Camunda Modeler or curl):
   ```bash
   # Download Camunda Modeler: https://camunda.com/download/modeler/
   # Create simple process: Start → User Task → End
   # Deploy to: http://localhost:8080/engine-rest
   # BasicAuth: demo/demo
   ```
3. **View Processes**: Navigate to /workflows
4. **Start Process**: Click "Start Process" button
5. **View Tasks**: Navigate to /workflows/tasks
6. **Complete Task**: Click task → Complete
7. **Verify in Cockpit**: Check http://localhost:8080/camunda

---

## 🐛 Quick Troubleshooting

### Issue: "JWKS URL not accessible"
```bash
# Check Clerk JWKS URL is correct
curl https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json

# Restart proxy
docker-compose -f docker-compose.guru.yaml restart proxy
```

### Issue: "Engine not responding"
```bash
# Check engine logs
docker-compose -f docker-compose.guru.yaml logs engine

# Wait for full startup (30-60 seconds)
# Test engine directly
curl http://localhost:8080/engine-rest/process-definition
```

### Issue: "CORS errors"
```bash
# Update CORS_ORIGINS in .env.guru
# CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Restart proxy
docker-compose -f docker-compose.guru.yaml restart proxy
```

### Issue: "No processes showing"
```bash
# Deploy a test BPMN first
# Option 1: Use Camunda Modeler (recommended)
# Option 2: Use curl:

curl -X POST http://localhost:8080/engine-rest/deployment/create \
  -u demo:demo \
  -F "deployment-name=test-process" \
  -F "data=@your-process.bpmn"
```

---

## 📂 File Structure Overview

```
content-gen/
├── fastapi-proxy/              # Backend API (Port 8000)
│   ├── main.py                 # FastAPI app with 13 endpoints
│   ├── auth.py                 # Clerk JWT verification
│   ├── camunda_client.py       # Camunda REST client
│   ├── models.py               # Pydantic models
│   ├── config.py               # Settings management
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Container image
│
├── src/
│   ├── types/workflow.ts       # TypeScript types
│   ├── lib/api/workflows.ts    # API client hook
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
│       ├── page.tsx                    # Process list
│       ├── [processKey]/start/page.tsx # Start form
│       ├── tasks/page.tsx              # Task list
│       ├── tasks/[taskId]/page.tsx     # Task completion
│       ├── instances/page.tsx          # Instance list
│       └── instances/[id]/page.tsx     # Instance details
│
├── guru-framework/             # Existing (already present)
│   ├── engine/                 # Camunda BPMN Engine
│   └── worker/                 # Python Workers
│
├── docker-compose.guru.yaml    # Complete stack orchestration
├── .env.guru                   # Your configuration (create from .env.guru.example)
└── COMPLETE_SETUP_GUIDE.md     # Detailed documentation
```

---

## 🎯 What You Have Now

### Backend (FastAPI Proxy)
- ✅ **13 REST API Endpoints**:
  - GET /health
  - GET /api/processes (list all process definitions)
  - POST /api/processes/{key}/start (start process instance)
  - GET /api/tasks (get user's tasks)
  - GET /api/tasks/{taskId} (get task details)
  - POST /api/tasks/{taskId}/complete (complete task)
  - POST /api/tasks/{taskId}/claim (claim task)
  - POST /api/tasks/{taskId}/unclaim (unclaim task)
  - GET /api/instances (list process instances)
  - GET /api/instances/{id} (get instance details)
  - GET /api/instances/{id}/variables (get instance variables)
  - GET /api/instances/{id}/activities (get instance activities)
  - DELETE /api/instances/{id} (cancel instance)

- ✅ **Authentication**: Clerk JWT verification with PyJWKClient
- ✅ **User Context Injection**: Automatically adds clerk_user_id, email, name to process variables
- ✅ **Complete Documentation**: README, QUICKSTART, API_EXAMPLES, SETUP guides
- ✅ **Docker Ready**: Dockerfile and docker-compose.yml included

### Frontend (Next.js)
- ✅ **28 Files Generated**:
  - 1 TypeScript type definition file
  - 1 API client hook
  - 3 React Query hooks
  - 8 reusable components
  - 7 pages for complete workflow UI
  - 7 documentation files

- ✅ **Features**:
  - Process list with search and filters
  - Start process with dynamic form generation
  - Task list with status badges
  - Task completion with variable inputs
  - Instance monitoring with activity timeline
  - Real-time updates via React Query
  - Responsive design with shadcn/ui

### Infrastructure
- ✅ **Docker Compose Stack**:
  - Guru Engine (Camunda) on port 8080
  - Python Workers for external tasks
  - FastAPI Proxy on port 8000
  - Health checks and auto-restart

---

## 📚 Next Steps

1. **Follow this checklist** to get running (15 minutes)
2. **Deploy a test BPMN** using Camunda Modeler
3. **Test the workflow** end-to-end
4. **Create your custom BPMNs** with JS delegates and Python workers
5. **Customize the UI** to match your brand

---

## 📖 Documentation References

- **Complete Setup Guide**: `COMPLETE_SETUP_GUIDE.md`
- **FastAPI Proxy Quickstart**: `fastapi-proxy/QUICKSTART.md`
- **FastAPI API Examples**: `fastapi-proxy/API_EXAMPLES.md`
- **Workflow UI Quickstart**: `WORKFLOW_QUICKSTART.md`
- **Workflow UI Setup**: `WORKFLOW_UI_SETUP.md`
- **Files Created Reference**: `WORKFLOW_FILES_CREATED.md`

---

## 🆘 Support

If you encounter issues:
1. Check logs: `docker-compose -f docker-compose.guru.yaml logs -f`
2. Review troubleshooting section in `COMPLETE_SETUP_GUIDE.md`
3. Verify all environment variables in `.env.guru` and `.env.local`
4. Test each service independently (engine → proxy → frontend)

---

**You're all set!** 🎉

Start with **Step 1** above and you'll have a complete workflow-driven application running in ~15 minutes.
