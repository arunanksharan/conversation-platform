# Healthcare Conversation Platform - End-to-End Guide

**Complete Technical Explanation**
**Date**: 2025-11-23
**Version**: 1.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Package Structure](#architecture--package-structure)
3. [Complete User Journey](#complete-user-journey)
4. [Deep Dive: Component Breakdown](#deep-dive-component-breakdown)
5. [Authentication & Security](#authentication--security)
6. [Multi-Tenancy Model](#multi-tenancy-model)
7. [Real-Time Communication](#real-time-communication)
8. [Voice Assistant Flow](#voice-assistant-flow)
9. [Routing & Navigation](#routing--navigation)
10. [Styling & Shadow DOM](#styling--shadow-dom)
11. [Deployment Architecture](#deployment-architecture)
12. [Development Workflow](#development-workflow)

---

## System Overview

### What Is This Project?

This is a **healthcare conversation platform** that provides an **embeddable AI assistant widget** for healthcare applications. Think of it like Intercom or Drift, but specifically designed for healthcare with both text chat and voice capabilities.

### Key Features

- **Embeddable Widget**: Drops into any website with a simple script tag
- **Text Chat**: Real-time messaging with AI assistant
- **Voice Assistant**: Live voice conversations using WebRTC
- **Multi-Tenant**: Supports multiple healthcare organizations/apps
- **Secure**: JWT authentication, HIPAA-compliant design
- **Isolated**: Uses Shadow DOM to prevent CSS/JS conflicts
- **Configurable**: Backend-driven prompts and UI customization

### Technology Stack

**Frontend (Widget)**:
- React 19.2 (with concurrent features)
- TypeScript 5.x
- Tailwind CSS v4
- React Aria Components (accessibility)
- TanStack Router (memory mode)
- Zustand (state management)
- r2wc (React → Web Component)

**Backend**:
- Node.js + Express
- PostgreSQL (Drizzle ORM)
- WebSocket (ws library)
- JWT (jose library)
- WebRTC signaling

**Build & Tooling**:
- Vite (bundler)
- pnpm (package manager)
- Turborepo (monorepo)
- ESLint + Prettier

---

## Architecture & Package Structure

### Monorepo Layout

```
healthcare-conversation-platform/
├── packages/
│   ├── widget/              # React UI + business logic (merged)
│   ├── widget-loader/       # Minimal loader + snippet
│   └── backend/             # Node.js API + WebSocket server
├── turbo.json              # Turborepo configuration
├── package.json            # Root workspace config
└── pnpm-workspace.yaml     # pnpm workspace setup
```

### Why 2 Packages? (Industry Standard)

Following **Intercom, Segment, Drift** patterns:

1. **@kuzushi/widget-loader** (~1.5-50 KB)
   - Minimal snippet that goes on host pages
   - Command buffering
   - Async loads main widget
   - **Goal**: Fast initial page load

2. **@kuzushi/widget** (~344 KB gzipped)
   - Full React application
   - All UI components
   - Chat + Voice + Settings + History
   - Loaded asynchronously

3. **@kuzushi/backend**
   - REST API
   - WebSocket server
   - Database layer
   - Authentication

### Deprecated Packages

- `widget-ui.old/` - Old UI-only package (merged into widget)
- `widget-core/` - Old business logic (merged into widget)

These were combined because **industry standard is 2 packages**, not 3. Keeping UI and logic separate adds unnecessary complexity.

---

## Complete User Journey

Let's trace a complete interaction from start to finish:

### Step 1: Hospital Adds Widget to Their Website

**Hospital's HTML**:
```html
<!-- Configure the widget -->
<script>
  window.KuzushiConfig = {
    projectId: 'st-marys-hospital',
    apiBaseUrl: 'https://api.kuzushi.ai'
  };
</script>

<!-- Load minimal snippet (1.5 KB) -->
<script src="https://cdn.kuzushi.ai/widget/v1/snippet.js" async></script>

<!-- Optional: Use API immediately -->
<script>
  Kuzushi('init');
  Kuzushi('show');  // Commands queue until widget loads
</script>
```

### Step 2: Snippet Loads (~1ms)

**File**: `packages/widget-loader/src/snippet.ts`

```typescript
// 1. Create global API stub
window.Kuzushi = function(...args) {
  if (!Kuzushi._loaded) {
    Kuzushi.q.push({ method: args[0], args: args.slice(1) });
  }
};

// 2. Start loading main loader asynchronously
const script = document.createElement('script');
script.src = 'https://cdn.kuzushi.ai/widget/v1/loader.js';
script.async = true;
document.head.appendChild(script);
```

**What happens**:
- ✅ Global `window.Kuzushi()` API created
- ✅ Command queue initialized
- ✅ Main loader starts downloading (non-blocking)
- ⏱️ Total time: ~1-2ms

### Step 3: Main Loader Executes (~100-200ms)

**File**: `packages/widget-loader/src/loader-minimal.ts`

```typescript
async function loadWidget() {
  // 1. Get config from snippet
  const config = window.Kuzushi.config;

  // 2. Initialize session with backend
  const sessionConfig = await initSession(
    config.projectId,
    config.apiBaseUrl,
    generateInstanceId()
  );

  // 3. Load React widget (344 KB)
  const { WidgetApp } = await import('@kuzushi/widget');

  // 4. Convert to Web Component
  const KuzushiWidget = r2wc(WidgetApp, { shadow: 'open' });
  customElements.define('kuzushi-widget', KuzushiWidget);

  // 5. Mount to DOM
  const widgetElement = document.createElement('kuzushi-widget');
  widgetElement.setAttribute('session-id', sessionConfig.sessionId);
  document.body.appendChild(widgetElement);

  // 6. Process queued commands
  processQueue(window.Kuzushi, widgetAPI);
}
```

**Backend Session Init** (`POST /v1/widget/session/init`):

**File**: `packages/backend/src/routes/widget.ts`

```typescript
{
  projectId: 'st-marys-hospital',
  widgetInstanceId: 'widget_1234567890_abc123',
  pageUrl: 'https://stmarys.com/patient-portal',
  hostOrigin: 'https://stmarys.com',
  userAgent: 'Mozilla/5.0...',
  locale: 'en-US'
}
```

**Backend Response**:
```typescript
{
  sessionId: 'sess_abc123xyz',
  configVersion: 1,
  features: {
    textChat: true,
    voice: true
  },
  theme: {
    primaryColor: '#0066cc',
    fontScale: 1.0
  },
  chat: {
    wsUrl: 'wss://api.kuzushi.ai/ws/chat?sessionId=sess_abc123xyz'
  },
  voice: {
    enabled: true,
    signalingUrl: 'wss://api.kuzushi.ai/ws/voice'
  },
  uiHints: {
    welcomeMessage: 'Hello! How can we help you today?',
    widgetTitle: 'St. Mary\'s Assistant',
    inputPlaceholder: 'Ask a question...'
  }
}
```

**What the backend does**:
1. Validates `projectId` (looks up in database)
2. Creates new session in `sessions` table
3. Fetches app configuration (prompts, theme, features)
4. Generates session ID and JWT token
5. Returns full configuration

**Database Tables Used**:
```sql
-- Tenant (hospital organization)
tenants: { id, name, domain }

-- App (e.g., "Patient Portal", "Doctor Dashboard")
apps: { id, tenant_id, project_id, name }

-- App Configuration
app_configs: { id, app_id, version, config_data }

-- Session
sessions: {
  id,
  app_id,
  session_id,
  widget_instance_id,
  user_id (nullable),
  created_at,
  last_active_at
}
```

### Step 4: React Widget Mounts

**File**: `packages/widget/src/App.tsx`

```typescript
export function WidgetApp({ sessionId, config: configString }) {
  const [widgetConfig, setWidgetConfig] = useState(null);
  const [router, setRouter] = useState(null);

  useEffect(() => {
    // Parse config from r2wc (passed as JSON string)
    const parsed = JSON.parse(configString);
    setWidgetConfig(parsed);

    // Create TanStack Router with memory history
    const widgetRouter = createWidgetRouter(parsed);
    setRouter(widgetRouter);
  }, [configString, sessionId]);

  // Apply theme to Shadow DOM
  useEffect(() => {
    if (widgetConfig?.theme) {
      document.documentElement.style.setProperty(
        '--widget-primary',
        widgetConfig.theme.primaryColor
      );
    }
  }, [widgetConfig?.theme]);

  return (
    <KuzushiOverlayProvider>
      <div className="kuzushi-widget-root">
        {/* Navigation Bar */}
        <NavigationBar router={router} />

        {/* Router Outlet (Chat, Settings, History) */}
        <RouterProvider router={router} />

        {/* Voice Controls (if enabled) */}
        {widgetConfig.features?.voice && <VoiceControls />}
      </div>
    </KuzushiOverlayProvider>
  );
}
```

**What happens**:
- ✅ Widget renders inside Shadow DOM
- ✅ Theme CSS variables applied
- ✅ Router initialized (starts at `/` = Chat view)
- ✅ WebSocket connection established
- ⏱️ Total time from snippet load: ~300-500ms

### Step 5: User Sends First Message

**User types**: "What are your visiting hours?"

**Frontend** (`packages/widget/src/hooks/useChatWebSocket.ts`):

```typescript
const sendMessage = useCallback((content: string) => {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36)}`;

  // 1. Optimistic UI update (add to Zustand store)
  addMessage({
    id: messageId,
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  });

  // 2. Send via WebSocket
  ws.send(JSON.stringify({
    type: 'user_message',
    messageId,
    content,
    metadata: { timestamp: new Date().toISOString() }
  }));
}, [addMessage]);
```

**Backend WebSocket Handler** (`packages/backend/src/websocket/chatHandler.ts`):

```typescript
ws.on('message', async (data) => {
  const message = JSON.parse(data);

  if (message.type === 'user_message') {
    // 1. Validate session
    const session = await db.sessions.findOne({
      sessionId: message.sessionId
    });

    // 2. Get app configuration (includes system prompt)
    const config = await db.app_configs.findOne({
      appId: session.appId
    });

    // 3. Store user message in database
    await db.messages.insert({
      sessionId: session.id,
      messageId: message.messageId,
      role: 'user',
      content: message.content,
      timestamp: new Date()
    });

    // 4. Call AI provider (OpenAI/Anthropic/etc.)
    const aiResponse = await callAIProvider({
      systemPrompt: config.systemPrompt,
      conversationHistory: await getHistory(session.id),
      userMessage: message.content
    });

    // 5. Stream response back to widget
    for await (const token of aiResponse.stream) {
      ws.send(JSON.stringify({
        type: 'token',
        messageId: 'resp_123',
        delta: token
      }));
    }

    // 6. Send final message
    ws.send(JSON.stringify({
      type: 'message',
      messageId: 'resp_123',
      role: 'assistant',
      content: aiResponse.fullText
    }));
  }
});
```

**Frontend Receives Response**:

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'token':
      // Streaming: append token to current message
      if (!currentStreamingMessageId) {
        startStreaming(message.messageId);
      }
      appendStreamingToken(message.delta);
      break;

    case 'message':
      // Final message: add to store
      addMessage({
        id: message.messageId,
        role: message.role,
        content: message.content,
        timestamp: new Date().toISOString()
      });
      break;
  }
};
```

**UI Updates** (`packages/widget/src/components/ChatLayout.tsx`):

```typescript
export function ChatLayout({ config }) {
  const { messages, isTyping, streamingContent } = useChatStore();

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Streaming indicator */}
      {isTyping && streamingContent && (
        <MessageBubble content={streamingContent} isStreaming />
      )}

      {/* Input */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

**Complete Flow**:
1. User types → Frontend validates → Zustand store updated (optimistic)
2. WebSocket send → Backend receives → Validates session
3. Backend queries AI → Streams response
4. Frontend receives tokens → Updates UI in real-time
5. Final message stored → Conversation history updated
⏱️ **Total time**: ~500ms - 2s (depending on AI response)

---

## Deep Dive: Component Breakdown

### 1. Widget Package (`@kuzushi/widget`)

#### File Structure

```
packages/widget/src/
├── App.tsx                    # Main app component
├── router.tsx                 # TanStack Router setup
├── mount.tsx                  # Mount/unmount functions
│
├── components/
│   ├── ChatLayout.tsx         # Chat UI (messages + input)
│   └── VoiceControls.tsx      # Voice assistant controls
│
├── views/
│   ├── SettingsView.tsx       # Settings screen
│   └── HistoryView.tsx        # Conversation history
│
├── hooks/
│   ├── useChatWebSocket.ts    # WebSocket connection
│   └── useVoiceAssistant.ts   # WebRTC voice logic
│
├── state/
│   └── chatStore.ts           # Zustand state management
│
├── ui/
│   ├── components/            # React Aria components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Dialog.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   └── Badge.tsx
│   ├── variants/              # CVA variant configs
│   │   ├── button.ts
│   │   └── input.ts
│   └── lib/
│       └── cn.ts              # Class name utility
│
└── types.ts                   # TypeScript interfaces
```

#### Key Components Explained

**App.tsx** - Main orchestrator
- Parses config from r2wc
- Creates router
- Applies theme
- Renders navigation + router outlet

**router.tsx** - Memory-based routing
```typescript
// Memory history = no URL changes (perfect for widgets)
const memoryHistory = createMemoryHistory({
  initialEntries: ['/']
});

const router = createRouter({
  routeTree,
  history: memoryHistory,
  context: { config },  // Pass to all routes
  defaultPreload: 'intent'
});

// Routes:
// / -> ChatLayout
// /settings -> SettingsView
// /history -> HistoryView
```

**ChatLayout.tsx** - Main chat interface
- Message list (auto-scroll to bottom)
- Typing indicator
- Streaming token display
- Input field
- Send button
- Connection status badge

**useChatWebSocket.ts** - WebSocket management
- Auto-connect on mount
- Reconnection logic (exponential backoff)
- Message sending
- Token streaming
- Error handling

**chatStore.ts** - Zustand state
```typescript
interface ChatStore {
  messages: ChatMessage[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  isTyping: boolean;
  streamingContent: string;
  currentStreamingMessageId: string | null;

  // Actions
  addMessage: (msg: ChatMessage) => void;
  setStatus: (status: ConnectionStatus) => void;
  startStreaming: (id: string) => void;
  appendStreamingToken: (token: string) => void;
  clearMessages: () => void;
}
```

**React Aria Components** - Why not Radix?

**Decision**: Use React Aria instead of shadcn/Radix

**Reason**: Shadow DOM compatibility
- Radix uses `<Portal>` components
- Portals render OUTSIDE Shadow DOM
- Breaks style isolation
- Requires manual container configuration

React Aria:
- ✅ No portals by default
- ✅ Shadow DOM native
- ✅ Better accessibility
- ✅ Smaller bundle (60 KB vs 80 KB)
- ✅ Used by Adobe in production

See: `REACT_ARIA_DECISION.md`

### 2. Widget Loader Package (`@kuzushi/widget-loader`)

#### File Structure

```
packages/widget-loader/src/
├── snippet.ts          # Minimal snippet (~1.5 KB target)
├── loader-minimal.ts   # Main loader with r2wc
├── loader-r2wc.ts      # Alternative r2wc approach
└── loader.ts           # Legacy custom element approach
```

#### snippet.ts - The Minimalist

**Goal**: Load as fast as possible, queue commands

```typescript
// IIFE to avoid global pollution
(function() {
  // Prevent double init
  if (window.Kuzushi?._loaded) return;

  // Create stub function
  const api = function(...args) {
    if (!api._loaded) {
      api.q = api.q || [];
      api.q.push({
        method: args[0],
        args: args.slice(1)
      });
    }
  };

  // Initialize
  api.q = [];
  api.l = Date.now();
  api._loaded = false;
  api.config = window.KuzushiConfig;

  window.Kuzushi = api;

  // Load main script
  const script = document.createElement('script');
  script.src = `${api.config.apiBaseUrl}/widget/loader.js`;
  script.async = true;
  document.head.appendChild(script);
})();
```

**Size**: ~116 lines → target < 2 KB minified+gzipped

#### loader-minimal.ts - The Workhorse

```typescript
async function loadWidget() {
  // 1. Session init (API call)
  const sessionConfig = await initSession(...);

  // 2. Dynamic import React widget
  const { WidgetApp } = await import('@kuzushi/widget');

  // 3. Convert to Web Component
  const KuzushiWidget = r2wc(WidgetApp, {
    shadow: 'open',
    props: {
      projectId: 'string',
      apiBaseUrl: 'string',
      sessionId: 'string',
      config: 'string'  // JSON
    }
  });

  // 4. Register custom element
  customElements.define('kuzushi-widget', KuzushiWidget);

  // 5. Create and mount
  const el = document.createElement('kuzushi-widget');
  el.setAttribute('session-id', sessionConfig.sessionId);
  el.setAttribute('config', JSON.stringify(sessionConfig));
  document.body.appendChild(el);

  // 6. Process command queue
  processQueue(window.Kuzushi, widgetAPI);
  window.Kuzushi._loaded = true;
}

loadWidget();
```

**r2wc Magic** - React to Web Component

```typescript
// Before r2wc:
<WidgetApp
  projectId="xyz"
  sessionId="abc"
  config={configObj}
/>

// After r2wc:
<kuzushi-widget
  project-id="xyz"
  session-id="abc"
  config='{"sessionId":"abc",...}'
/>
```

**Why r2wc?**
- ✅ Automatic Shadow DOM
- ✅ Props → Attributes conversion
- ✅ React lifecycle managed
- ✅ Event handling
- ✅ ~3 KB overhead

### 3. Backend Package (`@kuzushi/backend`)

#### File Structure

```
packages/backend/src/
├── server.ts              # Express app + HTTP server
├── db/
│   ├── schema.ts          # Drizzle ORM schemas
│   ├── migrations/        # SQL migrations
│   └── client.ts          # DB connection
│
├── routes/
│   ├── widget.ts          # Widget endpoints
│   ├── auth.ts            # Authentication
│   └── admin.ts           # Admin API
│
├── websocket/
│   ├── chatHandler.ts     # Chat WebSocket logic
│   └── voiceHandler.ts    # Voice signaling
│
├── services/
│   ├── ai.ts              # AI provider integration
│   ├── auth.ts            # JWT handling
│   └── session.ts         # Session management
│
└── middleware/
    ├── auth.ts            # JWT verification
    └── cors.ts            # CORS configuration
```

#### Database Schema

**Tenants** (Healthcare Organizations)
```typescript
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

**Apps** (Patient Portal, Doctor Dashboard, etc.)
```typescript
export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  projectId: text('project_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description')
});
```

**App Configs** (Versioned configuration)
```typescript
export const appConfigs = pgTable('app_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id),
  version: integer('version').notNull(),
  isActive: boolean('is_active').default(true),
  configData: jsonb('config_data').notNull(),
  // configData schema:
  // {
  //   systemPrompt: string,
  //   features: { textChat, voice },
  //   theme: { primaryColor, fontScale },
  //   uiHints: { welcomeMessage, widgetTitle, ... }
  // }
});
```

**Sessions**
```typescript
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id),
  sessionId: text('session_id').notNull().unique(),
  widgetInstanceId: text('widget_instance_id'),
  userId: uuid('user_id').references(() => users.id), // nullable
  createdAt: timestamp('created_at').defaultNow(),
  lastActiveAt: timestamp('last_active_at'),
  metadata: jsonb('metadata')
});
```

**Messages**
```typescript
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id),
  messageId: text('message_id').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: jsonb('metadata')
});
```

#### API Endpoints

**POST /v1/widget/session/init**
- Creates new session
- Returns session config
- No auth required (public endpoint)

**POST /v1/auth/login**
- User authentication
- Returns JWT token
- Associates user with session

**GET /v1/sessions/:sessionId/messages**
- Fetch message history
- Requires valid session
- Paginated results

**WebSocket: /ws/chat**
- Real-time messaging
- Streaming responses
- Session validation via query param

**WebSocket: /ws/voice**
- WebRTC signaling
- ICE candidate exchange
- Session validation

---

## Authentication & Security

### Authentication Flow

#### Phase 1: Anonymous Session (Default)

```
1. Widget loads → Session init request
2. Backend creates anonymous session
3. Session ID returned (no user attached)
4. User can chat without login
```

#### Phase 2: User Login (Optional)

**Frontend** (`packages/widget/src/hooks/useAuth.ts`):
```typescript
async function login(email: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      sessionId  // Link to current session
    })
  });

  const { token, user } = await response.json();

  // Store JWT
  localStorage.setItem('kuzushi_token', token);

  // Update session with user info
  updateSession({ userId: user.id });
}
```

**Backend** (`packages/backend/src/routes/auth.ts`):
```typescript
router.post('/login', async (req, res) => {
  const { email, password, sessionId } = req.body;

  // 1. Validate credentials
  const user = await db.users.findOne({ email });
  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 2. Create JWT
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    tenantId: user.tenantId
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  // 3. Update session with user
  if (sessionId) {
    await db.sessions.update({
      where: { sessionId },
      data: { userId: user.id }
    });
  }

  res.json({ token, user });
});
```

### JWT Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid-here",
    "email": "patient@example.com",
    "tenantId": "tenant-uuid",
    "iat": 1700000000,
    "exp": 1700604800
  }
}
```

### WebSocket Authentication

**Option 1**: Query param (current)
```javascript
wss://api.kuzushi.ai/ws/chat?sessionId=sess_123&token=jwt_token
```

**Option 2**: First message
```json
{
  "type": "auth",
  "token": "jwt_token",
  "sessionId": "sess_123"
}
```

**Backend validation**:
```typescript
ws.on('connection', async (socket, req) => {
  const url = new URL(req.url, 'ws://localhost');
  const sessionId = url.searchParams.get('sessionId');
  const token = url.searchParams.get('token');

  // Verify session exists
  const session = await db.sessions.findOne({ sessionId });
  if (!session) {
    socket.close(4001, 'Invalid session');
    return;
  }

  // Verify JWT (if provided)
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      socket.userId = payload.sub;
    } catch (err) {
      socket.close(4003, 'Invalid token');
      return;
    }
  }

  socket.sessionId = sessionId;
  socket.on('message', handleMessage);
});
```

### Security Best Practices

1. **HTTPS Only** in production
2. **CORS Configuration**: Whitelist allowed origins
3. **Rate Limiting**: Per session/IP
4. **Input Validation**: Sanitize all inputs
5. **SQL Injection Protection**: Drizzle ORM parameterized queries
6. **XSS Prevention**: React auto-escapes, Shadow DOM isolates
7. **CSRF Protection**: Not needed (no cookies, JWT in header)
8. **Content Security Policy**: Configure in backend headers

---

## Multi-Tenancy Model

### Hierarchy

```
Tenant (Healthcare Organization)
  └── App (Patient Portal, Doctor Dashboard)
      └── App Config (System prompts, theme, features)
          └── Sessions (User conversations)
              └── Messages (Chat history)
```

### Example: St. Mary's Hospital

**Tenant**:
```json
{
  "id": "tenant-stmarys",
  "name": "St. Mary's Hospital",
  "domain": "stmarys.com"
}
```

**Apps**:
```json
[
  {
    "id": "app-patient-portal",
    "projectId": "stmarys-patient-portal",
    "name": "Patient Portal Assistant",
    "description": "Helps patients with appointments, records, billing"
  },
  {
    "id": "app-doctor-dashboard",
    "projectId": "stmarys-doctor-dashboard",
    "name": "Doctor Assistant",
    "description": "Helps doctors with patient info, scheduling"
  }
]
```

**App Config** (Patient Portal):
```json
{
  "appId": "app-patient-portal",
  "version": 3,
  "isActive": true,
  "configData": {
    "systemPrompt": "You are a helpful assistant for St. Mary's Hospital patients. Help them with: appointments, medical records, billing questions, visiting hours. Be empathetic and HIPAA-compliant. Never provide medical diagnoses.",

    "features": {
      "textChat": true,
      "voice": true
    },

    "theme": {
      "primaryColor": "#0066cc",
      "fontScale": 1.0,
      "radius": "0.5rem"
    },

    "uiHints": {
      "welcomeMessage": "Welcome to St. Mary's Hospital! How can I assist you today?",
      "widgetTitle": "Patient Assistant",
      "inputPlaceholder": "Ask about appointments, records, billing...",
      "sendButtonText": "Send",
      "voiceButtonText": "Start Voice Chat",
      "endCallButtonText": "End Call",
      "poweredByText": "Powered by Kuzushi AI",
      "emptyStateMessage": "👋 Hello! I'm your St. Mary's assistant.",
      "emptyStateSubtitle": "Ask me anything about your care."
    }
  }
}
```

### Config Versioning

**Why?**
- Hospital updates system prompt
- Want to A/B test different prompts
- Need rollback capability

**How?**
```typescript
// Create new version
await db.appConfigs.insert({
  appId: 'app-patient-portal',
  version: 4,  // Incremented
  isActive: false,  // Not active yet
  configData: { ...newConfig }
});

// Activate new version (deactivate old)
await db.transaction(async (tx) => {
  // Deactivate all versions
  await tx.appConfigs.update({
    where: { appId: 'app-patient-portal' },
    data: { isActive: false }
  });

  // Activate version 4
  await tx.appConfigs.update({
    where: { appId: 'app-patient-portal', version: 4 },
    data: { isActive: true }
  });
});

// Rollback: just activate old version
await activateVersion('app-patient-portal', 3);
```

### Session Isolation

**Critical**: Sessions cannot cross tenant boundaries

```typescript
// Get messages for session
async function getMessages(sessionId: string, userId: string) {
  const session = await db.sessions.findOne({
    where: { sessionId }
  });

  const app = await db.apps.findOne({
    where: { id: session.appId }
  });

  // Verify user belongs to same tenant
  const user = await db.users.findOne({
    where: { id: userId }
  });

  if (user.tenantId !== app.tenantId) {
    throw new Error('Unauthorized: Tenant mismatch');
  }

  return db.messages.findMany({
    where: { sessionId: session.id },
    orderBy: { timestamp: 'asc' }
  });
}
```

---

## Real-Time Communication

### WebSocket Architecture

**Server** (`packages/backend/src/server.ts`):
```typescript
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const httpServer = createServer(app);
const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws/chat'
});

wss.on('connection', (ws, req) => {
  handleChatConnection(ws, req);
});

httpServer.listen(3001);
```

**Connection Map**:
```typescript
// Track active connections
const connections = new Map<string, WebSocket>();

function handleChatConnection(ws: WebSocket, req: Request) {
  const sessionId = getSessionId(req);

  // Store connection
  connections.set(sessionId, ws);

  ws.on('message', (data) => handleMessage(ws, data, sessionId));
  ws.on('close', () => connections.delete(sessionId));
}
```

### Message Protocol

**Client → Server**:

```typescript
// User message
{
  type: 'user_message',
  messageId: 'msg_123',
  content: 'What are your visiting hours?',
  metadata: {
    timestamp: '2025-11-23T10:30:00Z'
  }
}

// Init
{
  type: 'init',
  sessionId: 'sess_abc'
}
```

**Server → Client**:

```typescript
// Session acknowledgment
{
  type: 'session_ack',
  sessionId: 'sess_abc'
}

// Streaming token
{
  type: 'token',
  messageId: 'resp_456',
  delta: 'Our visiting'  // Partial text
}

// Complete message
{
  type: 'message',
  messageId: 'resp_456',
  role: 'assistant',
  content: 'Our visiting hours are 9am-8pm daily.'
}

// Status update
{
  type: 'status',
  status: 'typing' | 'idle'
}

// Error
{
  type: 'error',
  message: 'Failed to process request',
  code: 'AI_ERROR'
}
```

### Streaming Implementation

**Backend** (`packages/backend/src/services/ai.ts`):
```typescript
async function streamAIResponse(
  ws: WebSocket,
  prompt: string,
  messageId: string
) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    stream: true
  });

  let fullText = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';

    if (delta) {
      fullText += delta;

      // Send token to client
      ws.send(JSON.stringify({
        type: 'token',
        messageId,
        delta
      }));
    }
  }

  // Send final message
  ws.send(JSON.stringify({
    type: 'message',
    messageId,
    role: 'assistant',
    content: fullText
  }));

  return fullText;
}
```

**Frontend** (`packages/widget/src/state/chatStore.ts`):
```typescript
const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  streamingContent: '',
  currentStreamingMessageId: null,

  startStreaming: (messageId: string) => {
    set({
      currentStreamingMessageId: messageId,
      streamingContent: '',
      isTyping: true
    });
  },

  appendStreamingToken: (token: string) => {
    set(state => ({
      streamingContent: state.streamingContent + token
    }));
  },

  finalizeStreamingMessage: () => {
    const { streamingContent, currentStreamingMessageId } = get();

    set(state => ({
      messages: [...state.messages, {
        id: currentStreamingMessageId!,
        role: 'assistant',
        content: streamingContent,
        timestamp: new Date().toISOString()
      }],
      streamingContent: '',
      currentStreamingMessageId: null,
      isTyping: false
    }));
  }
}));
```

### Reconnection Logic

**Frontend** (`packages/widget/src/hooks/useChatWebSocket.ts`):
```typescript
const MAX_RECONNECT_ATTEMPTS = 5;
const reconnectAttemptsRef = useRef(0);

