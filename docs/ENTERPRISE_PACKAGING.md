# Enterprise Packaging & Distribution Guide

## Overview

This guide explains how to package and sell the Healthcare Conversation Platform as a standalone, enterprise-ready product.

## Table of Contents
1. [Packaging Strategy](#packaging-strategy)
2. [Docker Containerization](#docker-containerization)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [White-Label Configuration](#white-label-configuration)
5. [Licensing & Activation](#licensing--activation)
6. [Client Deployment Options](#client-deployment-options)
7. [Pricing Models](#pricing-models)

---

## Packaging Strategy

### Three-Tier Offering

#### 1. **Starter Package** (Small Clinics/Practices)
- Text-only mode
- Up to 100 conversations/month
- Community support
- Self-hosted or cloud options
- **Price**: $299/month or $2,500/year

#### 2. **Professional Package** (Hospitals/Health Systems)
- Text + Voice mode
- Up to 10,000 conversations/month
- Priority email support
- Advanced analytics dashboard
- HIPAA compliance tools
- Multi-tenant support
- **Price**: $1,499/month or $15,000/year

#### 3. **Enterprise Package** (Large Healthcare Organizations)
- Unlimited conversations
- Dedicated support & SLA
- Custom integrations
- On-premise deployment option
- White-label customization
- Training & onboarding
- **Price**: Custom (starting at $5,000/month)

---

## Docker Containerization

### Complete Docker Setup

Create the following structure:

```
healthcare-conversation-platform/
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── conversation-core.Dockerfile
│   ├── voice-pipeline.Dockerfile
│   └── nginx.Dockerfile
├── deploy/
│   ├── kubernetes/
│   ├── terraform/
│   └── scripts/
└── .env.template
```

### docker-compose.yml (Development + Production Ready)

```yaml
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:6.0
    container_name: healthcare-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-changeme}
      MONGO_INITDB_DATABASE: conversation-platform
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
      - ./docker/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js
    networks:
      - healthcare-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: healthcare-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - healthcare-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # conversation-core (NestJS Backend)
  conversation-core:
    build:
      context: .
      dockerfile: docker/conversation-core.Dockerfile
    container_name: healthcare-conversation-core
    restart: unless-stopped
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=3001
      - MONGODB_URI=mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-changeme}@mongodb:27017/conversation-platform?authSource=admin
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LIVEKIT_URL=${LIVEKIT_URL}
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
      - PYTHON_VOICE_SERVICE_URL=http://voice-pipeline:8000
      - CORS_ORIGIN=${CORS_ORIGIN:-*}
      - ENABLE_AUDIT_LOGGING=true
      - ENABLE_PHI_DETECTION=true
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    ports:
      - "3001:3001"
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - healthcare-network
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # voice-pipeline (Python FastAPI)
  voice-pipeline:
    build:
      context: .
      dockerfile: docker/voice-pipeline.Dockerfile
    container_name: healthcare-voice-pipeline
    restart: unless-stopped
    environment:
      - PORT=8000
      - HOST=0.0.0.0
      - LIVEKIT_URL=${LIVEKIT_URL}
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
      - NESTJS_SERVICE_URL=http://conversation-core:3001
      - STT_PROVIDER=${STT_PROVIDER:-google}
      - TTS_PROVIDER=${TTS_PROVIDER:-google}
    ports:
      - "8000:8000"
    depends_on:
      - conversation-core
    networks:
      - healthcare-network
    volumes:
      - ./google-credentials.json:/app/credentials.json:ro
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy (Production)
  nginx:
    build:
      context: .
      dockerfile: docker/nginx.Dockerfile
    container_name: healthcare-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - conversation-core
      - voice-pipeline
    networks:
      - healthcare-network
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    profiles:
      - production

volumes:
  mongodb_data:
    driver: local
  mongodb_config:
    driver: local
  redis_data:
    driver: local
  nginx_logs:
    driver: local

networks:
  healthcare-network:
    driver: bridge
```

### Dockerfile: conversation-core.Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY packages/conversation-core/package*.json ./
COPY packages/conversation-core/pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/conversation-core ./

# Build application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY packages/conversation-core/package*.json ./
COPY packages/conversation-core/pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p /app/logs

# Set NODE_ENV
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
```

### Dockerfile: voice-pipeline.Dockerfile

```dockerfile
# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files
COPY packages/voice-pipeline/pyproject.toml packages/voice-pipeline/poetry.lock ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-dev

# Production stage
FROM python:3.11-slim AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY packages/voice-pipeline/app ./app

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start application
CMD ["python", "-m", "app.main"]
```

### Dockerfile: nginx.Dockerfile

```dockerfile
FROM nginx:alpine

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy SSL certificates (if available)
COPY ssl/* /etc/nginx/ssl/ 2>/dev/null || true

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream conversation_backend {
        server conversation-core:3001;
    }

    upstream voice_backend {
        server voice-pipeline:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        listen 80;
        server_name _;

        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/certificate.crt;
        ssl_certificate_key /etc/nginx/ssl/private.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API endpoints
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://conversation_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket endpoints
        location /ws/ {
            proxy_pass http://conversation_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400;
        }

        # Voice service endpoints
        location /voice/ {
            proxy_pass http://voice_backend/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://conversation_backend/health;
        }
    }
}
```

### .env.template

```env
# ======================
# ENTERPRISE CONFIGURATION
# ======================
COMPANY_NAME=YourCompany
LICENSE_KEY=XXXX-XXXX-XXXX-XXXX
DEPLOYMENT_ID=unique-deployment-id

# ======================
# Database Configuration
# ======================
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=CHANGE_ME_IN_PRODUCTION
MONGODB_URI=mongodb://admin:CHANGE_ME@mongodb:27017/conversation-platform?authSource=admin

# ======================
# Authentication
# ======================
JWT_SECRET=CHANGE_ME_32_CHAR_SECRET_KEY_HERE
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=CHANGE_ME_32_CHAR_ENCRYPTION_KEY

# ======================
# LiveKit Configuration
# ======================
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# ======================
# OpenAI Configuration
# ======================
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# ======================
# Google Cloud (Optional)
# ======================
GOOGLE_CLOUD_PROJECT_ID=your-project-id
# Mount google-credentials.json file

# ======================
# ElevenLabs (Optional)
# ======================
ELEVENLABS_API_KEY=your-key-here

# ======================
# Voice Configuration
# ======================
STT_PROVIDER=google
TTS_PROVIDER=google

# ======================
# Server Configuration
# ======================
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

### Deployment Scripts

**deploy/scripts/start.sh**

```bash
#!/bin/bash

set -e

echo "🚀 Starting Healthcare Conversation Platform..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "📝 Please copy .env.template to .env and configure it"
    exit 1
fi

# Source environment variables
source .env

# Validate required variables
required_vars=(
    "MONGO_ROOT_PASSWORD"
    "JWT_SECRET"
    "OPENAI_API_KEY"
    "LIVEKIT_URL"
    "LIVEKIT_API_KEY"
    "LIVEKIT_API_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env"
        exit 1
    fi
done

# Pull latest images
echo "📦 Pulling Docker images..."
docker-compose pull

# Start services
echo "🔄 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo "🏥 Checking service health..."
curl -f http://localhost:3001/health || echo "⚠️  conversation-core not ready yet"
curl -f http://localhost:8000/api/v1/health || echo "⚠️  voice-pipeline not ready yet"

echo "✅ Healthcare Conversation Platform is starting!"
echo "📊 View logs: docker-compose logs -f"
echo "🔍 Check status: docker-compose ps"
```

**deploy/scripts/stop.sh**

```bash
#!/bin/bash

echo "🛑 Stopping Healthcare Conversation Platform..."

docker-compose down

echo "✅ All services stopped"
```

**deploy/scripts/backup.sh**

```bash
#!/bin/bash

set -e

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "💾 Creating backup..."

# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive --gzip > "$BACKUP_DIR/mongodb_backup.gz"

# Backup environment configuration
cp .env "$BACKUP_DIR/.env.backup"

# Backup logs
cp -r logs "$BACKUP_DIR/logs" 2>/dev/null || true

echo "✅ Backup created: $BACKUP_DIR"
```

---

## One-Click Installation Script

**install.sh** (Enterprise Distribution)

```bash
#!/bin/bash

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║  Healthcare Conversation Platform Installer    ║"
echo "║  Enterprise Edition                            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "📥 Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    echo "📥 Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Prerequisites met"

# License validation
echo ""
echo "🔐 License Validation"
read -p "Enter your license key: " LICENSE_KEY

# TODO: Validate license key with licensing server
# curl -X POST https://license.yourcompany.com/validate \
#   -H "Content-Type: application/json" \
#   -d "{\"license_key\":\"$LICENSE_KEY\"}"

# Configuration
echo ""
echo "⚙️  Configuration"

read -p "Company Name: " COMPANY_NAME
read -p "Domain (e.g., healthcare.company.com): " DOMAIN
read -sp "MongoDB Root Password: " MONGO_PASSWORD
echo ""
read -sp "JWT Secret (32 chars): " JWT_SECRET
echo ""
read -p "OpenAI API Key: " OPENAI_KEY
read -p "LiveKit URL: " LIVEKIT_URL
read -p "LiveKit API Key: " LIVEKIT_KEY
read -sp "LiveKit API Secret: " LIVEKIT_SECRET
echo ""

# Generate .env file
echo "📝 Creating configuration file..."

cat > .env << EOF
# Generated by installer on $(date)
COMPANY_NAME=$COMPANY_NAME
LICENSE_KEY=$LICENSE_KEY
DEPLOYMENT_ID=$(uuidgen)

MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=$MONGO_PASSWORD
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$(openssl rand -hex 16)

LIVEKIT_URL=$LIVEKIT_URL
LIVEKIT_API_KEY=$LIVEKIT_KEY
LIVEKIT_API_SECRET=$LIVEKIT_SECRET

OPENAI_API_KEY=$OPENAI_KEY
OPENAI_MODEL=gpt-4-turbo-preview

NODE_ENV=production
CORS_ORIGIN=https://$DOMAIN

STT_PROVIDER=google
TTS_PROVIDER=google
EOF

# Pull and start services
echo ""
echo "📦 Downloading and starting services..."
docker-compose pull
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to start (this may take 2-3 minutes)..."
sleep 60

# Health check
echo "🏥 Running health checks..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ conversation-core is healthy"
else
    echo "⚠️  conversation-core is not responding"
fi

if curl -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo "✅ voice-pipeline is healthy"
else
    echo "⚠️  voice-pipeline is not responding"
fi

# Success message
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  ✅ Installation Complete!                     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "🌐 Services running at:"
echo "   API: http://localhost:3001"
echo "   Voice: http://localhost:8000"
echo ""
echo "📚 Next steps:"
echo "   1. Integrate the widget into your application"
echo "   2. Configure SSL certificates for production"
echo "   3. Review documentation at ./docs/"
echo ""
echo "💡 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo ""
echo "📞 Support: support@yourcompany.com"
```

---

## Client Deployment Options

### Option 1: Docker Compose (Recommended for SMB)

**What client gets:**
- Single ZIP file with all code
- docker-compose.yml configured
- install.sh script
- Documentation

**Deployment steps:**
1. Extract ZIP
2. Run `./install.sh`
3. Enter license key
4. Configure environment
5. Services start automatically

**Pros:**
- Simple one-command deployment
- Self-contained
- Easy updates (docker-compose pull)

**Cons:**
- Requires Docker knowledge
- Single-server limitation

### Option 2: Kubernetes (Enterprise)

Provide Helm charts for:
- Auto-scaling
- High availability
- Load balancing
- Rolling updates

See [kubernetes/README.md](./deploy/kubernetes/README.md)

### Option 3: Cloud Marketplace

Publish on:
- AWS Marketplace
- Azure Marketplace
- Google Cloud Marketplace

**Benefits:**
- Built-in billing
- One-click deployment
- Trusted platform

### Option 4: SaaS (Multi-Tenant)

Host centrally, clients subscribe:
- Fastest onboarding
- No client infrastructure needed
- Recurring revenue model
- Easier support

---

## Licensing & Activation

### License Server Architecture

```typescript
// license-server/src/validate.ts
interface LicenseKey {
  key: string;
  companyName: string;
  tier: 'starter' | 'professional' | 'enterprise';
  maxConversations: number;
  expiresAt: Date;
  features: string[];
}

async function validateLicense(key: string): Promise<LicenseKey> {
  // 1. Decrypt license key
  // 2. Verify signature
  // 3. Check expiration
  // 4. Check usage limits
  // 5. Return license details
}
```

### License Key Generation

```bash
# Generate license for client
./scripts/generate-license.sh \
  --company "Acme Healthcare" \
  --tier professional \
  --expires "2025-12-31" \
  --max-conversations 10000
```

---

## Pricing Models

### 1. One-Time License + Annual Support

- **Starter**: $10,000 + $2,000/year support
- **Professional**: $50,000 + $10,000/year support
- **Enterprise**: $150,000 + $30,000/year support

### 2. Annual Subscription

- **Starter**: $3,600/year
- **Professional**: $18,000/year
- **Enterprise**: $60,000/year (custom)

### 3. Usage-Based

- $0.10 per conversation
- Volume discounts at 10k, 50k, 100k+

### 4. Revenue Share

- 20% of client's revenue from AI features
- Minimum $2,000/month

---

## White-Label Configuration

Clients can customize:

```javascript
// config/branding.js
module.exports = {
  companyName: 'Acme Healthcare',
  logo: './assets/logo.png',
  primaryColor: '#2563eb',
  secondaryColor: '#8b5cf6',
  theme: 'medical',
  supportEmail: 'support@acmehealthcare.com',
  supportPhone: '+1-800-ACME-MED',
};
```

---

## Summary: How to Sell

1. **Package as Docker Compose** (easiest to deploy)
2. **Create installer script** (one-click setup)
3. **Implement license validation**
4. **Provide white-label config**
5. **Include documentation**
6. **Offer deployment options** (self-hosted, cloud, SaaS)
7. **Set pricing tier** based on features
8. **Provide support SLA**

**Delivery Format:**
- ZIP file with all code
- Docker images (private registry)
- Documentation PDF
- License key
- Support portal access
