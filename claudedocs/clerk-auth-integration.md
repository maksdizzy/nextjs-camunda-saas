# Clerk Authentication Integration Analysis

**Project**: Integrating Clerk Auth with Existing Flow API (Thirdweb-based)
**Current Auth**: Thirdweb (RS256 asymmetric JWT)
**Target Auth**: Clerk (configurable JWT)
**Status**: ✅ **COMPATIBLE - Integration Possible**

---

## 🔍 Current Authentication Analysis

### Existing Flow API Authentication (`guru-network-mono/flowapi`)

**File**: `/flowapi/flow_api/routes/api_routes.py:574-607`

```python
@router.post("/login")
async def login_thirdweb(
    auth: AuthJWT = Depends(AuthJWTBearer()),
    email: str = Body(...),
):
    user = await User.filter(email=email).first()

    user_claims = {
        "id": str(user.id),
        "is_admin": user.is_admin,
        "webapp_user_id": str(user.webapp_user_id),
        "camunda_user_id": user.camunda_user_id,
        "camunda_key": str(user.camunda_key),
        # ... other claims
    }

    access_token = await auth.create_access_token(
        subject=str(user.id),
        user_claims=user_claims,
        expires_time=timedelta(days=7),
        algorithm="RS256",              # ← Asymmetric key
        audience="thirdweb",            # ← Specific audience
    )
    return access_token
```

**JWKS Endpoint**: `GET /.well-known/jwks.json`
```python
@router.get("/.well-known/jwks.json")
async def get_jwks():
    return {
        "keys": [{
            "kty": "RSA",
            "n": "rIWtrKuKlrrNAUBO3-Eexi4SW...",  # Public key
            "e": "AQAB",
            "alg": "RS256",
            "kid": "0",
            "use": "sig",
        }]
    }
```

**Settings** (`/flowapi/flow_api/settings.py:43-50`):
```python
class AuthSettings(BaseModel):
    authjwt_secret_key: str = os.getenv("AUTHJWT_SECRET_KEY", "secret")
    authjwt_algorithm: str = os.getenv("AUTHJWT_ALGORITHM", "HS256")
```

---

## 🎯 Authentication Architecture Options

### **Option 1: Dual JWT Support (RECOMMENDED)** ✅

**Flow API supports BOTH Thirdweb AND Clerk JWTs simultaneously**

```
┌─────────────────────────────────────────┐
│     Flow API (Modified Middleware)      │
│                                          │
│  if JWT audience == "thirdweb":         │
│    → Verify with RS256 + JWKS           │
│                                          │
│  elif JWT issuer contains "clerk.com":  │
│    → Verify with Clerk JWKS             │
│                                          │
│  else:                                   │
│    → Verify with HS256 shared secret    │
└─────────────────────────────────────────┘
```

**Advantages**:
- ✅ Backward compatible with existing Thirdweb auth
- ✅ New Next.js app uses Clerk
- ✅ No breaking changes for existing systems
- ✅ Gradual migration path

**Implementation**:
Modify `/flowapi/flow_api/dependencies.py`:

```python
async def sys_key_or_jwt_depends(
    request: Request, auth: AuthJWT = Depends(auth_dependency)
) -> AuthJWT:
    # System key for admin access
    if FLOW_API_SYS_KEY == request.headers.get("X-SYS-KEY"):
        return SysKeyAuth()

    # JWT authentication
    if request.headers.get("Authorization"):
        await auth.jwt_required()

        # Get JWT claims to determine issuer
        jwt_claims = await auth.get_raw_jwt()

        # Thirdweb JWT (existing)
        if jwt_claims.get("aud") == "thirdweb":
            return auth  # Already verified by async_fastapi_jwt_auth

        # Clerk JWT (new)
        elif "clerk" in jwt_claims.get("iss", "").lower():
            # Extract Clerk user claims
            clerk_user_id = jwt_claims.get("sub")
            clerk_email = jwt_claims.get("email")

            # Get or create user in Flow API database
            user = await get_or_create_clerk_user(
                clerk_user_id=clerk_user_id,
                email=clerk_email,
                jwt_claims=jwt_claims
            )

            # Inject user credentials into auth object
            auth._user_claims = {
                "camunda_user_id": user.camunda_user_id,
                "camunda_key": str(user.camunda_key),
                "id": str(user.id),
                "webapp_user_id": str(user.webapp_user_id),
                **jwt_claims
            }
            return auth

    raise HTTPException(status_code=401, detail="Unauthorized")
```

---

### **Option 2: Clerk-Only (Clean Break)** ⚠️

**Replace Thirdweb auth entirely with Clerk**

**Advantages**:
- ✅ Simpler architecture (one auth system)
- ✅ Easier to maintain

**Disadvantages**:
- ❌ Breaks existing Thirdweb integrations
- ❌ Requires migration of all users
- ❌ Not backward compatible