ws.onclose = (event) => {
  setStatus('disconnected');

  if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttemptsRef.current),
      30000  // Max 30 seconds
    );

    reconnectAttemptsRef.current++;

    setTimeout(() => {
      console.log(`Reconnecting (attempt ${reconnectAttemptsRef.current})...`);
      connect();
    }, delay);
  } else {
    setError('Failed to reconnect. Please refresh.');
  }
};

ws.onopen = () => {
  reconnectAttemptsRef.current = 0;  // Reset on success
  setStatus('connected');
};
```

---

## Voice Assistant Flow

### WebRTC Architecture

```
Frontend (Widget)          Backend (Signaling Server)          AI Voice Provider
     │                              │                                 │
     ├──── 1. Start Voice ──────────>│                                 │
     │<─── 2. Session Created ───────┤                                 │
     │                              │                                 │
     ├──── 3. SDP Offer ───────────>│                                 │
     │                              ├──── 4. Forward Offer ─────────>│
     │                              │<─── 5. SDP Answer ─────────────┤
     │<─── 6. Forward Answer ────────┤                                 │
     │                              │                                 │
     ├──── 7. ICE Candidates ──────>│──── Forward ─────────────────>│
     │<─── 8. ICE Candidates ────────┤<──── Forward ───────────────────┤
     │                              │                                 │
     ├─────────────── 9. Direct P2P Audio Connection ─────────────────>│
     │<──────────────────────────────────────────────────────────────────┤
