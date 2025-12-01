# Kuzushi Backend API Routes

**Base URL:** `http://localhost:3001/api`
**Global Prefix:** All routes are prefixed with `/api`
**API Documentation:** `http://localhost:3001/api/v1/docs` (Swagger/OpenAPI)

---

## 🎯 Important: Route Structure

❌ **WRONG:**
```bash
curl http://localhost:3001/health          # 404 Not Found
curl http://localhost:3001/                # 404 Not Found
```

✅ **CORRECT:**
```bash
curl http://localhost:3001/api/health      # Works!
curl http://localhost:3001/api/v1/tenants  # Works!
```

**Why?** The backend has a global prefix of `/api` (see `src/main.ts:27`), so all routes must start with `/api`.

---

## 📍 Available Endpoints

### Health Check Endpoints

#### 1. **Health Check**
```bash
GET /api/health
```

**Purpose:** Basic health check with database connection status

**Example:**
```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-24T07:58:44.066Z",
  "database": "connected",
  "service": "kuzushi-backend"
}
```

#### 2. **Readiness Check**
```bash
GET /api/health/ready
```

**Purpose:** Detailed readiness check for Kubernetes/Docker deployments

**Example:**
```bash
curl http://localhost:3001/api/health/ready
```

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-11-24T07:58:51.086Z",
  "database": "connected",
  "checks": {
    "database": "ok",
    "schema": "ok",
    "tenants": 2
  }
}
```

#### 3. **Liveness Check**
```bash
GET /api/health/live
```

**Purpose:** Simple liveness check to verify the process is running

**Example:**
```bash
curl http://localhost:3001/api/health/live
```

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-11-24T07:58:51.094Z",
  "uptime": 94.864,
  "memory": {
    "used": 36,
    "total": 39
  }
}
```

---

## 📚 API Documentation (Swagger)

### **Interactive API Documentation**
```
GET /api/v1/docs
```

**Purpose:** Interactive Swagger/OpenAPI documentation for all API endpoints

**Example:**
Visit in your browser:
```
http://localhost:3001/api/v1/docs
```

**Features:**
- Interactive API explorer with "Try it out" functionality
- Automatic request/response examples
- Schema definitions for all DTOs
- Authentication support (Bearer token)
- Organized by tags (health, tenants, apps, configs, prompts, widget)

**OpenAPI JSON Spec:**
```bash
curl http://localhost:3001/api/v1/docs-json
```

---

### Tenant Management

#### **List All Tenants**
```bash
GET /api/v1/tenants
```

**Example:**
```bash
curl http://localhost:3001/api/v1/tenants
```

**Response:**
```json
[
  {
    "id": "75bae1ad-53c4-43b6-8498-537311e1a982",
    "name": "ACME Corporation",
    "slug": "acme-corp",
    "createdAt": "2025-11-24T07:34:24.173Z",
    "updatedAt": "2025-11-24T07:34:24.173Z",
    "_count": {
      "apps": 1
    }
  }
]
```

**Controller:** `src/modules/tenant/tenant.controller.ts`

---

### App Management

#### **App Operations**
```bash
GET    /api/v1/apps           # List all apps
GET    /api/v1/apps/:id       # Get app by ID
POST   /api/v1/apps           # Create new app
PATCH  /api/v1/apps/:id       # Update app
DELETE /api/v1/apps/:id       # Delete app
```

**Controller:** `src/modules/app-management/app-management.controller.ts`

---

### Widget Session Management

#### **Initialize Widget Session**
```bash
POST /api/v1/widget/session/init
```

**Purpose:** Initialize a new widget session for a client

**Example:**
```bash
curl -X POST http://localhost:3001/api/v1/widget/session/init \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "demo-support-widget",
    "hostOrigin": "https://example.com",
    "externalUserId": "user-123"
  }'
```

**Controller:** `src/modules/widget-session/widget-session.controller.ts`

---

### Configuration Management

#### **App Configuration**
```bash
GET  /api/v1/apps/:appId/configs           # List configs for app
GET  /api/v1/apps/:appId/configs/:version  # Get specific config version
POST /api/v1/apps/:appId/configs           # Create new config version
```

**Controller:** `src/modules/config-management/config-management.controller.ts`

---

### Prompt Management

