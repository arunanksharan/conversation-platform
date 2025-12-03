# Step-by-Step Deployment Guide

> Comprehensive guide for deploying the Healthcare Conversation Platform to a production server.

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Server Preparation](#2-server-preparation)
3. [Database Setup](#3-database-setup)
4. [Application Deployment](#4-application-deployment)
5. [Environment Configuration](#5-environment-configuration)
6. [Build and Start](#6-build-and-start)
7. [Verification](#7-verification)
8. [Post-Deployment](#8-post-deployment)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Pre-Deployment Checklist

### Required Credentials

| Credential | Where to Get | Example |
|------------|--------------|---------|
| Server SSH access | Your hosting provider | `ssh -i key.pem user@ip` |
| PostgreSQL password | Generate secure password | `openssl rand -base64 24` |
| JWT Secret | Generate secure key | `openssl rand -base64 64` |
| OpenAI API Key | https://platform.openai.com/api-keys | `sk-proj-...` |

### Server Requirements

- Ubuntu 22.04+ or similar Linux
- Node.js 20+
- pnpm 8+
- PostgreSQL 14+ (can be Docker container)
- PM2 (process manager)
- Nginx (reverse proxy, optional but recommended)
- 2GB+ RAM, 2+ CPU cores

---

## 2. Server Preparation

### Step 2.1: Connect to Server

```bash
# From your local machine
ssh -i ~/.ssh/your_key root@YOUR_SERVER_IP

# Or with password
ssh root@YOUR_SERVER_IP
```

### Step 2.2: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2.3: Install Node.js 20

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # Should be v20.x.x
npm --version
```

### Step 2.4: Install pnpm

```bash
npm install -g pnpm@8
pnpm --version   # Should be 8.x.x
```

### Step 2.5: Install PM2

```bash
npm install -g pm2
pm2 --version
```

### Step 2.6: Install Git

```bash
sudo apt install -y git
```

---

## 3. Database Setup

### Option A: PostgreSQL in Docker (Recommended)

```bash
# If Docker is installed and PostgreSQL container exists
docker ps | grep postgres

# Check container name (e.g., postgres_db_kuzushi)
# Connect to create database:
docker exec -it postgres_db_kuzushi psql -U postgres
```

### Option B: Native PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 3.1: Create Database

```bash
# Connect to PostgreSQL
# Docker: docker exec -it postgres_db_kuzushi psql -U postgres
# Native: sudo -u postgres psql

# Run these SQL commands:
CREATE DATABASE healthcare_conversation;
CREATE USER healthcare_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE healthcare_conversation TO healthcare_user;

# Connect to the new database
\c healthcare_conversation

# Grant schema privileges (required for Prisma)
GRANT ALL ON SCHEMA public TO healthcare_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO healthcare_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO healthcare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO healthcare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO healthcare_user;

# Exit
\q
```

### Step 3.2: Test Database Connection

```bash
# Test connection (adjust host if using Docker)
psql -h localhost -U healthcare_user -d healthcare_conversation -c "SELECT 1"
```

---

## 4. Application Deployment

### Step 4.1: Create Application Directory

```bash
mkdir -p /root/healthcare
cd /root/healthcare
```

### Step 4.2: Clone Repository

```bash
# Using SSH (requires SSH key setup with GitHub)
git clone git@github.com:arunanksharan/conversation-platform.git

# Or using HTTPS
git clone https://github.com/arunanksharan/conversation-platform.git

# Enter directory
cd conversation-platform
```

### Step 4.3: Install Dependencies

```bash
pnpm install
```

---

## 5. Environment Configuration

### Step 5.1: Create .env File

```bash
cd packages/backend
cp .env.example .env
nano .env
```

### Step 5.2: Configure Environment Variables

```env
# Database - UPDATE THESE VALUES
DATABASE_URL="postgresql://healthcare_user:YOUR_SECURE_PASSWORD@localhost:5432/healthcare_conversation?schema=public"

# JWT - GENERATE NEW SECRETS
JWT_SECRET="GENERATE_WITH_openssl_rand_-base64_64"
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRE_DAYS=7

# Server - USE PORT 4002 FOR THIS DEPLOYMENT
PORT=4002
NODE_ENV=production
BASE_URL="http://YOUR_SERVER_IP:4002"

# OpenAI - ADD YOUR API KEY
OPENAI_API_KEY="sk-proj-your-actual-api-key"
OPENAI_MODEL="gpt-4o"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# CORS - CONFIGURE FOR YOUR FRONTEND DOMAINS
CORS_ORIGIN="*"

# WebSocket
WS_PATH="/ws"
```

### Step 5.3: Generate Secure Secrets

```bash
# Generate JWT Secret (run this and copy output to .env)
openssl rand -base64 64

# Generate database password (if you haven't already)
openssl rand -base64 24
```

---

## 6. Build and Start

### Step 6.1: Generate Prisma Client

```bash
cd /root/healthcare/conversation-platform/packages/backend
pnpm run db:generate
```

### Step 6.2: Run Database Migrations

```bash
pnpm run db:migrate
```

### Step 6.3: Seed Database (Optional but Recommended)

```bash
pnpm run db:seed
```

This creates:
- Demo tenants (ACME Corporation, TechStart.io)
- Demo apps with project IDs
- Sample prompt profiles

### Step 6.4: Build Application

```bash
# Go to project root
cd /root/healthcare/conversation-platform

# Build all packages
pnpm build
```

### Step 6.5: Create Logs Directory

```bash
mkdir -p /root/healthcare/conversation-platform/logs
```

### Step 6.6: Start with PM2

```bash
cd /root/healthcare/conversation-platform

# Start in production mode (port 4002)
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# View logs
pm2 logs healthcare-backend
```

### Step 6.7: Save PM2 Process List

```bash
# Save current process list
pm2 save

# Setup PM2 to start on system reboot
pm2 startup

# Follow the instructions it prints (copy and run the command)
```

---

## 7. Verification

### Step 7.1: Check Process Status

```bash
pm2 status
```

Expected output:
```
┌─────────────────────────┬─────────┬────────┬──────────┐
│ name                    │ status  │ cpu    │ memory   │
├─────────────────────────┼─────────┼────────┼──────────┤
│ healthcare-backend      │ online  │ 0%     │ ~100MB   │
└─────────────────────────┴─────────┴────────┴──────────┘
```

### Step 7.2: Test Health Endpoint

```bash
curl http://localhost:4002/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","database":"connected","service":"kuzushi-backend"}
```

### Step 7.3: Test API Endpoints

```bash
# List tenants
curl http://localhost:4002/api/v1/tenants

# List apps
curl http://localhost:4002/api/v1/apps

# Initialize widget session
curl -X POST http://localhost:4002/api/v1/widget/session/init \
  -H "Content-Type: application/json" \
  -d '{"projectId": "demo-support-widget"}'
```

### Step 7.4: Test External Access

From your local machine:
```bash
curl http://YOUR_SERVER_IP:4002/api/health
```

If this fails, check firewall:
```bash
# On server - allow port 4002
sudo ufw allow 4002/tcp
```

---

## 8. Post-Deployment

### Step 8.1: Setup Nginx Reverse Proxy (Optional)

```bash
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/healthcare-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/healthcare-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8.2: Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Step 8.3: Configure Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 9. Troubleshooting

### Problem: PM2 shows "errored" status

```bash
# Check error logs
pm2 logs healthcare-backend --err --lines 50

# Common causes:
# - Missing .env file
# - Database connection failed
# - Port already in use
```

### Problem: Database connection failed

```bash
# Test connection manually
psql -h localhost -U healthcare_user -d healthcare_conversation -c "SELECT 1"

# Check PostgreSQL is running
systemctl status postgresql
# Or for Docker:
docker ps | grep postgres
```

### Problem: Port already in use

```bash
# Find what's using the port
lsof -i :4002

# Kill the process or change port in .env
```

### Problem: Permission denied

```bash
# Fix ownership
chown -R $USER:$USER /root/healthcare/conversation-platform
```

### Problem: Out of memory

```bash
# Check memory
free -m

# Reduce Node.js memory limit in ecosystem.config.js
# interpreter_args: '--max-old-space-size=512'
```

---

## Quick Reference Commands

| Action | Command |
|--------|---------|
| Start | `pm2 start ecosystem.config.js --env production` |
| Stop | `pm2 stop healthcare-backend` |
| Restart | `pm2 restart healthcare-backend` |
| View logs | `pm2 logs healthcare-backend` |
| Monitor | `pm2 monit` |
| Delete | `pm2 delete healthcare-backend` |
| Save state | `pm2 save` |
| Update code | `git pull && pnpm build && pm2 restart healthcare-backend` |

---

## Deployment Checklist

- [ ] Server accessible via SSH
- [ ] Node.js 20+ installed
- [ ] pnpm 8+ installed
- [ ] PM2 installed
- [ ] PostgreSQL running and accessible
- [ ] Database and user created
- [ ] Repository cloned
- [ ] Dependencies installed (`pnpm install`)
- [ ] `.env` file configured with all secrets
- [ ] Prisma client generated
- [ ] Database migrations run
- [ ] Database seeded (optional)
- [ ] Application built (`pnpm build`)
- [ ] PM2 process started
- [ ] Health endpoint responding
- [ ] API endpoints working
- [ ] PM2 startup configured
- [ ] Firewall configured
- [ ] Nginx configured (optional)
- [ ] SSL certificate installed (optional)

---

_Last updated: 2025-12-03_
