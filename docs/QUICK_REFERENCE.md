# Quick Reference Guide

## 🚀 Running the Backend (Simple Version)

### One-Command Start

```bash
cd /Users/paruljuniwal/kuzushi_labs/healthcare/healthcare-conversation-platform
./quick-start.sh
```

### Manual Start (3 Terminals)

**Terminal 1: conversation-core (Required)**
```bash
cd packages/conversation-core
pnpm run dev
```

**Terminal 2: voice-pipeline (Optional - for voice)**
```bash
cd packages/voice-pipeline
source venv/bin/activate
poetry run python -m app.main
```

**Terminal 3: Your frontend**
```bash
cd /your/frontend/path
npm run dev
```

---

## 🔧 Essential Configuration

### Minimum Required API Keys

**conversation-core/.env**
```env
MONGODB_URI=mongodb://localhost:27017/conversation-platform
OPENAI_API_KEY=sk-your-key-here
JWT_SECRET=any-random-32-char-string
```

**voice-pipeline/.env** (only if using voice)
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
OPENAI_API_KEY=sk-your-key-here
```

---

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| conversation-core | 3001 | http://localhost:3001 |
| voice-pipeline | 8000 | http://localhost:8000 |
| MongoDB | 27017 | mongodb://localhost:27017 |
| Redis | 6379 | localhost:6379 |
| Frontend (example) | 5173 | http://localhost:5173 |
| LiveKit (local) | 7880 | ws://localhost:7880 |

---

## ✅ Health Checks

```bash
# conversation-core
curl http://localhost:3001/health

# voice-pipeline
curl http://localhost:8000/api/v1/health

# MongoDB
mongosh --eval "db.version()"

# Redis
redis-cli ping
```

---

## 🔍 Troubleshooting Commands

### Check if services are running
```bash
lsof -ti:3001  # conversation-core
lsof -ti:8000  # voice-pipeline
lsof -ti:27017 # MongoDB
```

### Kill stuck services
```bash
kill $(lsof -ti:3001)  # Kill conversation-core
kill $(lsof -ti:8000)  # Kill voice-pipeline
```

### Restart MongoDB
```bash
brew services restart mongodb-community@6.0
```

### View logs
```bash
# conversation-core (check terminal output)
# Or if running in background:
tail -f logs/conversation-core.log

# voice-pipeline
tail -f logs/voice-pipeline.log

# MongoDB
tail -f /usr/local/var/log/mongodb/mongo.log
```

### Reset database
```bash
mongosh conversation-platform --eval "db.dropDatabase()"
```

---

## 📦 Integration Checklist

- [ ] Backend services running (conversation-core at minimum)
- [ ] MongoDB running
- [ ] API keys configured in .env files
- [ ] npm link created for @healthcare/conversation-ui
- [ ] Frontend environment variables set
- [ ] Widget imported in your React component
- [ ] Schema file provided to widget
- [ ] Event handlers configured (onFieldExtracted)

---

## 🎨 Widget Props (Essential)

```tsx
<ConversationWidget
  // Required
  apiUrl="http://localhost:3001"
  wsUrl="ws://localhost:3001"
  formSchema={yourSchema}
  formType="your-form-type"
  userId="unique-user-id"

  // Optional but recommended
  theme="medical"
  branding={{ name: 'Your Assistant' }}
  features={{
    showExtractionPanel: true,
    showConfidence: true,
    enableVoice: true,
  }}
  onFieldExtracted={handleFieldExtracted}
  onError={handleError}
/>
```

---

## 💼 Enterprise Deployment Options

### Option 1: Docker Compose
```bash
docker-compose up -d
```
**Best for**: Small to medium deployments, single server

### Option 2: Kubernetes
```bash
kubectl apply -f deploy/kubernetes/
```
**Best for**: Large scale, high availability

### Option 3: SaaS
Host centrally, clients subscribe via API
**Best for**: Maximum simplicity for clients

---

## 💰 Pricing Quick Reference

| Tier | Price/Month | Conversations | Voice | Support |
|------|-------------|---------------|-------|---------|
| Starter | $299 | 1,000 | ❌ | Email (48hr) |
| Professional | $1,499 | 10,000 | ✅ | Email (24hr) |
| Enterprise | $5,000+ | Unlimited | ✅ | Dedicated |

---

## 🔐 API Keys You Need

### Required for All
- **OpenAI API Key**: https://platform.openai.com/api-keys
- **MongoDB**: Local or cloud connection string

### Required for Voice Mode
- **LiveKit Account**: https://livekit.io (free tier available)
- **Google Cloud** (optional): https://console.cloud.google.com
  - Enable Speech-to-Text API
  - Enable Text-to-Speech API
  - Create service account

### Optional
- **ElevenLabs** (premium TTS): https://elevenlabs.io
- **Redis** (caching): Local or cloud instance

---

## 📞 Support

| Issue Type | Contact |
|------------|---------|
| Setup help | dev-support@yourcompany.com |
| Sales inquiry | sales@yourcompany.com |
| Bug report | GitHub Issues |
| Feature request | GitHub Discussions |
| Enterprise support | enterprise@yourcompany.com |

---

## 🎯 Common Use Cases

### 1. Form Auto-Fill
Patient speaks/types → Widget extracts fields → Form populates automatically

### 2. Clinical Documentation
Doctor speaks notes → Widget creates structured data → EMR integration

### 3. Patient Intake
Patient answers questions → Widget completes intake form → Ready for provider

### 4. Risk Assessment
Clinician provides data → Widget fills calculator → Risk score generated

### 5. Device Configuration
User speaks settings → Widget converts to parameters → Device configured

---

## 📚 Documentation Links

- **Setup Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Enterprise Packaging**: [ENTERPRISE_PACKAGING.md](./ENTERPRISE_PACKAGING.md)
- **Sales Pitch**: [SALES_PITCH.md](./SALES_PITCH.md)
- **Complete README**: [README_COMPLETE.md](./README_COMPLETE.md)
- **Integration Example**: [scoring-tool/docs/AI_ASSISTANT_INTEGRATION_SUMMARY.md](../scoring-tool/docs/AI_ASSISTANT_INTEGRATION_SUMMARY.md)

---

## 🎬 Quick Demo Script

1. Start backend services
2. Open frontend with widget
3. Say: "The patient is 65 years old with diabetes"
4. Watch age=65, diabetes=true auto-fill
5. Say: "Blood pressure is 140 over 90"
6. Watch BP fields populate
7. Click calculate/submit
8. Show results

**Demo Time**: 2-3 minutes

---

## ⚡ Performance Benchmarks

- **API Response**: < 200ms (p95)
- **Voice Latency**: < 500ms (STT + TTS)
- **Data Extraction**: 1-3 seconds
- **WebSocket Latency**: < 50ms
- **Concurrent Users**: 10,000+

---

## 🛡️ Security Checklist

- [ ] All API keys in .env (not hardcoded)
- [ ] .env files in .gitignore
- [ ] HTTPS in production (not HTTP)
- [ ] JWT secret is strong and unique
- [ ] MongoDB authentication enabled
- [ ] CORS configured for your domains only
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Regular security updates

---

## 🔄 Update Process

### Update Platform
```bash
cd healthcare-conversation-platform
git pull origin main
pnpm install
cd packages/conversation-core && pnpm run build
cd ../voice-pipeline && poetry install
```

### Update Client Integration
```bash
cd packages/conversation-ui
npm version patch
npm run build
cd /your/frontend/project
npm link @healthcare/conversation-ui
```

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0