```

### Frontend Implementation

**File**: `packages/widget/src/hooks/useVoiceAssistant.ts`

```typescript
export function useVoiceAssistant({
  signalingUrl,
  rtcConfig,
  sessionId
}) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const startVoiceSession = useCallback(async () => {
    setStatus('connecting');

    // 1. Get user microphone
    localStream.current = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // 2. Create peer connection
    peerConnection.current = new RTCPeerConnection(rtcConfig || {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // 3. Add local tracks
    localStream.current.getTracks().forEach(track => {
      peerConnection.current!.addTrack(track, localStream.current!);
    });

    // 4. Handle remote stream
    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setStatus('live');
    };

    // 5. Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current?.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          sessionId
        }));
      }
    };

    // 6. Connect to signaling server
    ws.current = new WebSocket(signalingUrl);

    ws.current.onopen = async () => {
      // Create SDP offer
      const offer = await peerConnection.current!.createOffer();
      await peerConnection.current!.setLocalDescription(offer);

      // Send offer to signaling server
      ws.current!.send(JSON.stringify({
        type: 'offer',
        sdp: offer,
        sessionId
      }));
    };

    // 7. Handle signaling messages
    ws.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'answer':
          await peerConnection.current!.setRemoteDescription(
            new RTCSessionDescription(message.sdp)
          );
          break;

        case 'ice-candidate':
          await peerConnection.current!.addIceCandidate(
            new RTCIceCandidate(message.candidate)
          );
          break;
      }
    };
  }, [signalingUrl, rtcConfig, sessionId]);

  const toggleMic = useCallback(() => {
    if (!localStream.current) return;

    const audioTrack = localStream.current.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsMicMuted(!audioTrack.enabled);
  }, []);

  const stopVoiceSession = useCallback(() => {
    // Close peer connection
    peerConnection.current?.close();

    // Stop local tracks
    localStream.current?.getTracks().forEach(track => track.stop());

    // Close WebSocket
    ws.current?.close();

    // Reset state
    setStatus('idle');
    setRemoteStream(null);
    setIsMicMuted(false);
  }, []);

  return {
    startVoiceSession,
    stopVoiceSession,
    toggleMic,
    status,
    isMicMuted,
    remoteStream
  };
}
```

### Backend Signaling

**File**: `packages/backend/src/websocket/voiceHandler.ts`

```typescript
const voiceWss = new WebSocketServer({
  server: httpServer,
  path: '/ws/voice'
});

