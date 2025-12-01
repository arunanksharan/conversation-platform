# Kuzushi Widget Integration Guide

This guide walks you through integrating the Kuzushi AI assistant widget into your website from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Widget Build](#widget-build)
4. [Simple HTML Integration](#simple-html-integration)
5. [Testing Your Integration](#testing-your-integration)
6. [Customization](#customization)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and **pnpm** installed
- **PostgreSQL** database running
- **OpenAI API key** (for LLM integration)
- Basic understanding of HTML/JavaScript

---

## Backend Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository (if you haven't already)
git clone <your-repo-url>
cd healthcare-conversation-platform

# Install all dependencies
pnpm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in `packages/backend/`:

```bash
cd packages/backend
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kuzushi_db"

# Server
PORT=3001
BASE_URL="http://localhost:3001"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key-change-this"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key-here"

# CORS (adjust for your domain in production)
CORS_ORIGINS="http://localhost:8080,http://localhost:3000"
```

### Step 3: Setup Database

```bash
# Run database migrations
pnpm run db:migrate

# Seed initial data (creates demo project)
pnpm run db:seed
```

The seed script creates a demo project with ID: `demo-support-widget`

### Step 4: Start Backend Server

```bash
pnpm run start:dev
```

You should see:
```
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO Listening on http://localhost:3001
```

Verify it's running:
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

---

## Widget Build

### Step 5: Build Widget Packages

From the repository root:

```bash
# Build all packages
pnpm build
```

This creates:
- `packages/widget/dist/` - React widget bundle
- `packages/widget-loader/dist/widget-loader.js` - Loader script

---

## Simple HTML Integration

### Step 6: Create Your HTML Page

Create a new directory for your integration:

```bash
mkdir my-widget-integration
cd my-widget-integration
```

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My AI Assistant</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 2rem;
            background: #f3f4f6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        h1 {
            color: #1f2937;
            margin-bottom: 2rem;
        }

        .widget-wrapper {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            height: 600px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to My Website</h1>
        <p>Try out our AI assistant below:</p>

        <div class="widget-wrapper">
            <!-- The Kuzushi Widget -->
            <kuzushi-widget
                project-id="demo-support-widget"
                api-base-url="http://localhost:3001/api"
            ></kuzushi-widget>
        </div>
    </div>

    <!-- Load the widget loader script -->
    <script src="http://localhost:3001/static/widget-loader.js"></script>
</body>
</html>
```

**Key Points:**
- The `<kuzushi-widget>` custom element embeds the widget
- `project-id` must match a project in your database (use `demo-support-widget` for testing)
- `api-base-url` points to your backend API
- The loader script is served from your backend at `/static/widget-loader.js`

### Step 7: Serve Your HTML Page

You can use any static file server. For example, with Python:

```bash
# Python 3
python -m http.server 8080

# Or use the example host-site
cd ../examples/host-site
pnpm install
pnpm dev
```

---

## Testing Your Integration

### Step 8: Open in Browser

1. Navigate to `http://localhost:8080`
2. You should see the widget load with a welcome message
3. Try typing a message like "Hello" or "What can you help me with?"

### Step 9: Verify the Flow

**What happens when the widget loads:**

1. **Custom Element Registration**: The loader script defines the `<kuzushi-widget>` element
2. **Session Initialization**:
   - Widget calls `POST /api/v1/widget/session/init`
   - Backend returns configuration, WebSocket URLs, and JWT token
3. **WebSocket Connection**:
   - Widget connects to `ws://localhost:3001/ws/chat`
   - Sends init message with session ID and token
4. **Ready to Chat**:
   - User sends message → WebSocket → Backend → OpenAI
   - Response streams back through WebSocket → Widget UI

**Check browser console** for logs like:
```
[WidgetLoader] Initializing widget for project: demo-support-widget
[WidgetLoader] Session initialized: <session-id>
[ChatWS] Connected
[ChatWS] Session acknowledged: <session-id>
```

**Check backend logs** for:
```
[WidgetSessionService] Initializing session for project: demo-support-widget
[ChatGateway] Chat client authenticated for session: <session-id>
```

---

## Customization

### Step 10: Customize Widget Appearance

The widget appearance is controlled by the backend configuration. Update your app config in the database:

```sql
-- Connect to your database
psql postgresql://user:password@localhost:5432/kuzushi_db

-- View current config
SELECT * FROM "AppConfig" WHERE "appId" = (
  SELECT id FROM "App" WHERE "projectId" = 'demo-support-widget'
);

-- Update UI theme
UPDATE "AppConfig"
SET "uiTheme" = '{
  "primaryColor": "#0066cc",
  "secondaryColor": "#6366f1",
  "fontFamily": "Inter, sans-serif",
  "borderRadius": "12px"
}'::jsonb
WHERE "appId" = (
  SELECT id FROM "App" WHERE "projectId" = 'demo-support-widget'
);
```

### Step 11: Customize AI Personality

Update the prompt profile to change how the AI responds:

```sql
-- Update the pre-message prompt (welcome message)
UPDATE "PromptProfile"
SET content = 'Welcome! I am your AI assistant. How can I help you today?'
WHERE "appId" = (
  SELECT id FROM "App" WHERE "projectId" = 'demo-support-widget'
)
AND kind = 'PRE_MESSAGE'
AND "isDefault" = true;

-- Update the system prompt (AI behavior)
UPDATE "PromptProfile"
SET content = 'You are a helpful, friendly AI assistant for ACME Corp.
Be concise and professional. If you don''t know something, say so.'
WHERE "appId" = (
  SELECT id FROM "App" WHERE "projectId" = 'demo-support-widget'
)
AND kind = 'SYSTEM'
AND "isDefault" = true;
```

Refresh your page - changes take effect immediately!

---

## Production Deployment

### Step 12: Prepare for Production

**Backend:**

1. **Environment Variables**:
   ```env
   BASE_URL="https://api.yourdomain.com"
   CORS_ORIGINS="https://yourdomain.com"
   DATABASE_URL="postgresql://user:pass@prod-db:5432/kuzushi"
   JWT_SECRET="<generate-secure-random-string>"
   ```

2. **Build and Deploy**:
   ```bash
   cd packages/backend
   pnpm build
   pnpm run start:prod
   ```

**Widget:**

1. **Build for Production**:
   ```bash
   pnpm build
   ```

2. **Host Static Files**:
   - Upload `packages/widget-loader/dist/widget-loader.js` to CDN
   - Upload `packages/widget/dist/` to CDN
   - Or serve through your backend's `/static` endpoint

3. **Update HTML**:
   ```html
   <script src="https://cdn.yourdomain.com/widget-loader.js"></script>
   <kuzushi-widget
       project-id="your-production-project-id"
       api-base-url="https://api.yourdomain.com/api"
   ></kuzushi-widget>
   ```

### Step 13: Security Checklist

- [ ] Use HTTPS for all production URLs
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS for your domain only
- [ ] Enable rate limiting on API endpoints
- [ ] Review database access controls
- [ ] Set up monitoring and logging
- [ ] Test WebSocket connection over WSS (secure WebSocket)

---

## Multi-Tenant Setup

### Step 14: Create Additional Projects

You can create multiple widgets with different configurations:

```sql
-- Create a new app
INSERT INTO "App" ("projectId", name, "organizationId", "isActive", "createdAt", "updatedAt")
VALUES ('sales-assistant', 'Sales Assistant', 'default-org', true, NOW(), NOW())
RETURNING id;

-- Create config for new app (use the id returned above)
INSERT INTO "AppConfig" (
  "appId", version, "isActive", features, "uiTheme",
  "voiceConfig", "llmConfig", "createdAt", "updatedAt"
)
VALUES (
  '<app-id-from-above>', 1, true,
  '{"chat": true, "voice": false}'::jsonb,
  '{"primaryColor": "#10b981", "secondaryColor": "#06b6d4"}'::jsonb,
  '{}'::jsonb,
  '{"provider": "openai", "model": "gpt-4o", "temperature": 0.7}'::jsonb,
  NOW(), NOW()
);
```

Now you can use `project-id="sales-assistant"` in your HTML!

---

## Troubleshooting

### Widget not loading?
- Check browser console for errors
- Verify backend is running: `curl http://localhost:3001/health`
- Confirm project-id exists in database

### WebSocket connection failed?
- Check CORS configuration in backend `.env`
- Verify BASE_URL in `.env` matches your backend URL
- Check browser console for WebSocket errors

### No AI responses?
- Verify OPENAI_API_KEY is set correctly
- Check backend logs for OpenAI API errors
- Ensure you have credits in your OpenAI account

### Database connection issues?
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Run migrations: `pnpm run db:migrate`

---

## Next Steps

- Explore the full example in `examples/host-site/`
- Read the [Architecture Documentation](./ARCHITECTURE.md)
- Learn about [Voice Features](./packages/backend/README.md#voice-integration)
- Review [API Documentation](./packages/backend/README.md#api-endpoints)

---

## Support

For issues and questions:
- Check the [README](./README.md)
- Review existing issues
- Create a new issue with detailed information

---

**Congratulations!** You've successfully integrated the Kuzushi AI assistant widget into your website. 🎉