**Not Recommended** unless you're planning to sunset Thirdweb completely.

---

### **Option 3: Separate Endpoints** 🤔

**Create new `/v2/` endpoints specifically for Clerk auth**

```
Existing:  /api/*        → Thirdweb JWT
New:       /api/v2/*     → Clerk JWT
```

**Advantages**:
- ✅ Zero risk to existing systems
- ✅ Clear separation of concerns

**Disadvantages**:
- ❌ Code duplication
- ❌ Maintenance overhead
- ❌ Confusing API structure

---

## 🔐 Clerk JWT Configuration

### Step 1: Configure Clerk JWT Template

In **Clerk Dashboard** → **JWT Templates**:

```json
{
  "aud": "guru-flow-api",
  "iss": "https://clerk.yourapp.com",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "first_name": "{{user.first_name}}",
  "last_name": "{{user.last_name}}",
  "clerk_user_id": "{{user.id}}",
  "exp": "{{token.exp}}",
  "iat": "{{token.iat}}"
}
```

### Step 2: Configure Flow API to Accept Clerk JWKS

**Option A: Use Clerk's Public JWKS** (Recommended)

Modify `async_fastapi_jwt_auth` config to support multiple JWKS sources:

```python
# flowapi/flow_api/settings.py

class AuthSettings(BaseModel):
    authjwt_secret_key: str = os.getenv("AUTHJWT_SECRET_KEY", "secret")
    authjwt_algorithm: str = os.getenv("AUTHJWT_ALGORITHM", "HS256")

    # NEW: Clerk JWKS URL
    clerk_jwks_url: str = os.getenv(
        "CLERK_JWKS_URL",
        "https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json"
    )

    # NEW: Enable multi-issuer support
    enable_multi_issuer: bool = os.getenv("ENABLE_MULTI_ISSUER", True)
```

**Option B: Share Clerk's Secret Key** (Less Secure)

If you configure Clerk to use symmetric HS256 instead of asymmetric RS256:

```bash
# Flow API .env
AUTHJWT_SECRET_KEY=<clerk-secret-key>  # MUST match Clerk's signing secret
AUTHJWT_ALGORITHM=HS256
```

⚠️ **Security Note**: Option A (JWKS) is more secure for production.

---

## 📋 Implementation Checklist

### Phase 1: Flow API Modifications (1-2 days)

- [ ] **Modify JWT Middleware** (`dependencies.py`)
  - Add Clerk JWT detection logic
  - Implement multi-issuer verification
  - Add JWKS URL support for Clerk

- [ ] **Create User Mapping Service**
  ```python
  async def get_or_create_clerk_user(
      clerk_user_id: str,
      email: str,
      jwt_claims: dict
  ) -> User:
      # Check if user exists by Clerk ID
      user = await User.filter(clerk_user_id=clerk_user_id).first()

      if not user:
          # Create new user
          camunda_user_id = clerk_user_id  # Or generate unique ID
          camunda_key = str(uuid.uuid4())

          user = await User.create(
              clerk_user_id=clerk_user_id,
              email=email,
              camunda_user_id=camunda_user_id,
              camunda_key=camunda_key,
              webapp_user_id=uuid.uuid4(),
              username=jwt_claims.get("email", ""),
              first_name=jwt_claims.get("first_name", ""),
              last_name=jwt_claims.get("last_name", ""),
          )

          # Create Camunda user in engine
          await create_camunda_user(user)

      return user
  ```

- [ ] **Update User Model** (add `clerk_user_id` field)
  ```python
  # flowapi/flow_api/flow_models.py
  class User(Model):
      # ... existing fields
      clerk_user_id = fields.CharField(max_length=255, null=True, unique=True)
  ```

- [ ] **Database Migration**
  ```bash
  aerich migrate --name add_clerk_user_id
  aerich upgrade
  ```

### Phase 2: Next.js Integration (2-3 days)

- [ ] **Configure Clerk Provider**
  ```typescript
  // src/app/layout.tsx
  import { ClerkProvider } from '@clerk/nextjs';

  export default function RootLayout({ children }) {
    return (
      <ClerkProvider>
        {children}
      </ClerkProvider>
    );
  }
  ```