// Track voice sessions
const voiceSessions = new Map<string, {
  clientWs: WebSocket,
  aiWs: WebSocket | null
}>();

voiceWss.on('connection', (clientWs, req) => {
  const sessionId = getSessionId(req);

  clientWs.on('message', async (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'offer':
        // 1. Connect to AI voice provider
        const aiWs = await connectToAIVoiceProvider(sessionId);

        voiceSessions.set(sessionId, { clientWs, aiWs });

        // 2. Forward offer to AI
        aiWs.send(JSON.stringify({
          type: 'offer',
          sdp: message.sdp
        }));

        // 3. Handle AI responses
        aiWs.on('message', (aiData) => {
          const aiMessage = JSON.parse(aiData.toString());

          // Forward to client
          clientWs.send(JSON.stringify(aiMessage));
        });
        break;

      case 'ice-candidate':
        // Forward ICE candidates
        const session = voiceSessions.get(sessionId);
        session?.aiWs?.send(JSON.stringify(message));
        break;

      case 'end':
        // Clean up
        const endSession = voiceSessions.get(sessionId);
        endSession?.aiWs?.close();
        voiceSessions.delete(sessionId);
        break;
    }
  });

  clientWs.on('close', () => {
    const session = voiceSessions.get(sessionId);
    session?.aiWs?.close();
    voiceSessions.delete(sessionId);
  });
});
```

### Voice UI Component

**File**: `packages/widget/src/components/VoiceControls.tsx`

```typescript
export function VoiceControls({ config }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    startVoiceSession,
    stopVoiceSession,
    toggleMic,
    status,
    isMicMuted,
    remoteStream
  } = useVoiceAssistant({
    signalingUrl: config.voiceSignalingUrl,
    rtcConfig: config.rtcConfig,
    sessionId: config.sessionId,
    token: config.token
  });

  // Connect remote stream to audio element
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!config.features?.voice) return null;

  const isLive = status === 'live';
  const isConnecting = status === 'connecting';

  return (
    <div className="p-4 bg-muted/30 border-t">
      <div className="flex items-center justify-between">
        <Badge variant={isLive ? 'success' : 'secondary'}>
          {isLive ? '● Voice Active' : 'Voice Assistant'}
        </Badge>

        <div className="flex gap-2">
          {isLive && (
            <Button
              variant={isMicMuted ? 'destructive' : 'outline'}
              size="sm"
              onPress={toggleMic}
            >
              {isMicMuted ? '🔇 Unmute' : '🎤 Mute'}
            </Button>
          )}

          <Button
            variant={isLive ? 'destructive' : 'default'}
            size="sm"
            onPress={isLive ? stopVoiceSession : startVoiceSession}
            isDisabled={isConnecting}
          >
            {isLive ? '📞 End Call' : '🎙️ Start Voice'}
          </Button>
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}
```

---

## Routing & Navigation

### TanStack Router Configuration

**File**: `packages/widget/src/router.tsx`

```typescript
import {
  createMemoryHistory,
  createRouter,
  createRootRoute,
  createRoute
} from '@tanstack/react-router';

