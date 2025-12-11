# Healthcare Conversation Platform - Deployment Guide

**Server:** Ubuntu 24 (Contabo)
**IP:** 82.208.21.17
**Domain:** api-conversation.kuzushilabs.xyz

---

## Quick Start (TL;DR)

```bash
# SSH to server
ssh root@82.208.21.17

# Navigate to backend
cd /opt/healthcare-conversation-platform/packages/backend

# Build and start
pnpm build
pm2 start ecosystem.config.js
pm2 save
```

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Prerequisites](#2-prerequisites)
3. [Database Setup](#3-database-setup)
4. [Deploy Application](#4-deploy-application)
5. [PM2 Process Manager](#5-pm2-process-manager)
6. [Nginx Configuration](#6-nginx-configuration)
7. [SSL with Certbot](#7-ssl-with-certbot)
8. [Seed Database](#8-seed-database)
9. [Maintenance](#9-maintenance)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture

```
                              Internet
                                  │
                                  ▼
                 ┌─────────────────────────────────┐
                 │  api-conversation.kuzushilabs.xyz  │
                 └─────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────┐
│                    Ubuntu 24 Server                         │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Nginx (Port 80/443)                     │  │
│   │   - SSL termination                                  │  │
│   │   - Proxy to localhost:4001                          │  │
│   │   - WebSocket support                                │  │
│   └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              PM2 → conversation-backend                │  │
│   │              NestJS on Port 4001                     │  │
│   └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│              ┌────────────┴────────────┐                   │
│              ▼                         ▼                    │
│   ┌──────────────────┐      ┌──────────────────┐          │
│   │  hal9000-postgres │      │   hal9000-redis  │          │
│   │  conversationdb   │      │                  │          │
│   └──────────────────┘      └──────────────────┘          │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

### 2.1 SSH to Server

```bash
ssh root@82.208.21.17
```

### 2.2 Verify Infrastructure

```bash
# Check HAL9000 services
cd /opt/system-infra
docker compose ps

# Expected: hal9000-postgres, hal9000-redis running
```

### 2.3 Required Tools

```bash
# Node.js 20+
node -v

# pnpm
pnpm -v

# PM2
pm2 -v
```

If missing, see [DEV_TOOLS_SETUP.md](../../system-infra/docs/instructions/DEV_TOOLS_SETUP.md).

---

## 3. Database Setup

### 3.1 Create Database

```bash
cd /opt/healthcare-conversation-platform
./scripts/create-postgres-db.sh
```

This creates:
- Database: `conversationdb`
- User: `conversation_user`
- Password: `Hc9Kp2mX7vR4nL6qW8sT3jF5bY1aD0eG`

### 3.2 Verify

```bash
docker exec -it hal9000-postgres psql -U conversation_user -d conversationdb -c '\dt'
```

---

## 4. Deploy Application

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

### 4.3 Configure Environment

```bash
cd packages/backend
cp .env.production .env
```

The `.env.production` is pre-configured with all values.

### 4.4 Run Migrations

```bash
pnpm db:generate
pnpm db:migrate:deploy
```

### 4.5 Build Application

```bash
pnpm build
```

This compiles TypeScript to `dist/main.js`.

---

## 5. PM2 Process Manager

### 5.1 File Location

```
/opt/healthcare-conversation-platform/packages/backend/ecosystem.config.js
```

### 5.2 Start Application

```bash
cd /opt/healthcare-conversation-platform/packages/backend

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Verify
pm2 status
```

**Expected output:**
```
┌────┬─────────────────────┬────────┬────────┬──────┬────────┐
│ id │ name                │ mode   │ status │ cpu  │ memory │
├────┼─────────────────────┼────────┼────────┼──────┼────────┤
│ 0  │ conversation-backend  │ fork   │ online │ 0%   │ 85mb   │
└────┴─────────────────────┴────────┴────────┴──────┴────────┘
```

### 5.3 Auto-Start on Reboot

```bash
pm2 startup
pm2 save
```

### 5.4 Verify Health

```bash
curl http://localhost:4001/api/health
# Expected: {"status":"ok"}
```

### 5.5 PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Show all processes |
| `pm2 logs conversation-backend` | View logs |
| `pm2 logs conversation-backend --lines 100` | Last 100 lines |
| `pm2 restart conversation-backend` | Restart |
| `pm2 stop conversation-backend` | Stop |
| `pm2 delete conversation-backend` | Remove from PM2 |
| `pm2 monit` | Live monitoring |

---

## 6. Nginx Configuration

### 6.1 Create Config

```bash
sudo nano /etc/nginx/sites-available/api-conversation.kuzushilabs.xyz
```

Paste:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api-conversation.kuzushilabs.xyz;

    # Logging
    access_log /var/log/nginx/api-conversation.access.log;
    error_log /var/log/nginx/api-conversation.error.log;

    # Security headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    # API and static files
    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 50M;
    }

    # WebSocket
    location /ws {
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

    # Socket.IO
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
}
```

### 6.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/api-conversation.kuzushilabs.xyz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. SSL with Certbot

### 7.1 DNS Setup

Add A record:
```
Type: A
Name: api-conversation
Value: 82.208.21.17
```

Verify:
```bash
dig api-conversation.kuzushilabs.xyz +short
```

### 7.2 Get Certificate

```bash
sudo certbot --nginx -d api-conversation.kuzushilabs.xyz
```

### 7.3 Verify

```bash
curl https://api-conversation.kuzushilabs.xyz/api/health
sudo certbot renew --dry-run
```

---

## 8. Seed Database

```bash
cd /opt/healthcare-conversation-platform/packages/backend

# Default seed
pnpm db:seed

# Scoring tool seed
npx ts-node prisma/seed-scoring-tool.ts
```

Verify:
```bash
docker exec -it hal9000-postgres psql -U conversation_user -d conversationdb \
  -c "SELECT name, slug FROM tenants;"
```

---

## 9. Maintenance

### 9.1 Deploy Updates

```bash
cd /opt/healthcare-conversation-platform

# Pull changes
git pull origin main

# Install dependencies
pnpm install

# Build
cd packages/backend
pnpm build

# Restart
pm2 restart conversation-backend
```

### 9.2 View Logs

```bash
# PM2 logs
pm2 logs conversation-backend

# Nginx logs
sudo tail -f /var/log/nginx/api-conversation.error.log
```

### 9.3 Database Backup

```bash
docker exec hal9000-postgres pg_dump -U conversation_user conversationdb > backup.sql
```

---

## 10. Troubleshooting

### App Not Starting

```bash
# Check logs
pm2 logs conversation-backend --lines 50

# Check if dist exists
ls -la packages/backend/dist/main.js

# Rebuild if needed
pnpm build
pm2 restart conversation-backend
```

### Database Connection Failed

```bash
# Test connection
docker exec -it hal9000-postgres psql -U conversation_user -d conversationdb -c 'SELECT 1'

# Check container
docker ps | grep hal9000-postgres
```

### Nginx 502 Bad Gateway

```bash
# Is app running?
pm2 status
curl http://localhost:4001/api/health

# Check nginx config
sudo nginx -t
```

### WebSocket Not Connecting

```bash
# Test WebSocket endpoint
curl -I -H "Upgrade: websocket" -H "Connection: upgrade" \
  https://api-conversation.kuzushilabs.xyz/ws
```

---

## Quick Reference

### File Locations

| Item | Path |
|------|------|
| Application | `/opt/healthcare-conversation-platform` |
| Backend | `/opt/healthcare-conversation-platform/packages/backend` |
| PM2 Config | `packages/backend/ecosystem.config.js` |
| Environment | `packages/backend/.env` |
| Logs | `packages/backend/logs/` |
| Nginx | `/etc/nginx/sites-available/api-conversation.kuzushilabs.xyz` |

### Credentials

| Service | Value |
|---------|-------|
| Database | `conversationdb` |
| DB User | `conversation_user` |
| DB Password | `Hc9Kp2mX7vR4nL6qW8sT3jF5bY1aD0eG` |
| App Port | `4001` |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/v1/docs` | Swagger docs |
| `WS /ws` | WebSocket |

---

*Last updated: December 11, 2024*
