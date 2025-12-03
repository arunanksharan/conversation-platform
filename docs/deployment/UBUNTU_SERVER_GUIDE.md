# Ubuntu Server Deployment Guide

> Step-by-step guide for deploying the Kuzushi Healthcare Conversation Platform on Ubuntu Server.

---

## Prerequisites

- Ubuntu Server 22.04 LTS or 24.04 LTS
- Minimum 2GB RAM, 2 CPU cores (recommended: 4GB RAM, 4 cores for production)
- Root or sudo access
- Domain name (optional, for production)

---

## 1. System Preparation

### Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Essential Tools

```bash
sudo apt install -y curl wget git build-essential
```

---

## 2. Install Node.js 20+

### Using NodeSource Repository (Recommended)

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version
```

---

## 3. Install pnpm Package Manager

```bash
# Install pnpm globally
npm install -g pnpm@8

# Verify installation
pnpm --version  # Should be 8.x.x
```

---

## 4. Install PostgreSQL 14+

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

### Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE kuzushi;
CREATE USER kuzushi_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kuzushi TO kuzushi_user;

# Grant schema privileges (required for Prisma)
\c kuzushi
GRANT ALL ON SCHEMA public TO kuzushi_user;

# Exit psql
\q
```

### Configure PostgreSQL Authentication (Optional: Remote Access)

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf

# Uncomment and modify:
# listen_addresses = '*'

# Edit pg_hba.conf for remote access
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add line for remote access (adjust IP range as needed):
# host    all    all    0.0.0.0/0    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 5. Clone and Setup the Project

```bash
# Create application directory
sudo mkdir -p /opt/kuzushi
sudo chown $USER:$USER /opt/kuzushi

# Clone the repository
cd /opt/kuzushi
git clone <your-repository-url> .

# Install dependencies
pnpm install
```

---

## 6. Configure Environment Variables

### Create Backend .env File

```bash
cd /opt/kuzushi/packages/backend
cp .env.example .env
nano .env
```

### Environment Variables Configuration

```env
# Database
DATABASE_URL="postgresql://kuzushi_user:your_secure_password@localhost:5432/kuzushi?schema=public"

# JWT Configuration
JWT_SECRET="<generate-with: openssl rand -base64 64>"
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRE_DAYS=7

# Server
PORT=3001
NODE_ENV=production
BASE_URL="https://your-domain.com"  # Or http://your-server-ip:3001

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"
OPENAI_MODEL="gpt-4o"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# CORS (production: restrict to your domains)
CORS_ORIGIN="https://your-frontend-domain.com,https://widget-host-domain.com"

# WebSocket
WS_PATH="/ws"
```

### Generate Secure JWT Secret

```bash
openssl rand -base64 64
```

---

## 7. Database Migration and Seeding

```bash
cd /opt/kuzushi/packages/backend

# Generate Prisma client
pnpm run db:generate

# Run database migrations
pnpm run db:migrate

# Seed initial data (creates demo tenants and apps)
pnpm run db:seed
```

### Verify Seed Data

```bash
# Connect to database and verify
psql -U kuzushi_user -d kuzushi -c "SELECT name, slug FROM tenants;"
psql -U kuzushi_user -d kuzushi -c "SELECT name, \"projectId\" FROM apps;"
```

---

## 8. Build the Application

```bash
cd /opt/kuzushi

# Build all packages
pnpm build
```

---

## 9. Setup systemd Service (Production)

### Create Service File

```bash
sudo nano /etc/systemd/system/kuzushi-backend.service
```

### Service Configuration

```ini
[Unit]
Description=Kuzushi Healthcare Conversation Platform Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/kuzushi/packages/backend
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Resource limits
MemoryMax=1G
CPUQuota=80%

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

### Set Permissions and Start Service

```bash
# Set ownership
sudo chown -R www-data:www-data /opt/kuzushi

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable kuzushi-backend
sudo systemctl start kuzushi-backend

# Check status
sudo systemctl status kuzushi-backend

# View logs
sudo journalctl -u kuzushi-backend -f
```

---

## 10. Setup Nginx Reverse Proxy (Recommended)

### Install Nginx

```bash
sudo apt install -y nginx
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/kuzushi
```

### Nginx Configuration

```nginx
upstream kuzushi_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS (enable after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://kuzushi_backend;
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

    # WebSocket support for /ws/*
    location /ws {
        proxy_pass http://kuzushi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # API documentation
    location /api/v1/docs {
        proxy_pass http://kuzushi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/kuzushi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 11. SSL/TLS with Let's Encrypt (Production)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

---

## 12. Firewall Configuration

```bash
# Install UFW if not present
sudo apt install -y ufw

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 13. Verify Deployment

### Health Check

```bash
# Local test
curl http://localhost:3001/api/health

# External test (replace with your domain/IP)
curl http://your-domain.com/api/health
```

### Expected Response

```json
{
  "status": "ok",
  "timestamp": "2025-12-01T12:00:00.000Z",
  "database": "connected",
  "service": "kuzushi-backend"
}
```

### Test API

```bash
# List tenants
curl http://your-domain.com/api/v1/tenants

# Initialize widget session
curl -X POST http://your-domain.com/api/v1/widget/session/init \
  -H "Content-Type: application/json" \
  -d '{"projectId": "demo-support-widget"}'
```

---

## 14. Monitoring and Logs

### View Application Logs

```bash
# Systemd journal
sudo journalctl -u kuzushi-backend -f --lines=100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/kuzushi
```

```
/var/log/kuzushi/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload kuzushi-backend > /dev/null
    endscript
}
```

---

## 15. Backup Strategy

### Database Backup Script

```bash
sudo nano /opt/kuzushi/scripts/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/kuzushi/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kuzushi_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR
pg_dump -U kuzushi_user -d kuzushi | gzip > $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
```

```bash
chmod +x /opt/kuzushi/scripts/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/kuzushi/scripts/backup-db.sh") | crontab -
```

---

## Troubleshooting

### Common Issues

1. **Port 3001 already in use**
   ```bash
   sudo lsof -i :3001
   sudo kill -9 <PID>
   ```

2. **Database connection failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql

   # Check connection
   psql -U kuzushi_user -d kuzushi -c "SELECT 1"
   ```

3. **Permission denied**
   ```bash
   sudo chown -R www-data:www-data /opt/kuzushi
   ```

4. **WebSocket connection issues**
   - Ensure Nginx is configured for WebSocket upgrade
   - Check `proxy_read_timeout` settings

---

## Quick Reference

| Service | Command |
|---------|---------|
| Start backend | `sudo systemctl start kuzushi-backend` |
| Stop backend | `sudo systemctl stop kuzushi-backend` |
| Restart backend | `sudo systemctl restart kuzushi-backend` |
| View logs | `sudo journalctl -u kuzushi-backend -f` |
| Nginx reload | `sudo systemctl reload nginx` |
| DB migrate | `cd /opt/kuzushi/packages/backend && pnpm run db:migrate` |

---

## Credentials Summary

| Credential | Description | Example/Default |
|------------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/kuzushi` |
| `JWT_SECRET` | Secret key for JWT signing | Generate with `openssl rand -base64 64` |
| `OPENAI_API_KEY` | OpenAI API key for LLM | `sk-...` (get from OpenAI dashboard) |
| `CORS_ORIGIN` | Allowed CORS origins | `*` (dev) or specific domains (prod) |

---

_Last updated: 2025-12-01_