// Root route component
function RootComponent() {
  return (
    <div className="h-full w-full">
      <Outlet />  {/* Child routes render here */}
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent
});

// Chat route (/)
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function ChatRoute() {
    const { config } = useRouteContext({ from: '/' });
    return <ChatLayout config={config} />;
  }
});

// Settings route (/settings)
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: function SettingsRoute() {
    const { config } = useRouteContext({ from: '/settings' });
    return <SettingsView config={config} />;
  }
});

// History route (/history)
const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: function HistoryRoute() {
    const { config } = useRouteContext({ from: '/history' });
    return <HistoryView config={config} />;
  }
});

// Build route tree
const routeTree = rootRoute.addChildren([
  chatRoute,
  settingsRoute,
  historyRoute
]);

// Create router factory
export function createWidgetRouter(config: WidgetConfig) {
  // Memory history = no URL bar changes
  const memoryHistory = createMemoryHistory({
    initialEntries: ['/']  // Start at chat
  });

  const router = createRouter({
    routeTree,
    history: memoryHistory,
    context: { config },  // Available to all routes
    defaultPreload: 'intent'  // Preload on hover
  });

  return router;
}

export const ROUTES = {
  CHAT: '/',
  SETTINGS: '/settings',
  HISTORY: '/history'
} as const;
```

### Why Memory Mode?

**Regular Router** (Browser):
```
User clicks "Settings"
  → URL changes to /settings
  → Browser history updated
  → Page title changes
