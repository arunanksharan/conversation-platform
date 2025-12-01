# Healthcare Conversation Platform - Deployment Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Production Deployment](#production-deployment)
3. [Enterprise Packaging](#enterprise-packaging)
4. [Integration Guide](#integration-guide)

---

## Local Development Setup

### Prerequisites

Install the following on your development machine:

- **Node.js** >= 18 (LTS recommended)
  ```bash
  # macOS
  brew install node@18

  # Verify
  node --version  # Should be >= 18.x.x
  ```

- **pnpm** >= 8
  ```bash
  npm install -g pnpm
  pnpm --version  # Should be >= 8.x.x
  ```

- **Python** >= 3.11
  ```bash
  # macOS
  brew install python@3.11

  # Verify
  python3 --version  # Should be >= 3.11.x
  ```

- **Poetry** (Python package manager)
  ```bash
  curl -sSL https://install.python-poetry.org | python3 -
  poetry --version
  ```

- **MongoDB** >= 6.0
  ```bash
  # macOS
  brew tap mongodb/brew
  brew install mongodb-community@6.0

  # Start MongoDB
  brew services start mongodb-community@6.0

  # Verify
  mongosh --eval "db.version()"  # Should be >= 6.0.x
  ```

- **Redis** (optional, for production caching)
  ```bash
  brew install redis
  brew services start redis
  ```

### Step-by-Step Backend Setup

#### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
cd /Users/paruljuniwal/kuzushi_labs/healthcare/healthcare-conversation-platform

# Install all dependencies
pnpm install

# This will install dependencies for:
# - packages/conversation-core (NestJS backend)
# - packages/conversation-ui (React components)
# - packages/voice-pipeline (Python service) - manual step needed
```

#### Step 2: Set Up Voice Pipeline (Python Service)

```bash
# Navigate to voice pipeline
cd packages/voice-pipeline

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Install dependencies
poetry install

# Verify installation
poetry run python -c "import livekit; print('LiveKit installed successfully')"
```

#### Step 3: Configure Environment Variables

**For conversation-core (NestJS):**

```bash
cd packages/conversation-core
```

Create `.env` file:

```env
# ======================
# Database Configuration
# ======================
MONGODB_URI=mongodb://localhost:27017/conversation-platform
MONGODB_DB_NAME=conversation-platform

# ======================
# Authentication
# ======================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# ======================
# LiveKit Configuration
# ======================
# Option 1: Use LiveKit Cloud (Recommended for production)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Option 2: Use Local LiveKit Server (Development)
# LIVEKIT_URL=ws://localhost:7880
# LIVEKIT_API_KEY=devkey
# LIVEKIT_API_SECRET=secret

# ======================
# Python Voice Service
# ======================
PYTHON_VOICE_SERVICE_URL=http://localhost:8000

# ======================
# OpenAI Configuration
# ======================
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# ======================
# Server Configuration
# ======================
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# ======================
# Redis (Optional - for session caching)
# ======================
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_redis_password

# ======================
# Logging
# ======================
LOG_LEVEL=debug

# ======================
# Rate Limiting
# ======================
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# ======================
# HIPAA Compliance
# ======================
ENABLE_AUDIT_LOGGING=true
ENABLE_PHI_DETECTION=true
ENCRYPTION_KEY=your-32-character-encryption-key-here-change-in-prod
```

**For voice-pipeline (Python):**

```bash
cd packages/voice-pipeline
```

Create `.env` file:

```env
# ======================
# LiveKit Configuration
# ======================
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# ======================
# OpenAI Configuration
# ======================
OPENAI_API_KEY=sk-your-openai-api-key-here

# ======================
# Google Cloud (for STT/TTS)
# ======================
# Option 1: Service Account JSON
GOOGLE_CLOUD_CREDENTIALS_PATH=/path/to/your-service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id

# Option 2: Use Whisper (local STT, no API key needed)
USE_WHISPER_STT=false

# ======================
# ElevenLabs (Optional - Premium TTS)
# ======================
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Default voice

# ======================
# NestJS Backend
# ======================
NESTJS_SERVICE_URL=http://localhost:3001

# ======================
# Server Configuration
# ======================
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO

# ======================
# Voice Processing
# ======================
STT_PROVIDER=google  # Options: google, whisper
TTS_PROVIDER=google  # Options: google, elevenlabs
```

#### Step 4: Set Up External Services

**A. LiveKit Setup (Required for Voice Mode)**

**Option 1: LiveKit Cloud (Recommended)**

1. Go to https://cloud.livekit.io
2. Create free account
3. Create new project
4. Copy credentials:
   - URL (e.g., `wss://your-project.livekit.cloud`)
   - API Key
   - API Secret
5. Add to both `.env` files above

**Option 2: Local LiveKit Server (Development)**

```bash
# Using Docker
docker run -d \
  --name livekit \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -v $PWD/livekit.yaml:/etc/livekit.yaml \
  livekit/livekit-server \
  --config /etc/livekit.yaml

# Create livekit.yaml
cat > livekit.yaml << EOF
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: false
keys:
  devkey: secret
EOF
```

**B. Google Cloud Setup (Optional - for enhanced voice)**

1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable APIs:
   - Cloud Speech-to-Text API
   - Cloud Text-to-Speech API
4. Create service account:
   - IAM & Admin → Service Accounts → Create
   - Grant roles: "Cloud Speech Client", "Cloud Text-to-Speech Client"
   - Create key (JSON format)
   - Download and save securely
5. Update `GOOGLE_CLOUD_CREDENTIALS_PATH` in voice-pipeline `.env`

**C. OpenAI Setup (Required)**

1. Go to https://platform.openai.com
2. Create account or sign in
3. Navigate to API Keys section
4. Create new API key
5. Add to both `.env` files
6. Add credits to your account

#### Step 5: Start the Services

**Terminal 1: MongoDB**
```bash
# If not already running
brew services start mongodb-community@6.0

# Verify
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

**Terminal 2: Redis (Optional)**
```bash
brew services start redis

# Verify
redis-cli ping  # Should return "PONG"
```

**Terminal 3: Conversation Core (NestJS Backend)**
```bash
cd /Users/paruljuniwal/kuzushi_labs/healthcare/healthcare-conversation-platform/packages/conversation-core

# Install dependencies (if not done)
pnpm install

# Start development server
pnpm run dev

# You should see:
# [Nest] INFO [NestFactory] Starting Nest application...
# [Nest] INFO [InstanceLoader] AppModule dependencies initialized
# [Nest] INFO Application is running on: http://localhost:3001
```

**Terminal 4: Voice Pipeline (Python Service)**
```bash
cd /Users/paruljuniwal/kuzushi_labs/healthcare/healthcare-conversation-platform/packages/voice-pipeline

# Activate virtual environment
source venv/bin/activate

# Start service
poetry run python -m app.main

# You should see:
# INFO:     Started server process
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 5: Scoring Tool Frontend (Client Application)**
```bash
cd /Users/paruljuniwal/kuzushi_labs/healthcare/scoring-tool/frontend

# Start frontend
npm run dev

# You should see:
# VITE v5.x.x ready in Xms
# ➜  Local:   http://localhost:5173/
```

#### Step 6: Verify Services

```bash
# Check conversation-core
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}

# Check voice-pipeline
curl http://localhost:8000/api/v1/health
# Expected: {"status":"healthy"}

# Check MongoDB
mongosh --eval "db.stats()"
# Expected: Database statistics

# Check Redis (if using)
redis-cli ping
# Expected: PONG

# Check frontend
curl http://localhost:5173
# Expected: HTML content
```

#### Step 7: Test the Integration

1. Open browser: http://localhost:5173
2. Log in or create account
3. Navigate to Patients
4. Select patient or create new one
5. Click "Calculate EuroSCORE II" or "Calculate STS Score"
6. **Verify AI Assistant Widget** appears on left side
7. **Test Text Mode**: Type a message like "The patient is 65 years old"
8. **Test Voice Mode**: Click microphone icon and speak
9. **Verify Form Auto-Fill**: Watch fields populate automatically
10. **Check Console**: Look for successful WebSocket connection

### Troubleshooting Common Issues

#### MongoDB Connection Failed
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Restart if needed
brew services restart mongodb-community@6.0

# Check connection
mongosh mongodb://localhost:27017
```

#### conversation-core won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install

# Check port availability
lsof -ti:3001
# If occupied, kill the process or change PORT in .env
```

#### voice-pipeline errors
```bash
# Reinstall dependencies
poetry install --no-cache

# Check Python version
python3 --version  # Must be >= 3.11

# Verify LiveKit credentials
# Make sure LIVEKIT_URL, API_KEY, API_SECRET are correct
```

#### Widget not connecting
```bash
# Check browser console for errors
# Verify environment variables in frontend/.env
# Confirm CORS_ORIGIN in conversation-core includes frontend URL
# Check WebSocket connection in Network tab
```

#### Voice mode not working
```bash
# Verify LiveKit server is accessible
curl https://your-project.livekit.cloud

# Check microphone permissions in browser
# Review voice-pipeline logs for errors
# Ensure Google Cloud credentials are valid
```

---

## Production Deployment

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for:
- Docker containerization
- Kubernetes deployment
- Cloud platform guides (AWS, GCP, Azure)
- Load balancing and scaling
- Monitoring and observability
- Security hardening

---

## Enterprise Packaging

See [ENTERPRISE_PACKAGING.md](./ENTERPRISE_PACKAGING.md) for:
- White-label configuration
- Multi-tenant setup
- Licensing and activation
- Custom deployment scripts
- Client onboarding guide

---

## Quick Reference

### Service Ports
- Frontend (Scoring Tool): 5173
- conversation-core: 3001
- voice-pipeline: 8000
- MongoDB: 27017
- Redis: 6379
- LiveKit: 7880 (local)

### Useful Commands

```bash
# Stop all services
brew services stop mongodb-community@6.0
brew services stop redis

# View logs
# conversation-core: Check terminal output
# voice-pipeline: Check terminal output
# MongoDB: tail -f /usr/local/var/log/mongodb/mongo.log

# Reset database
mongosh conversation-platform --eval "db.dropDatabase()"

# Check service health
curl http://localhost:3001/health
curl http://localhost:8000/api/v1/health
```

### Environment Variables Quick Reference

| Service | Variable | Description | Required |
|---------|----------|-------------|----------|
| conversation-core | MONGODB_URI | MongoDB connection string | Yes |
| conversation-core | OPENAI_API_KEY | OpenAI API key | Yes |
| conversation-core | JWT_SECRET | JWT signing secret | Yes |
| conversation-core | LIVEKIT_URL | LiveKit server URL | Voice mode |
| voice-pipeline | LIVEKIT_URL | LiveKit server URL | Voice mode |
| voice-pipeline | OPENAI_API_KEY | OpenAI API key | Yes |
| voice-pipeline | GOOGLE_CLOUD_CREDENTIALS_PATH | GCP service account JSON | Optional |

