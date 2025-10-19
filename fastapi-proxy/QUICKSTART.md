# FastAPI Proxy - Quick Start

Get running in 5 minutes.

## 1. Configure

```bash
cd /Users/maksdizzy/repos/content-gen/fastapi-proxy
cp .env.example .env
```

Edit `.env` - **ONLY THIS LINE IS REQUIRED**:
```env
CLERK_JWKS_URL=https://YOUR-CLERK-INSTANCE.clerk.accounts.dev/.well-known/jwks.json
```

Find your Clerk instance:
- Go to https://dashboard.clerk.com/
- Select your app → API Keys
- Copy your Frontend API URL
- Add `/.well-known/jwks.json` to the end

## 2. Run

```bash
./run.sh
```

That's it! API running at http://localhost:8000

## 3. Test

```bash
# Health check (no auth)
curl http://localhost:8000/health

# API docs (browser)
open http://localhost:8000/docs
```

## 4. Use in Next.js

Create `lib/camunda-api.ts`:

```typescript
import { useAuth } from '@clerk/nextjs';

export function useCamundaAPI() {
  const { getToken } = useAuth();

  const call = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(`http://localhost:8000${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.status === 204 ? null : res.json();
  };

  return {
    getProcesses: () => call('/api/processes'),
    startProcess: (key: string, vars: any) =>
      call(`/api/processes/${key}/start`, {
        method: 'POST',
        body: JSON.stringify({ variables: vars }),
      }),
    getTasks: () => call('/api/tasks'),
    completeTask: (id: string, vars: any) =>
      call(`/api/tasks/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ variables: vars }),
      }),
  };
}
```

Use it:

```typescript
'use client';

import { useCamundaAPI } from '@/lib/camunda-api';
import { useEffect, useState } from 'react';

export default function Page() {
  const api = useCamundaAPI();
  const [processes, setProcesses] = useState([]);

  useEffect(() => {
    api.getProcesses().then(setProcesses);
  }, []);

  return (
    <div>
      <h1>Processes</h1>
      {processes.map(p => (
        <button key={p.id} onClick={() => api.startProcess(p.key, {})}>
          Start {p.name}
        </button>
      ))}
    </div>
  );
}
```

## Troubleshooting

**Can't connect to engine?**
```bash
# Check engine is running
curl http://localhost:8080/engine-rest/version
```

**401 errors?**
- Verify `CLERK_JWKS_URL` in `.env` is correct
- Token must be fresh (expires after 1 hour)

**CORS errors?**
- Add your Next.js URL to `CORS_ORIGINS` in `.env`
- Restart proxy after changing `.env`

## What's Next?

- Full docs: [README.md](README.md)
- Setup guide: [SETUP.md](SETUP.md)
- API examples: [API_EXAMPLES.md](API_EXAMPLES.md)
- Deploy with Docker: `docker-compose up -d`