```

**Memory Router** (Widget):
```
User clicks "Settings"
  → Internal route changes to /settings
  → URL stays same (host page URL)
  → No browser history pollution
  → Perfect for embedded widgets
```

**Benefits**:
- ✅ No URL bar changes (invisible to host)
- ✅ No browser back button interference
- ✅ No hash fragments (#/settings)
- ✅ True SPA behavior
- ✅ Works in iframes
- ✅ Multiple widgets on same page

### Navigation Bar

**File**: `packages/widget/src/App.tsx`

```typescript
<div className="flex items-center gap-1 p-2 border-b">
  <Button
    variant={router.state.location.pathname === ROUTES.CHAT ? 'default' : 'ghost'}
    size="sm"
    onPress={() => router.navigate({ to: ROUTES.CHAT })}
  >
    💬 Chat
  </Button>

  <Button
    variant={router.state.location.pathname === ROUTES.HISTORY ? 'default' : 'ghost'}
    size="sm"
    onPress={() => router.navigate({ to: ROUTES.HISTORY })}
  >
    📋 History
  </Button>

  <Button
    variant={router.state.location.pathname === ROUTES.SETTINGS ? 'default' : 'ghost'}
    size="sm"
    onPress={() => router.navigate({ to: ROUTES.SETTINGS })}
  >
    ⚙️ Settings
  </Button>
</div>

<div className="flex-1 overflow-hidden">
  <RouterProvider router={router} />
</div>
```

### Route Context Sharing

**Why?** All routes need access to `WidgetConfig`

```typescript
// Create router with context
const router = createRouter({
  routeTree,
  context: { config }  // Shared data
});

// Access in routes
function ChatRoute() {
  const { config } = useRouteContext({ from: '/' });

  return <ChatLayout config={config} />;
}
```

**Alternative** (without context):
```typescript
// ❌ Props drilling
<RouterProvider router={router}>
  <Routes config={config} />  // Pass everywhere
</RouterProvider>