- [ ] **Create API Client with Clerk JWT**
  ```typescript
  // src/lib/api/client.ts
  import { useAuth } from '@clerk/nextjs';

  export const useFlowApi = () => {
    const { getToken } = useAuth();

    const request = async (endpoint: string, options = {}) => {
      const token = await getToken({ template: 'guru-flow-api' });

      return fetch(`https://flowapi-content-generator.apps.gurunetwork.ai${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        }
      });
    };

    return { request };
  };
  ```

- [ ] **Test Authentication Flow**
  - User logs in via Clerk
  - Clerk JWT passed to Flow API
  - Flow API creates/retrieves user
  - Camunda credentials returned
  - BPMN process started successfully

### Phase 3: Testing & Validation (1-2 days)

- [ ] **Unit Tests**
  - Test Clerk JWT verification
  - Test user creation from Clerk claims
  - Test Thirdweb JWT still works (backward compatibility)

- [ ] **Integration Tests**
  - End-to-end auth flow
  - BPMN process triggering with Clerk auth
  - Task completion with Clerk auth

- [ ] **Load Testing**
  - Test concurrent Clerk + Thirdweb auth
  - Verify performance acceptable

---

## 🧪 Testing Authentication

### Test Clerk JWT Locally

```bash
# 1. Get Clerk JWT from Next.js
const clerkJwt = await getToken({ template: 'guru-flow-api' });
console.log('Clerk JWT:', clerkJwt);

# 2. Test Flow API endpoint
curl -X GET \
  https://flowapi-content-generator.apps.gurunetwork.ai/api/flows \
  -H "Authorization: Bearer $CLERK_JWT"

# Expected responses:
# ✅ 200 OK - JWT verified, user created/retrieved
# ❌ 401 Unauthorized - JWT verification failed
# ❌ 422 Validation Error - Missing required claims
```

### Verify User Creation

```bash
# Check Flow API database
SELECT clerk_user_id, email, camunda_user_id, camunda_key
FROM users
WHERE clerk_user_id = 'user_...'
LIMIT 1;

# Expected: User row with Clerk ID and Camunda credentials
```

### Test BPMN Process Start

```bash
# Start process with Clerk JWT
curl -X POST \
  https://flowapi-content-generator.apps.gurunetwork.ai/engine/process-definition/key/test_process/start \
  -H "Authorization: Bearer $CLERK_JWT" \
  -H "Content-Type: application/json" \
  -d '{"variables": {"input": {"value": "test", "type": "String"}}}'

# Expected: Process instance created successfully
```

---

## 🔒 Security Considerations

### JWT Verification Sequence

1. **Extract JWT** from `Authorization: Bearer <token>`
2. **Decode JWT header** to get algorithm + kid
3. **Determine Issuer**:
   - `aud: "thirdweb"` → Use Thirdweb JWKS
   - `iss: contains("clerk")` → Use Clerk JWKS
   - Default → Use shared secret (HS256)
4. **Fetch Public Key** from JWKS endpoint (cache for 1 hour)
5. **Verify Signature** using public key
6. **Validate Claims**:
   - `exp` (expiration) not passed
   - `aud` (audience) matches expected
   - `iss` (issuer) is trusted
7. **Extract User Identity** from claims
8. **Get/Create User** in Flow API database
9. **Return User Context** for downstream operations

### JWKS Caching Strategy

```python
from functools import lru_cache
import httpx

@lru_cache(maxsize=10, ttl=3600)  # Cache for 1 hour
async def get_jwks(issuer: str) -> dict:
    if "clerk" in issuer.lower():
        jwks_url = settings.clerk_jwks_url
    elif "thirdweb" in issuer.lower():
        jwks_url = f"{settings.flow_api_url}/.well-known/jwks.json"
    else:
        return None

    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        return response.json()
```

---

## ✅ **ANSWER: Yes, Clerk Authentication is Compatible!**

**Confirmation**:
1. ✅ **Flow API uses standard JWT authentication** (async-fastapi-jwt-auth)
2. ✅ **Already supports JWKS** (Thirdweb RS256 public key)
3. ✅ **Can be extended** to support multiple issuers (Thirdweb + Clerk)
4. ✅ **User mapping is straightforward** (Clerk ID → Camunda credentials)

**Recommended Approach**: **Option 1 - Dual JWT Support**

**Why**:
- Zero breaking changes for existing Thirdweb integrations
- New Next.js app uses Clerk seamlessly
- Gradual migration path if needed
- Both auth systems coexist peacefully

---

## 🚀 Next Steps

1. **Decide on Implementation Approach**:
   - ✅ **Option 1**: Dual JWT (recommended)
   - ⚠️ **Option 2**: Clerk-only (breaking change)
   - 🤔 **Option 3**: Separate endpoints (maintenance overhead)

2. **Coordinate with Flow API Team**:
   - Share Clerk JWKS URL
   - Agree on JWT claim structure
   - Plan database migration for `clerk_user_id` field

3. **Configure Clerk JWT Template**:
   - Set required claims (email, sub, first_name, last_name)
   - Configure audience: `guru-flow-api`
   - Set expiration: 1 hour (standard) or 7 days (Thirdweb parity)

4. **Implement & Test**:
   - Modify Flow API middleware
   - Create user mapping service
   - Build Next.js API client
   - Test end-to-end flow

**Ready to proceed with implementation?** Let me know:
- Which option you prefer (1, 2, or 3)?
- Do you have access to modify Flow API code?
- Should I generate the complete implementation code?