#### **Prompt Operations**
```bash
GET    /api/v1/apps/:appId/prompts       # List prompts for app
GET    /api/v1/apps/:appId/prompts/:id   # Get specific prompt
POST   /api/v1/apps/:appId/prompts       # Create prompt
PATCH  /api/v1/apps/:appId/prompts/:id   # Update prompt
DELETE /api/v1/apps/:appId/prompts/:id   # Delete prompt
```

**Controller:** `src/modules/prompt/prompt.controller.ts`

---

## 🔧 Testing Endpoints

### Quick Test Script

```bash
#!/bin/bash
BASE_URL="http://localhost:3001/api"

echo "Testing Health Endpoints..."
echo "1. Basic Health:"
curl -s $BASE_URL/health | jq .

echo -e "\n2. Readiness:"
curl -s $BASE_URL/health/ready | jq .

echo -e "\n3. Liveness:"
curl -s $BASE_URL/health/live | jq .

echo -e "\nTesting API Endpoints..."
echo "4. Tenants:"
curl -s $BASE_URL/v1/tenants | jq '.[] | {id, name, slug}'

echo -e "\n5. Apps:"
curl -s $BASE_URL/v1/apps | jq '.[] | {id, name, projectId}'
```

---

## 🌐 WebSocket Endpoints

The backend also supports WebSocket connections for real-time communication:

```
ws://localhost:3001/ws
```

**Purpose:** Real-time chat and voice communication

**Note:** WebSocket routes are NOT prefixed with `/api`

---

## 🛡️ Authentication

Currently, the health endpoints are public. Other endpoints may require authentication via JWT tokens.

**Header:**
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔍 Debugging 404 Errors

If you're getting 404 errors:

### 1. ✅ Check the prefix
```bash
# ❌ Wrong
curl http://localhost:3001/health

# ✅ Correct
curl http://localhost:3001/api/health
```

### 2. ✅ Check the backend is running
```bash
# Should see: Kuzushi Backend running on http://localhost:3001
ps aux | grep "nest start"
```

### 3. ✅ Check the logs
```bash
cd packages/backend
pnpm run start:dev
# Watch for errors in console
```

### 4. ✅ Verify the route exists
Check this file for all available routes:
```bash
grep -r "@Get\|@Post\|@Put\|@Patch\|@Delete" packages/backend/src --include="*.controller.ts"
```

---

## 📊 Route Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/docs` | GET | **Swagger/OpenAPI documentation** |
| `/api/health` | GET | Health check |
| `/api/health/ready` | GET | Readiness probe |
| `/api/health/live` | GET | Liveness probe |
| `/api/v1/tenants` | GET/POST | List/create tenants |
| `/api/v1/tenants/:id` | GET/PATCH | Get/update tenant |
| `/api/v1/apps` | GET/POST | List/create apps |
| `/api/v1/apps/:id` | GET/PATCH | Get/update app |
| `/api/v1/apps/:appId/configs` | GET/POST | Config management |
| `/api/v1/apps/:appId/configs/active` | GET | Get active config |
| `/api/v1/apps/:appId/prompts` | GET/POST | Prompt management |
| `/api/v1/widget/session/init` | POST | Initialize widget session |

---

## 🚀 Production Considerations

### Change the Global Prefix

If you want to remove the `/api` prefix or change it:

**File:** `src/main.ts`
```typescript
// Remove prefix entirely
// app.setGlobalPrefix('api'); // Comment this out

// Or change to something else
app.setGlobalPrefix('v1'); // Now routes start with /v1/...
```

### Add Versioning

The API already uses `v1` in route paths. To add a new version:

1. Create new controllers with `@Controller('v2/...')`
2. Keep `v1` controllers for backwards compatibility
3. Document breaking changes between versions

---

## 📝 Files Created

- ✅ `src/health/health.controller.ts` - Health check endpoints
- ✅ `src/health/health.module.ts` - Health module
- ✅ `src/app.module.ts` - Updated to include HealthModule

---

## ✅ Verification

All endpoints tested and working:

```bash
✅ GET  /api/v1/docs             → 200 OK (Swagger UI)
✅ GET  /api/v1/docs-json        → 200 OK (OpenAPI JSON spec)
✅ GET  /api/health              → 200 OK
✅ GET  /api/health/ready        → 200 OK
✅ GET  /api/health/live         → 200 OK
✅ GET  /api/v1/tenants          → 200 OK (returns data)
✅ GET  /api/v1/apps             → 200 OK
```

---

**Happy API testing!** 🎉