// ✅ Context (cleaner)
<RouterProvider router={router} />
// Routes automatically get config
```

---

## Styling & Shadow DOM

### Tailwind v4 Setup

**File**: `packages/widget/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  plugins: []
} satisfies Config;
```

### CSS Variables (Theme)

**File**: `packages/widget/src/styles.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Default theme (light) */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --radius: 0.5rem;
  }
}
```

### Dynamic Theming

**File**: `packages/widget/src/App.tsx`

```typescript
useEffect(() => {
  if (widgetConfig?.theme) {
    const root = document.documentElement;

    // Update CSS variables
    if (widgetConfig.theme.primaryColor) {
      // Convert hex to HSL
      const hsl = hexToHSL(widgetConfig.theme.primaryColor);
      root.style.setProperty('--primary', hsl);
    }

    if (widgetConfig.theme.radius) {
      root.style.setProperty('--radius', widgetConfig.theme.radius);
    }

    if (widgetConfig.theme.fontScale) {
      root.style.fontSize = `${widgetConfig.theme.fontScale * 16}px`;
    }
  }
}, [widgetConfig?.theme]);
```

### Shadow DOM Benefits

**Without Shadow DOM**:
```html
<body>
  <div class="button">Host Button</div>  <!-- Host styles -->

  <kuzushi-widget>
    <div class="button">Widget Button</div>  <!-- CONFLICT! -->
  </kuzushi-widget>
</body>

<style>
  /* Host CSS */
  .button { background: red; }  /* Affects widget too! ❌ */
</style>
```

**With Shadow DOM**:
```html
<body>
  <div class="button">Host Button</div>

  <kuzushi-widget>
    #shadow-root
      <style>
        .button { background: blue; }  /* Scoped ✅ */
      </style>
      <div class="button">Widget Button</div>
  </kuzushi-widget>
</body>

<style>
  .button { background: red; }  /* Only affects host ✅ */
</style>
```

**Isolation**:
- ✅ Host CSS doesn't leak into widget
- ✅ Widget CSS doesn't leak to host
- ✅ No class name conflicts
- ✅ No ID conflicts
- ✅ Independent styling
- ✅ No `!important` wars

### Building with Vite

**File**: `packages/widget/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/mount.tsx'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    cssCodeSplit: false,  // Single CSS file
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log in production
        drop_debugger: true
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
```

**Output**:
```
dist/
├── index.mjs        # ES module (1.9 MB → 344 KB gzipped)
├── index.js         # CommonJS (708 KB → 214 KB gzipped)
└── styles.css       # All CSS (17 KB minified)
```

---

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────────────────┐
│  CDN (CloudFlare / CloudFront)                         │
│  ├── snippet.js        (1.5 KB)                        │
│  ├── loader.js         (30-50 KB)                      │
│  └── widget.js         (344 KB)                        │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Load Balancer (ALB / nginx)                           │
└─────────────────────────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
    ┌────────┐    ┌────────┐    ┌────────┐
    │ Node 1 │    │ Node 2 │    │ Node 3 │  (Backend servers)
    └────────┘    └────────┘    └────────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   PostgreSQL     │
              │   (Primary)      │
              └──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   PostgreSQL     │
              │   (Read Replica) │
              └──────────────────┘
```

### Environment Variables

**Backend** (`.env`):
```bash
# Server
NODE_ENV=production
PORT=3001
API_BASE_URL=https://api.kuzushi.ai

# Database
DATABASE_URL=postgresql://user:pass@db.example.com:5432/kuzushi
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# JWT
JWT_SECRET=your-256-bit-secret
JWT_EXPIRATION=7d

# AI Provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# CORS
ALLOWED_ORIGINS=https://stmarys.com,https://general-hospital.com

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=10000

# Voice
VOICE_PROVIDER_URL=wss://voice.provider.com
TURN_SERVER_URL=turn:turn.example.com:3478
TURN_USERNAME=user
TURN_CREDENTIAL=pass
```

**Frontend Build** (embedded in widget):
```typescript
// Set at build time
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  cdnUrl: import.meta.env.VITE_CDN_URL,
  environment: import.meta.env.MODE
};
```

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/deploy.yml`):

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm test

  build-widget:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3

      - run: pnpm install
      - run: pnpm build --filter=@kuzushi/widget
      - run: pnpm build --filter=@kuzushi/widget-loader

      # Upload to CDN
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_KEY }}
          aws-region: us-east-1

      - run: |
          aws s3 sync packages/widget/dist s3://kuzushi-cdn/widget/v1/ \
            --cache-control "public, max-age=31536000, immutable"

          aws s3 sync packages/widget-loader/dist s3://kuzushi-cdn/widget/v1/ \
            --cache-control "public, max-age=31536000, immutable"

      # Invalidate CloudFront
      - run: |
          aws cloudfront create-invalidation \
            --distribution-id E123456 \
            --paths "/widget/v1/*"

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Build Docker image
      - uses: docker/build-push-action@v4
        with:
          context: packages/backend
          push: true
          tags: kuzushi/backend:${{ github.sha }}

      # Deploy to ECS/K8s
      - run: |
          aws ecs update-service \
            --cluster kuzushi-prod \
            --service backend \
            --force-new-deployment
```

### Database Migrations

**Run migrations**:
```bash
cd packages/backend
pnpm drizzle-kit push:pg  # Development
pnpm drizzle-kit generate:pg  # Generate SQL
pnpm drizzle-kit migrate  # Production
```

**Migration file** (`packages/backend/src/db/migrations/0001_add_voice.sql`):
```sql
-- Add voice configuration
ALTER TABLE app_configs
ADD COLUMN voice_enabled BOOLEAN DEFAULT FALSE;

-- Add voice session tracking
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  metadata JSONB
);

CREATE INDEX idx_voice_sessions_session_id ON voice_sessions(session_id);
```

### Monitoring

**Backend metrics**:
- Request rate (requests/sec)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- WebSocket connections (active)
- Database queries (slow queries)
- Memory usage
- CPU usage

**Frontend metrics** (sent via analytics):
- Widget load time
- Session duration
- Messages per session
- Error rates
- WebSocket reconnections
- Voice call duration

**Tools**:
- **Logging**: Winston + CloudWatch
- **APM**: New Relic / Datadog
- **Errors**: Sentry
- **Analytics**: Custom events to backend

---

## Development Workflow

### Getting Started

```bash
# 1. Clone repo
git clone https://github.com/your-org/healthcare-platform.git
cd healthcare-platform

# 2. Install dependencies
pnpm install

# 3. Set up database
cd packages/backend
cp .env.example .env
# Edit .env with your database credentials

# Create database
createdb kuzushi_dev

# Run migrations
pnpm db:push

# 4. Start development servers
cd ../..
pnpm dev

# This starts:
# - Backend: http://localhost:3001
# - Widget: http://localhost:5173 (Vite dev server)
```

