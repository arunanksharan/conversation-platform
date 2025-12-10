# Healthcare Conversation Platform - Deployment Guide

**Server:** Ubuntu 24 (Contabo)
**IP:** 82.208.21.17
**Domain:** api-conversation.kuzushilabs.xyz
**SSH:** `ssh -i contabo root@82.208.21.17`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Database Setup](#3-database-setup)
4. [Clone and Configure Repository](#4-clone-and-configure-repository)
5. [Build and Run with PM2](#5-build-and-run-with-pm2)
6. [Nginx Configuration](#6-nginx-configuration)
7. [SSL with Certbot](#7-ssl-with-certbot)
8. [Seed Database](#8-seed-database)
9. [Verification](#9-verification)
10. [Troubleshooting](#10-troubleshooting)
11. [Quick Reference](#11-quick-reference)

---

## 1. Architecture Overview

```
                                Internet
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   api-conversation.kuzushilabs.xyz   │
                    └───────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Ubuntu 24 Server                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Nginx (Port 80/443)                      │  │
│  │  api-conversation.kuzushilabs.xyz → proxy 127.0.0.1:4001   │  │
│  │  + SSL termination                                          │  │
│  │  + WebSocket support (/ws)                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              PM2 Process Manager                            │  │
│  │  healthcare-backend (NestJS) → Port 4001                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│              ┌───────────────┴───────────────┐                   │
│              ▼                               ▼                    │
│  ┌──────────────────────┐       ┌──────────────────────┐        │
│  │   hal9000-postgres   │       │    hal9000-redis     │        │
│  │   conversationdb     │       │       (DB 2)         │        │
│  └──────────────────────┘       └──────────────────────┘        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  HAL9000 Infrastructure                     │  │
│  │              /opt/system-infra                              │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

### 2.1 Connect to Server

```bash
ssh -i contabo root@82.208.21.17
```

### 2.2 Verify HAL9000 is Running

```bash
cd /opt/system-infra
docker compose ps

# Expected output:
# hal9000-postgres   running (healthy)
# hal9000-redis      running (healthy)
# hal9000-mongodb    running (healthy)
```

If not running:
```bash
./scripts/up.sh
# Select: 1,2 (postgres, redis)
```

### 2.3 Install Node.js 20+ and pnpm

```bash
# Check Node version
node -v  # Should be >= 20.0.0

# If not installed or wrong version:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Verify
pnpm -v  # Should be >= 8.15.0
```

### 2.4 Install PM2

```bash
npm install -g pm2

# Verify
pm2 -v
```

---

## 3. Database Setup

### 3.1 Understanding PostgreSQL Users

**Important Concept:** PostgreSQL supports multiple users with different passwords:

| User Type | Use Case | Security Level |
|-----------|----------|----------------|
| `postgres` (superuser) | Create databases, users, admin tasks | Full access - use sparingly |
| `conversation_user` (app user) | Application database access only | Limited - recommended for apps |

**Our approach:** Create a dedicated `conversation_user` that can only access `conversationdb`.

### 3.2 Create Database and User

**Option A: Using the provided script (recommended)**

```bash
# On the server, navigate to the project (after cloning in step 4)
cd /opt/healthcare-conversation-platform

# Run the database setup script
./scripts/create-postgres-db.sh --production
```

**Option B: Manual creation**

```bash
# Connect to PostgreSQL as superuser
docker exec -it hal9000-postgres psql -U postgres

# Create database
CREATE DATABASE conversationdb;

# Create dedicated user
CREATE USER conversation_user WITH PASSWORD 'Hc9Kp2mX7vR4nL6qW8sT3jF5bY1aD0eG';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE conversationdb TO conversation_user;

# Connect to the database and grant schema access
\c conversationdb
GRANT ALL ON SCHEMA public TO conversation_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO conversation_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO conversation_user;

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Exit
\q
```

### 3.3 Verify Database

```bash
# Test connection with app user
docker exec -it hal9000-postgres psql -U conversation_user -d conversationdb -c '\dt'

# Should connect successfully (empty table list initially)
```

### 3.4 Connection String

For production (`.env.production`):
```
DATABASE_URL=postgresql://conversation_user:Hc9Kp2mX7vR4nL6qW8sT3jF5bY1aD0eG@localhost:5432/conversationdb
```

---

## 4. Clone and Configure Repository

### 4.1 Clone Repository

```bash
cd /opt
git clone https://github.com/arunanksharan/healthcare-conversation-platform.git
cd healthcare-conversation-platform
```

### 4.2 Install Dependencies

```bash
pnpm install
```

### 4.3 Configure Production Environment

```bash
cd packages/backend

# Copy production template (all values pre-configured)
cp .env.production .env
```

**Note:** The `.env.production` file already contains:
- ✅ JWT_SECRET (64-byte secure random)
- ✅ OPENAI_API_KEY (production key)
- ✅ DATABASE_URL (conversation_user credentials)
- ✅ CORS_ORIGIN (kuzushilabs.xyz domains)

No manual edits required.

### 4.4 Run Database Migrations

```bash
cd /opt/healthcare-conversation-platform/packages/backend

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:deploy
```

### 4.5 Build the Application

```bash
cd /opt/healthcare-conversation-platform

# Build all packages
pnpm build
```

---

## 5. Build and Run with PM2

### 5.1 Create Logs Directory

```bash
mkdir -p /opt/healthcare-conversation-platform/logs
```

### 5.2 Start with PM2

```bash
cd /opt/healthcare-conversation-platform

# Start in production mode
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# View logs
pm2 logs healthcare-backend
```

### 5.3 Configure PM2 Startup

```bash
# Generate startup script (run as root)
pm2 startup

# Save current process list
pm2 save
```

### 5.4 Verify Application

```bash
# Check health endpoint
curl http://localhost:4001/api/health

# Expected: {"status":"ok","database":"connected"}
```

---

## 6. Nginx Configuration

### 6.1 Create Server Block

```bash
sudo nano /etc/nginx/sites-available/api-conversation.kuzushilabs.xyz
```

**Paste this configuration:**

```nginx
# Healthcare Conversation Platform API
# api-conversation.kuzushilabs.xyz

server {
    listen 80;
    listen [::]:80;
    server_name api-conversation.kuzushilabs.xyz;

    # Security headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/api-conversation.kuzushilabs.xyz.access.log;
    error_log /var/log/nginx/api-conversation.kuzushilabs.xyz.error.log;

    # API endpoints
    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Request body size (for file uploads if needed)
        client_max_body_size 50M;
    }

    # WebSocket endpoints
    location /ws {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;

        # WebSocket upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeouts for WebSocket connections
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Disable buffering for real-time
        proxy_buffering off;
    }

    # Socket.IO specific path (if different)
    location /socket.io {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://127.0.0.1:4001/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

### 6.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/api-conversation.kuzushilabs.xyz /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 7. SSL with Certbot

### 7.1 Ensure DNS is Configured

Add an A record in your DNS provider:
```
Type: A
Name: api-conversation
Value: 82.208.21.17
TTL: 300
```

Verify:
```bash
dig api-conversation.kuzushilabs.xyz +short
# Should return: 82.208.21.17
```

### 7.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d api-conversation.kuzushilabs.xyz
```

Follow prompts:
1. Enter email for notifications
2. Accept Terms of Service
3. Choose to redirect HTTP to HTTPS (recommended)

### 7.3 Verify SSL

```bash
# Test HTTPS
curl -I https://api-conversation.kuzushilabs.xyz/api/health

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 8. Seed Database

### 8.1 Run Default Seed

```bash
cd /opt/healthcare-conversation-platform/packages/backend

# Run default seed (creates demo tenants/apps)
pnpm db:seed
```

### 8.2 Run Scoring Tool Seed

```bash
# Run scoring-tool specific seed
npx ts-node prisma/seed-scoring-tool.ts
```

### 8.3 Verify Seed Data

```bash
# Connect to database
docker exec -it hal9000-postgres psql -U conversation_user -d conversationdb

# Check tenants
SELECT name, slug FROM tenants;

# Check apps
SELECT name, "projectId", "isActive" FROM apps;

# Exit
\q
```

**Expected output:**

| Tenant | Apps |
|--------|------|
| Kuzushi Labs Healthcare | patient-scoring-tool |
| Demo Healthcare Clinic | mental-health-screening, chronic-pain-assessment |

---

## 9. Verification

### 9.1 Check All Services

```bash
# PM2 status
pm2 status

# Nginx status
sudo systemctl status nginx

# HAL9000 services
cd /opt/system-infra && docker compose ps
```

### 9.2 Test Endpoints

```bash
# Health check
curl https://api-conversation.kuzushilabs.xyz/api/health

# API documentation (if enabled)
echo "Visit: https://api-conversation.kuzushilabs.xyz/api/v1/docs"

# List tenants
curl https://api-conversation.kuzushilabs.xyz/api/v1/tenants
```

### 9.3 Test WebSocket Connection

```javascript
// Run in browser console or Node.js
const socket = io('https://api-conversation.kuzushilabs.xyz', {
  path: '/ws/chat',
  transports: ['websocket']
});

socket.on('connect', () => console.log('Connected!'));
socket.on('error', (err) => console.error('Error:', err));
```

---

## 10. Troubleshooting

### PM2 Issues

```bash
# View logs
pm2 logs healthcare-backend --lines 100

# Restart application
pm2 restart healthcare-backend

# Check memory usage
pm2 monit
```

### Database Connection Issues

```bash
# Test database connection
docker exec -it hal9000-postgres psql -U conversation_user -d conversationdb -c 'SELECT 1'

# Check if PostgreSQL is running
docker ps | grep hal9000-postgres

# View PostgreSQL logs
docker logs hal9000-postgres --tail 50
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/api-conversation.kuzushilabs.xyz.error.log

# Reload after changes
sudo systemctl reload nginx
```

### WebSocket Not Connecting

1. Check Nginx has WebSocket headers configured
2. Verify `proxy_read_timeout` is long enough
3. Check CORS settings in `.env`

```bash
# Test WebSocket path
curl -I -H "Upgrade: websocket" -H "Connection: upgrade" \
  https://api-conversation.kuzushilabs.xyz/ws/chat
```

---

## 11. Quick Reference

### File Locations

| Item | Path |
|------|------|
| Application | `/opt/healthcare-conversation-platform` |
| Backend | `/opt/healthcare-conversation-platform/packages/backend` |
| Environment | `/opt/healthcare-conversation-platform/packages/backend/.env` |
| PM2 Config | `/opt/healthcare-conversation-platform/ecosystem.config.js` |
| PM2 Logs | `/opt/healthcare-conversation-platform/logs/` |
| Nginx Config | `/etc/nginx/sites-available/api-conversation.kuzushilabs.xyz` |
| Nginx Logs | `/var/log/nginx/api-conversation.kuzushilabs.xyz.*` |
| SSL Certs | `/etc/letsencrypt/live/api-conversation.kuzushilabs.xyz/` |
| HAL9000 | `/opt/system-infra` |

### Common Commands

| Task | Command |
|------|---------|
| Start app | `pm2 start ecosystem.config.js --env production` |
| Stop app | `pm2 stop healthcare-backend` |
| Restart app | `pm2 restart healthcare-backend` |
| View logs | `pm2 logs healthcare-backend` |
| Monitor | `pm2 monit` |
| Rebuild | `cd /opt/healthcare-conversation-platform && pnpm build` |
| Run migrations | `cd packages/backend && pnpm db:migrate:deploy` |
| Seed database | `cd packages/backend && pnpm db:seed` |
| Nginx reload | `sudo systemctl reload nginx` |
| SSL renew | `sudo certbot renew` |

### Database Credentials

| Item | Value |
|------|-------|
| Host | localhost (or hal9000-postgres from Docker) |
| Port | 5432 |
| Database | conversationdb |
| User | conversation_user |
| Password | Hc9Kp2mX7vR4nL6qW8sT3jF5bY1aD0eG |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/v1/docs` | Swagger documentation |
| `GET /api/v1/tenants` | List tenants |
| `GET /api/v1/apps` | List apps |
| `POST /api/v1/widget/session/init` | Initialize widget session |
| `WS /ws/chat` | Chat WebSocket |
| `WS /ws/voice` | Voice WebSocket |

---

## Appendix: Understanding PostgreSQL Multi-User Setup

### Why Use Separate Users?

```
┌─────────────────────────────────────────────────────────────┐
│                   HAL9000 PostgreSQL                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  postgres (superuser)                                │    │
│  │  - Can create databases                              │    │
│  │  - Can create users                                  │    │
│  │  - Full administrative access                        │    │
│  │  - Password: qCKO4bLYIzhmaxQtszgsEKWtpRO9pWBS       │    │
│  └─────────────────────────────────────────────────────┘    │
│           │                                                  │
│           │ Creates                                          │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  conversation_user                                   │    │
│  │  - Can only access conversationdb                   │    │
│  │  - Cannot create other databases                    │    │
│  │  - Cannot create other users                        │    │
│  │  - Password: Hc9Kp2mX7vR4nL6qW8sT3jF5bY1aD0eG      │    │
│  │  └── conversationdb (full access)                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  docmost (another app user)                         │    │
│  │  - Can only access docmost database                 │    │
│  │  - Isolated from conversation_user                  │    │
│  │  └── docmost (full access)                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  n8n (another app user)                             │    │
│  │  - Can only access n8n database                     │    │
│  │  └── n8n (full access)                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Separate Users

1. **Security Isolation:** If one app is compromised, others are protected
2. **Audit Trail:** Track which app made which database changes
3. **Resource Management:** Can set per-user connection limits
4. **Principle of Least Privilege:** Apps only access what they need

### When to Use Superuser

- Creating new databases
- Creating new users
- Running administrative tasks
- One-time setup operations

### When to Use App User

- All application runtime operations
- Migrations (with proper permissions granted)
- Data queries and mutations

---

*Last updated: December 2024*