### Project Commands

```bash
# Root commands (uses Turborepo)
pnpm dev          # Start all packages in dev mode
pnpm build        # Build all packages
pnpm test         # Run tests in all packages
pnpm typecheck    # Type check all packages
pnpm lint         # Lint all packages
pnpm clean        # Remove all dist/ and node_modules/

# Package-specific
pnpm --filter @kuzushi/widget dev
pnpm --filter @kuzushi/backend build
pnpm --filter @kuzushi/widget-loader typecheck

# Database
pnpm --filter @kuzushi/backend db:push      # Push schema
pnpm --filter @kuzushi/backend db:studio    # Open Drizzle Studio
pnpm --filter @kuzushi/backend db:seed      # Seed data
```

### Testing the Widget

**Create test HTML**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
</head>
<body>
  <h1>My Healthcare App</h1>

  <!-- Configure -->
  <script>
    window.KuzushiConfig = {
      projectId: 'test-app',
      apiBaseUrl: 'http://localhost:3001'
    };
  </script>

  <!-- Load widget (development) -->
  <script src="http://localhost:5173/src/snippet.ts" type="module"></script>

  <!-- OR production build -->
  <!-- <script src="https://cdn.kuzushi.ai/widget/v1/snippet.js"></script> -->
</body>
</html>
```

### Debugging

**Frontend**:
- React DevTools (component tree)
- Redux DevTools (Zustand)
- Network tab (WebSocket frames)
- Console (WebSocket messages logged)

**Backend**:
- Winston logs (console + file)
- Postman (REST API testing)
- WebSocket clients (Postman, wscat)
- Database queries (Drizzle Studio)

**WebSocket debugging**:
```bash
# Install wscat
npm install -g wscat

# Connect to chat
wscat -c "ws://localhost:3001/ws/chat?sessionId=test_123"

# Send message
> {"type":"user_message","content":"Hello"}

# Receive response
< {"type":"message","content":"Hi there!"}
```

### Common Issues

**Widget not loading**:
1. Check console for errors
2. Verify `KuzushiConfig` is set
3. Check CORS (backend must allow origin)
4. Check network tab for 404s

**WebSocket not connecting**:
1. Check backend is running
2. Verify session ID is valid
3. Check WebSocket URL format
4. Look for CORS/origin errors

**Styles not working**:
1. Check Shadow DOM is enabled
2. Verify CSS is loaded
3. Check Tailwind classes are valid
4. Inspect with DevTools (pierce Shadow DOM)

### Adding a New Feature

**Example: Add "Export Chat" button**

1. **Frontend** - Add UI
```typescript
// packages/widget/src/views/HistoryView.tsx
<Button onPress={exportChat}>
  📥 Export Chat
</Button>

function exportChat() {
  const messages = useChatStore.getState().messages;
  const json = JSON.stringify(messages, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-${Date.now()}.json`;
  a.click();
}
```

2. **Backend** - Add API endpoint (if needed)
```typescript
// packages/backend/src/routes/widget.ts
router.get('/sessions/:sessionId/export', async (req, res) => {
  const messages = await db.messages.findMany({
    where: { sessionId: req.params.sessionId }
  });

  res.json({
    sessionId: req.params.sessionId,
    exportedAt: new Date().toISOString(),
    messages
  });
});
```

3. **Test**
```bash
pnpm dev
# Open test HTML
# Click Export button
# Verify JSON downloads
```

4. **Document**
```markdown
# Export Chat Feature

Users can export their chat history as JSON.

**Frontend**: `packages/widget/src/views/HistoryView.tsx`
**Backend**: `packages/backend/src/routes/widget.ts`
**API**: `GET /v1/sessions/:sessionId/export`
```

---

## Summary

### Key Architectural Decisions

1. **2-Package Structure** (not 3)
   - widget-loader (minimal)
   - widget (full app)
   - Follows Intercom/Segment/Drift

2. **React Aria** (not Radix)
   - Better Shadow DOM support
   - No portal issues
   - Superior accessibility

3. **Memory Routing** (not browser)
   - No URL changes
   - Perfect for widgets
   - TanStack Router

4. **Shadow DOM** (not iframe)
   - True style isolation
   - Better performance
   - More flexible

5. **WebSocket** (not polling)
   - Real-time streaming
   - Lower latency
   - Better UX

6. **WebRTC** (for voice)
   - P2P audio
   - Low latency
   - Industry standard

7. **Multi-Tenant Database**
   - Tenant isolation
   - Configurable per app
   - Versioned configs

### Request Flow Summary

```
1. Snippet loads (1.5 KB, ~1ms)
   ↓
2. Loader executes (50 KB, ~100ms)
   ↓
3. Session init API call (~200ms)
   ↓
4. Widget downloads (344 KB, ~300ms)
   ↓
5. React mounts in Shadow DOM (~100ms)
   ↓
6. WebSocket connects (~50ms)
   ↓
7. Widget ready (total: ~750ms)
   ↓
8. User sends message
   ↓
9. WebSocket → Backend → AI → Stream back
   ↓
10. UI updates in real-time

Total time to interactive: ~750ms-1s
```

### Technology Choices

- **React 19.2**: Concurrent features, better performance
- **TypeScript**: Type safety, better DX
- **Tailwind v4**: Utility-first CSS, small bundle
- **Zustand**: Simple state management
- **TanStack Router**: Type-safe routing
- **r2wc**: React → Web Component
- **Vite**: Fast builds, HMR
- **Drizzle**: Type-safe ORM
- **jose**: Lightweight JWT

### File Size Breakdown

```
snippet.js:    1.5 KB  (target)
loader.js:     50 KB   (includes r2wc)
widget.js:     344 KB  (gzipped)
styles.css:    17 KB   (minified)
────────────────────────
Total:         ~413 KB
```

**Comparison**:
- Intercom: ~400 KB
- Drift: ~380 KB
- Zendesk: ~500 KB (iframe)
✅ **We're competitive**

### Next Steps

**Optimizations**:
1. Code splitting by route (save ~40 KB)
2. Tree shake unused components (save ~20 KB)
3. Brotli compression (save ~20%)
4. Target: 280 KB gzipped

**Features**:
1. File uploads (images, documents)
2. Typing indicators
3. Read receipts
4. Conversation search
5. Admin dashboard
6. Analytics panel

**Infrastructure**:
1. Redis for session caching
2. Message queue for AI requests
3. CDN optimization
4. Database read replicas
5. Horizontal scaling

---

**Questions?** Check:
- `REACT_ARIA_DECISION.md` - Why React Aria over Radix
- `CRITICAL_GAPS_FIXED.md` - Recent fixes and improvements
- `package.json` files - Dependencies and scripts
- Source code - Heavily commented

**End of Guide** 🚀
