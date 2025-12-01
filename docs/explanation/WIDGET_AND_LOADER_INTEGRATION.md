# Widget and Widget-Loader: Complete Integration Analysis

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Package Relationship Analysis](#package-relationship-analysis)
3. [React Integration Deep Dive](#react-integration-deep-dive)
4. [Session and Security Model](#session-and-security-model)
5. [Integration Flow Step-by-Step](#integration-flow-step-by-step)
6. [Security Analysis](#security-analysis)
7. [Comparison Matrix](#comparison-matrix)

---

## Architecture Overview

The Kuzushi widget system is designed with **separation of concerns**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOST APPLICATION                         │
│  (React, Next.js, Vue, or plain HTML)                           │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               INTEGRATION LAYER                            │  │
│  │  - React Integration: Direct component import              │  │
│  │  - Web Component: <kuzushi-widget> custom element         │  │
│  │  - Widget Loader: Script injection approach               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │           @kuzushi/widget (React Component)                │  │
│  │  - WidgetApp: Main React component                        │  │
│  │  - Chat interface, Voice controls                          │  │
│  │  - Router, State management (Zustand)                     │  │
│  │  - WebSocket client (Socket.io)                           │  │
│  │  - Styles (Tailwind CSS)                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              │ HTTP + WebSocket                  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                      BACKEND (NestJS)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /v1/widget/session/init                            │   │
│  │  → Validates projectId                                   │   │
│  │  → Creates session record                                │   │
│  │  → Generates JWT token                                   │   │
│  │  → Returns config + wsUrl with token                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WebSocket: /ws/chat?sessionId=xxx&token=yyy            │   │
│  │  → Validates JWT token                                   │   │
│  │  → Establishes secure connection                         │   │
│  │  → Bidirectional message exchange                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Package Relationship Analysis

### 1. @kuzushi/widget Package

**Purpose**: Pure React component library containing the actual widget UI and logic.

**Location**: `packages/widget/`

**Key Exports** (from `src/index.ts`):

```typescript
// Main components
export { WidgetApp, App } from './App';
export type { WidgetAppProps, AppProps } from './App';

// Mount function for Shadow DOM integration
export { mount } from './mount';
export type { MountOptions } from './types';

// Types
export type {
  WidgetConfig,
  WidgetThemeConfig,
  UiHints,
  ChatMessage,
  WSClientMessage,
  WSServerMessage,
  VoiceClientMessage,
  VoiceServerMessage,
} from './types';
```

**Two Export Patterns**:

#### Pattern A: Direct React Component (`WidgetApp`)

```typescript
// packages/widget/src/App.tsx
export interface WidgetAppProps {
  projectId: string;
  apiBaseUrl: string;
  sessionId?: string;
  config?: string; // JSON string (from r2wc attributes)
}

export function WidgetApp({ projectId, apiBaseUrl, sessionId, config }: WidgetAppProps) {
  // 1. Parse config if provided, OR
  // 2. Fetch session from backend via POST /v1/widget/session/init
  // 3. Initialize router, WebSocket, Voice pipeline
  // 4. Render chat UI
}
```

**Use Case**: **Direct React integration** (react-integration example uses this)

**Benefits**:
- No Web Component wrapper overhead
- Full React ecosystem compatibility
- TypeScript type safety
- Easy to debug
- Server-side rendering compatible (with conditional mounting)

---

#### Pattern B: Mount Function (`mount`)

```typescript
// packages/widget/src/mount.tsx
export function mount(shadowRoot: ShadowRoot, config: WidgetConfig): void {
  if (!config.projectId || !config.sessionId || !config.wsUrl) {
    throw new Error('config.projectId, config.sessionId, and config.wsUrl are required');
  }

  // Create React root inside Shadow DOM
  const container = document.createElement('div');
  container.className = 'kuzushi-widget-container';
  shadowRoot.appendChild(container);

  // Render <App> component (not WidgetApp)
  const root = createRoot(container);
  root.render(<App config={config} />);
}

export function unmount(): void {
  if (root) {
    root.unmount();
    root = null;
  }
}
```

**Use Case**: **Web Component / Shadow DOM integration** (widget-loader uses this)

**Benefits**:
- Style isolation via Shadow DOM
- Works in any environment (not just React)
- Prevents CSS conflicts
- Used by `loader.ts` in widget-loader

---

### 2. @kuzushi/widget-loader Package

**Purpose**: Loading scripts that convert the React widget into a Web Component for use in any HTML page.

**Location**: `packages/widget-loader/`

**Does NOT use the widget directly**. Instead:
- **loader.ts**: Manually creates Web Component with Shadow DOM, dynamically imports `@kuzushi/widget`, calls `mount()`
- **loader-r2wc.ts**: Uses `r2wc` library to auto-wrap `WidgetApp` as a Web Component
- **loader-minimal.ts**: Command queue pattern + `r2wc` wrapper
- **standalone.ts**: Bundles everything into one file
- **snippet.ts**: Tiny async loader stub

**Key Relationship**:

```typescript
// loader.ts approach
class KuzushiWidgetElement extends HTMLElement {
  connectedCallback() {
    // 1. Create Shadow DOM
    this._shadowRoot = this.attachShadow({ mode: 'open' });

    // 2. Inject Tailwind CSS
    this.injectStyles();

    // 3. Initialize session
    const sessionData = await initSession(projectId, apiBaseUrl);

    // 4. Dynamic import
    const coreModule = await import('@kuzushi/widget');

    // 5. Call mount function
    coreModule.mount(this._shadowRoot, config);
  }
}

customElements.define('kuzushi-widget', KuzushiWidgetElement);
```

```typescript
// loader-r2wc.ts approach
import r2wc from '@r2wc/react-to-web-component';
import { WidgetApp } from '@kuzushi/widget';

const KuzushiWidget = r2wc(WidgetApp, {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiBaseUrl: 'string',
    sessionId: 'string',
    config: 'json'
  }
});

customElements.define('kuzushi-widget', KuzushiWidget);
```

---

## React Integration Deep Dive

### Example Location
`examples/react-integration/`

### Architecture

The React integration example demonstrates **THREE different approaches**:

#### Approach 1: Direct React Component (Recommended)

**File**: `src/components/DirectWidget.tsx`

**Approach**: Import `WidgetApp` directly as a React component

```typescript
import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

export function DirectWidget() {
  return (
    <div className="widget-wrapper">
      <WidgetApp
        projectId="demo-support-widget"
        apiBaseUrl="http://localhost:3001/api"
      />
    </div>
  );
}
```

**How it works**:
1. `WidgetApp` is a normal React component
2. No Web Component wrapper
3. No Shadow DOM
4. Just regular React component composition

**Props**:
- `projectId`: Identifies the app/project in backend
- `apiBaseUrl`: Backend API endpoint
- `sessionId` (optional): Pre-initialized session ID
- `config` (optional): Full config as JSON string

**What happens inside WidgetApp**:

```typescript
// packages/widget/src/App.tsx (lines 23-129)
useEffect(() => {
  const initializeWidget = async () => {
    if (configString) {
      // Case 1: Config provided (from r2wc or manual)
      const parsed = JSON.parse(configString);
      setWidgetConfig(parsed);
    } else if (sessionId) {
      // Case 2: Session ID provided
      const config = {
        projectId,
        sessionId,
        wsUrl: `ws://localhost:3001/ws/chat?sessionId=${sessionId}`,
        apiBaseUrl,
      };
      setWidgetConfig(config);
    } else {
      // Case 3: Fetch from backend
      const response = await fetch(`${apiBaseUrl}/v1/widget/session/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          widgetInstanceId: `widget-${Date.now()}-${Math.random()}`,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          locale: navigator.language,
        }),
      });

      const data = await response.json();

      // Backend returns: { sessionId, chat: { wsUrl }, voice: {...}, features, theme }
      const config: WidgetConfig = {
        projectId,
        sessionId: data.sessionId,
        wsUrl: data.chat?.wsUrl,
        apiBaseUrl,
        features: data.features,
        theme: data.theme,
        uiHints: data.uiHints,
        voiceSignalingUrl: data.voice?.signalingUrl,
        rtcConfig: data.voice?.rtcConfig,
      };

      setWidgetConfig(config);
    }
  };

  initializeWidget();
}, [configString, sessionId, projectId, apiBaseUrl]);
```

**Session Initialization Flow** (Case 3 - most common):

```
WidgetApp mounts
      ↓
No sessionId or config provided
      ↓
POST /v1/widget/session/init
  Body: {
    projectId: "demo-support-widget",
    widgetInstanceId: "widget-1234567890-abc123",
    pageUrl: "http://localhost:3000",
    userAgent: "Mozilla/5.0...",
    locale: "en-US"
  }
      ↓
Backend validates projectId
      ↓
Backend creates WidgetSession record
      ↓
Backend generates JWT token
      ↓
Response: {
  sessionId: "uuid-session-123",
  configVersion: 1,
  features: { textChat: true, voice: true },
  theme: { primaryColor: "#1e3a8a", ... },
  chat: {
    wsUrl: "ws://localhost:3001/ws/chat?sessionId=uuid-session-123&token=eyJhbGc..."
  },
  voice: {
    enabled: true,
    signalingUrl: "ws://localhost:3001/ws/voice?sessionId=uuid-session-123&token=eyJhbGc...",
    rtcConfig: { iceServers: [...] }
  },
  uiHints: {
    welcomeMessage: "Welcome! How can I assist you?",
    widgetTitle: "AI Assistant",
    ...
  }
}
      ↓
WidgetApp stores config
      ↓
Creates router with config
      ↓
Connects WebSocket to wsUrl (includes token in URL)
      ↓
Backend validates token via WebSocket middleware
      ↓
Secure bidirectional communication established
```

---

#### Approach 2: Web Component (Custom Element)

**File**: `src/components/EmbeddedWidget.tsx`

**Approach**: Use `<kuzushi-widget>` custom element loaded via `widget-loader.js`

```typescript
import { useKuzushiWidget } from '../hooks/useKuzushiWidget';

export function EmbeddedWidget() {
  const isLoaded = useKuzushiWidget(); // Loads widget-loader.js script

  return (
    <div>
      {!isLoaded && <div>Loading widget...</div>}
      <kuzushi-widget
        project-id="demo-support-widget"
        api-base-url="http://localhost:3001/api"
        style={{ display: isLoaded ? 'block' : 'none' }}
      />
    </div>
  );
}
```

**The Hook**: `src/hooks/useKuzushiWidget.ts`

This is a **critical piece** that implements a **singleton pattern** for script loading:

```typescript
// Global state - shared across ALL component instances
let scriptLoading = false;
let scriptLoaded = false;
const loadCallbacks: Array<() => void> = [];

export function useKuzushiWidget(): boolean {
  const [isLoaded, setIsLoaded] = useState(scriptLoaded);

  useEffect(() => {
    // Case 1: Already loaded
    if (scriptLoaded) {
      setIsLoaded(true);
      return;
    }

    // Case 2: Currently loading - add callback
    if (scriptLoading) {
      const callback = () => setIsLoaded(true);
      loadCallbacks.push(callback);
      return () => {
        // Cleanup: remove callback if component unmounts
        const index = loadCallbacks.indexOf(callback);
        if (index > -1) loadCallbacks.splice(index, 1);
      };
    }

    // Case 3: Check if script already in DOM (HMR, navigation)
    const existingScript = document.querySelector('script[src*="widget-loader.js"]');
    if (existingScript) {
      scriptLoaded = true;
      setIsLoaded(true);
      return;
    }

    // Case 4: Load the script
    scriptLoading = true;

    const script = document.createElement('script');
    script.src = 'http://localhost:3001/static/widget-loader.js';
    script.async = true;

    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      setIsLoaded(true);

      // Notify all waiting components
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    script.onerror = () => {
      scriptLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    document.body.appendChild(script);
  }, []);

  return isLoaded;
}
```

**Why this pattern?**

**Problem**: Multiple React components might mount simultaneously and try to load the same script
**Solution**: Singleton pattern with callback queue

**Benefits**:
1. Script loads **exactly once** regardless of how many widgets are on the page
2. Handles race conditions (multiple components mounting at same time)
3. All components get notified when script is ready
4. Safe cleanup (doesn't remove shared script)

**What happens when script loads**:

The `widget-loader.js` script (built from `loader-r2wc.ts` or `loader.ts`) registers a custom element:

```typescript
// Inside widget-loader.js (conceptual)
import r2wc from '@r2wc/react-to-web-component';
import { WidgetApp } from '@kuzushi/widget';

const KuzushiWidget = r2wc(WidgetApp, {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiBaseUrl: 'string'
  }
});

customElements.define('kuzushi-widget', KuzushiWidget);
```

**Then** when React renders `<kuzushi-widget project-id="..." api-base-url="...">`:

1. Browser creates instance of `KuzushiWidget` custom element
2. `r2wc` wrapper extracts attributes: `project-id` → `projectId`, `api-base-url` → `apiBaseUrl`
3. `r2wc` creates Shadow DOM
4. `r2wc` renders `<WidgetApp projectId={...} apiBaseUrl={...} />` inside Shadow DOM
5. `WidgetApp` follows same initialization as Approach 1 (fetches session, etc.)

---

#### Approach 3: Advanced Custom Integration

**File**: `src/components/CustomIntegration.tsx`

**Approach**: Direct React component + event handling + dynamic configuration

```typescript
import { WidgetApp } from '@kuzushi/widget';

export function CustomIntegration() {
  const [projectId, setProjectId] = useState('demo-support-widget');
  const [events, setEvents] = useState<string[]>([]);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Listen for custom events (if widget emits them)
  useEffect(() => {
    const handleWidgetEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      setEvents(prev => [
        `${customEvent.type}: ${JSON.stringify(customEvent.detail)}`,
        ...prev
      ]);
    };

    window.addEventListener('widget:ready', handleWidgetEvent);
    window.addEventListener('widget:message', handleWidgetEvent);
    window.addEventListener('widget:error', handleWidgetEvent);

    return () => {
      window.removeEventListener('widget:ready', handleWidgetEvent);
      window.removeEventListener('widget:message', handleWidgetEvent);
      window.removeEventListener('widget:error', handleWidgetEvent);
    };
  }, []);

  return (
    <div>
      <button onClick={() => setProjectId('sales-assistant')}>
        Switch Project
      </button>

      <div ref={widgetRef}>
        <WidgetApp
          projectId={projectId}
          apiBaseUrl="http://localhost:3001/api"
        />
      </div>

      <div>Event Log: {events.map(e => <div>{e}</div>)}</div>
    </div>
  );
}
```

**Features demonstrated**:
- Dynamic `projectId` switching (triggers new session)
- Ref-based widget access
- Event listener integration
- Real-time logging

**When projectId changes**:
1. React re-renders `<WidgetApp>` with new `projectId`
2. `useEffect` in `WidgetApp` fires again
3. New session initialized with new `projectId`
4. New WebSocket connection established
5. Old session remains in database (status: ACTIVE → could add cleanup)

---

### Modal Widget Pattern

**File**: `src/components/ModalWidget.tsx`

```typescript
export function ModalWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open AI Assistant</button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsOpen(false)}>×</button>
            <WidgetApp
              projectId="demo-support-widget"
              apiBaseUrl="http://localhost:3001/api"
            />
          </div>
        </div>
      )}
    </>
  );
}
```

**Key points**:
- Conditional rendering: widget only renders when `isOpen === true`
- Session persists if user closes and reopens (same `WidgetApp` instance)
- Click outside to close (modal pattern)
- Mobile-friendly responsive design

---

## Session and Security Model

### Backend Session Flow

**File**: `packages/backend/src/modules/widget-session/widget-session.service.ts`

#### Step 1: Session Initialization

**Endpoint**: `POST /v1/widget/session/init`

**Controller**: `packages/backend/src/modules/widget-session/widget-session.controller.ts`

```typescript
@Post('init')
@HttpCode(200)
async initSession(@Body() dto: InitSessionDto): Promise<InitSessionResponseDto> {
  return this.sessionService.initSession(dto);
}
```

**DTO** (Data Transfer Object): `dto/init-session.dto.ts`

```typescript
export class InitSessionDto {
  @IsString()
  projectId: string; // REQUIRED

  @IsString()
  widgetInstanceId: string; // REQUIRED: unique identifier for this widget instance

  @IsOptional()
  @IsString()
  externalUserId?: string; // From YOUR system (if you want to link to your users)

  @IsOptional()
  @IsUrl()
  pageUrl?: string; // Where widget is embedded

  @IsOptional()
  @IsString()
  hostOrigin?: string; // e.g., "https://example.com"

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  locale?: string; // e.g., "en-US"
}
```

**Service Logic** (simplified):

```typescript
async initSession(dto: InitSessionDto): Promise<InitSessionResponseDto> {
  // 1. Find app by projectId
  const app = await this.prisma.app.findUnique({
    where: { projectId: dto.projectId },
    include: {
      configs: {
        where: { isActive: true },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!app) {
    throw new NotFoundException(`App not found for projectId: ${dto.projectId}`);
  }

  if (!app.isActive) {
    throw new BadRequestException('This app is currently inactive');
  }

  const config = app.configs[0]; // Active config
  const features = config.features as FeaturesConfig;
  const uiTheme = config.uiTheme as UiThemeConfig;
  const voiceConfig = config.voiceConfig as VoiceConfig;

  // 2. Create session record in database
  const session = await this.prisma.widgetSession.create({
    data: {
      appId: app.id,
      configVersion: config.version,
      externalUserId: dto.externalUserId,
      widgetInstanceId: dto.widgetInstanceId,
      hostOrigin: dto.hostOrigin,
      hostPath: dto.pageUrl,
      userAgent: dto.userAgent,
      locale: dto.locale,
      status: 'ACTIVE',
    },
  });

  // 3. Generate secure JWT token
  const token = this.authService.generateSessionToken(session.id, app.projectId);

  // 4. Build WebSocket URLs WITH TOKEN
  const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3001');
  const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  const wsBaseUrl = baseUrl.replace(/^https?/, wsProtocol);

  const chatWsUrl = `${wsBaseUrl}/ws/chat?sessionId=${session.id}&token=${token}`;
  const voiceWsUrl = `${wsBaseUrl}/ws/voice?sessionId=${session.id}&token=${token}`;

  // 5. Return configuration
  return {
    sessionId: session.id,
    configVersion: config.version,
    features,
    theme: uiTheme,
    chat: { wsUrl: chatWsUrl },
    voice: features.voice ? {
      enabled: true,
      signalingUrl: voiceWsUrl,
      rtcConfig: { iceServers: voiceConfig.iceServers }
    } : undefined,
    uiHints: {
      welcomeMessage: 'Welcome! How can I assist you?',
      widgetTitle: app.name || 'AI Assistant',
      // ... more UI customization
    }
  };
}
```

**Database Schema** (conceptual):

```sql
-- App/Project
CREATE TABLE "App" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- App Configuration (versioned)
CREATE TABLE "AppConfig" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appId" UUID REFERENCES "App"(id),
  version INTEGER NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  features JSONB, -- { textChat: true, voice: true }
  "uiTheme" JSONB, -- { primaryColor: "#1e3a8a", ... }
  "voiceConfig" JSONB, -- { iceServers: [...] }
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Widget Session
CREATE TABLE "WidgetSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appId" UUID REFERENCES "App"(id),
  "configVersion" INTEGER,
  "externalUserId" TEXT, -- Link to YOUR user system
  "widgetInstanceId" TEXT, -- Unique per widget instance
  "hostOrigin" TEXT,
  "hostPath" TEXT,
  "userAgent" TEXT,
  locale TEXT,
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, ENDED
  "lastSeenAt" TIMESTAMP,
  "endedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

---

#### Step 2: JWT Token Generation

**File**: `packages/backend/src/auth/auth.service.ts`

```typescript
export interface SessionTokenPayload {
  sessionId: string;
  projectId: string;
  type: 'widget';
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration (timestamp)
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  generateSessionToken(sessionId: string, projectId: string): string {
    const payload: Omit<SessionTokenPayload, 'iat' | 'exp'> = {
      sessionId,
      projectId,
      type: 'widget',
    };

    // JwtService automatically adds iat and exp based on config
    return this.jwtService.sign(payload);
  }

  validateSessionToken(token: string): SessionTokenPayload {
    try {
      return this.jwtService.verify<SessionTokenPayload>(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  validateTokenForSession(token: string, sessionId: string): boolean {
    try {
      const payload = this.validateSessionToken(token);
      return payload.sessionId === sessionId;
    } catch {
      return false;
    }
  }
}
```

**JWT Configuration** (typically in `AuthModule`):

```typescript
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: '7d', // Token valid for 7 days
      },
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

**Token Format** (conceptual):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJ1dWlkLTEyMzQ1IiwicHJvamVjdElkIjoiZGVtby1zdXBwb3J0LXdpZGdldCIsInR5cGUiOiJ3aWRnZXQiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDYwNDgwMH0.signature

Decoded payload:
{
  "sessionId": "uuid-12345",
  "projectId": "demo-support-widget",
  "type": "widget",
  "iat": 1700000000,
  "exp": 1700604800
}
```

---

#### Step 3: WebSocket Connection

**Widget connects** to WebSocket using the URL returned from session init:

```typescript
// Inside WidgetApp or WebSocket hook
const socket = io(config.wsUrl, {
  transports: ['websocket'],
  // Token is in the URL: ws://localhost:3001/ws/chat?sessionId=xxx&token=yyy
});
```

**Backend WebSocket Gateway** (conceptual):

```typescript
@WebSocketGateway({ namespace: '/ws/chat' })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private authService: AuthService,
    private sessionService: WidgetSessionService
  ) {}

  async handleConnection(client: Socket) {
    const { sessionId, token } = client.handshake.query;

    // Validate token
    if (!token || typeof token !== 'string') {
      client.disconnect();
      return;
    }

    // Verify JWT and check sessionId matches
    const isValid = this.authService.validateTokenForSession(token, sessionId as string);
    if (!isValid) {
      client.disconnect();
      return;
    }

    // Get session from database
    const session = await this.sessionService.getSession(sessionId as string);
    if (!session || session.status !== 'ACTIVE') {
      client.disconnect();
      return;
    }

    // Store session info in socket
    client.data.sessionId = sessionId;
    client.data.projectId = session.app.projectId;

    console.log(`Client connected: sessionId=${sessionId}`);

    // Update last seen
    await this.sessionService.updateLastSeen(sessionId as string);
  }

  @SubscribeMessage('user_message')
  async handleMessage(client: Socket, payload: { messageId: string; content: string }) {
    const { sessionId, projectId } = client.data;

    // Process message (LLM, RAG, etc.)
    // ...

    // Emit response
    client.emit('message', {
      type: 'message',
      messageId: 'assistant-msg-123',
      role: 'assistant',
      content: 'Here is my response...',
    });
  }
}
```

**Security Validation Chain**:

```
1. Client connects with URL: ws://localhost:3001/ws/chat?sessionId=xxx&token=yyy
   ↓
2. Gateway extracts sessionId and token from query params
   ↓
3. Verify JWT signature and expiration
   ↓
4. Check token.sessionId === query.sessionId
   ↓
5. Query database to ensure session exists and is ACTIVE
   ↓
6. If all checks pass: connection established
   ↓
7. If any check fails: disconnect immediately
```

---

## Integration Flow Step-by-Step

### Scenario: React App using Direct Component

**Host App**: `examples/react-integration/src/components/DirectWidget.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: User visits host application                            │
│ ───────────────────────────────────────────────────────────────│
│ http://localhost:3000                                           │
│ React app loads                                                 │
│ <DirectWidget> component mounts                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: WidgetApp component renders                            │
│ ───────────────────────────────────────────────────────────────│
│ <WidgetApp projectId="demo-support-widget"                     │
│            apiBaseUrl="http://localhost:3001/api" />           │
│                                                                 │
│ Props: { projectId, apiBaseUrl }                               │
│ No sessionId or config provided                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: useEffect triggers session initialization              │
│ ───────────────────────────────────────────────────────────────│
│ const initializeWidget = async () => {                         │
│   const response = await fetch(                                │
│     'http://localhost:3001/api/v1/widget/session/init',       │
│     {                                                           │
│       method: 'POST',                                           │
│       body: JSON.stringify({                                    │
│         projectId: 'demo-support-widget',                      │
│         widgetInstanceId: 'widget-1700000000-abc123',          │
│         pageUrl: 'http://localhost:3000',                      │
│         userAgent: 'Mozilla/5.0...',                           │
│         locale: 'en-US'                                         │
│       })                                                        │
│     }                                                           │
│   );                                                            │
│   const data = await response.json();                          │
│ };                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Backend validates and creates session                  │
│ ───────────────────────────────────────────────────────────────│
│ WidgetSessionService.initSession(dto)                          │
│                                                                 │
│ 1. Query: SELECT * FROM "App" WHERE "projectId" = ?           │
│    → Found: { id: "app-uuid-1", name: "Support Widget" }      │
│                                                                 │
│ 2. Query: SELECT * FROM "AppConfig"                            │
│           WHERE "appId" = ? AND "isActive" = true              │
│    → Found: { features: { textChat: true, voice: true }, ... }│
│                                                                 │
│ 3. Insert: INSERT INTO "WidgetSession" (...)                   │
│           VALUES (uuid, app-uuid-1, 'widget-170...', ...)      │
│    → Created: { id: "session-uuid-123", ... }                 │
│                                                                 │
│ 4. Generate JWT: authService.generateSessionToken(             │
│      sessionId: "session-uuid-123",                            │
│      projectId: "demo-support-widget"                          │
│    )                                                            │
│    → Token: "eyJhbGc..."                                       │
│                                                                 │
│ 5. Build response with token in URLs                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Backend returns configuration                          │
│ ───────────────────────────────────────────────────────────────│
│ HTTP 200 OK                                                     │
│ {                                                               │
│   "sessionId": "session-uuid-123",                             │
│   "configVersion": 1,                                           │
│   "features": {                                                 │
│     "textChat": true,                                           │
│     "voice": true                                               │
│   },                                                            │
│   "theme": {                                                    │
│     "primaryColor": "#1e3a8a",                                 │
│     "radius": "0.5rem"                                          │
│   },                                                            │
│   "chat": {                                                     │
│     "wsUrl": "ws://localhost:3001/ws/chat?sessionId=session-uuid-123&token=eyJhbGc..."│
│   },                                                            │
│   "voice": {                                                    │
│     "enabled": true,                                            │
│     "signalingUrl": "ws://localhost:3001/ws/voice?sessionId=session-uuid-123&token=eyJhbGc...",│
│     "rtcConfig": { "iceServers": [...] }                       │
│   },                                                            │
│   "uiHints": {                                                  │
│     "welcomeMessage": "Welcome! How can I assist you?",        │
│     "widgetTitle": "Support Assistant"                         │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: WidgetApp stores config and creates router             │
│ ───────────────────────────────────────────────────────────────│
│ setWidgetConfig(data);                                          │
│ const widgetRouter = createWidgetRouter(data);                 │
│ setRouter(widgetRouter);                                        │
│ setLoading(false);                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Widget UI renders                                      │
│ ───────────────────────────────────────────────────────────────│
│ <KuzushiOverlayProvider>                                       │
│   <div className="kuzushi-widget-root">                        │
│     {/* Nav Bar: Chat, History, Settings */}                   │
│     <RouterProvider router={router} />                         │
│     {features.voice && <VoiceControls />}                      │
│   </div>                                                        │
│ </KuzushiOverlayProvider>                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: WebSocket connection established                       │
│ ───────────────────────────────────────────────────────────────│
│ (Inside useChatWebSocket hook or similar)                      │
│                                                                 │
│ const socket = io(config.wsUrl, {                              │
│   transports: ['websocket']                                    │
│ });                                                             │
│                                                                 │
│ → Connects to: ws://localhost:3001/ws/chat?sessionId=session-uuid-123&token=eyJhbGc...│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: Backend validates WebSocket connection                 │
│ ───────────────────────────────────────────────────────────────│
│ ChatGateway.handleConnection(client)                           │
│                                                                 │
│ 1. Extract query params:                                       │
│    sessionId = "session-uuid-123"                              │
│    token = "eyJhbGc..."                                        │
│                                                                 │
│ 2. Validate JWT:                                               │
│    jwtService.verify(token)                                    │
│    → Decoded: { sessionId, projectId, type: 'widget', ... }   │
│                                                                 │
│ 3. Check sessionId match:                                      │
│    payload.sessionId === query.sessionId ✓                     │
│                                                                 │
│ 4. Query database:                                             │
│    SELECT * FROM "WidgetSession" WHERE id = ?                  │
│    → Found: { status: 'ACTIVE', ... }                         │
│                                                                 │
│ 5. Store session data in socket.data                           │
│    client.data.sessionId = sessionId                           │
│    client.data.projectId = projectId                           │
│                                                                 │
│ 6. Connection accepted ✓                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 10: Widget ready for user interaction                     │
│ ───────────────────────────────────────────────────────────────│
│ User sees:                                                      │
│ ┌────────────────────────────────────────────┐                │
│ │ 💬 Chat  📋 History  ⚙️ Settings           │                │
│ ├────────────────────────────────────────────┤                │
│ │                                            │                │
│ │  Welcome! How can I assist you?            │                │
│ │                                            │                │
│ │                                            │                │
│ │                                            │                │
│ │                                            │                │
│ ├────────────────────────────────────────────┤                │
│ │ [Type your message...]          [Send]    │                │
│ │ 🎙️ Start Voice                             │                │
│ └────────────────────────────────────────────┘                │
│                                                                 │
│ WebSocket: Connected ✓                                         │
│ Session: session-uuid-123                                      │
│ Token: Valid for 7 days                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 11: User sends message                                    │
│ ───────────────────────────────────────────────────────────────│
│ User types: "Hello, I need help"                               │
│ User clicks [Send]                                              │
│                                                                 │
│ socket.emit('user_message', {                                  │
│   messageId: 'msg-client-456',                                 │
│   content: 'Hello, I need help'                                │
│ });                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 12: Backend processes message                             │
│ ───────────────────────────────────────────────────────────────│
│ ChatGateway.handleMessage(client, payload)                     │
│                                                                 │
│ 1. Extract session data:                                       │
│    sessionId = client.data.sessionId                           │
│    projectId = client.data.projectId                           │
│                                                                 │
│ 2. Save user message:                                          │
│    INSERT INTO "ChatMessage" (sessionId, role, content, ...)   │
│    VALUES ('session-uuid-123', 'user', 'Hello...', ...)        │
│                                                                 │
│ 3. Get app config and prompts:                                 │
│    SELECT * FROM "PromptProfile"                               │
│    WHERE appId = ? AND kind = 'SYSTEM'                         │
│                                                                 │
│ 4. Call LLM (OpenAI, Anthropic, etc.):                         │
│    llmService.generateResponse(systemPrompt, userMessage)      │
│                                                                 │
│ 5. Stream response tokens:                                     │
│    for each token:                                             │
│      client.emit('token', {                                    │
│        messageId: 'msg-assistant-789',                         │
│        delta: 'Here '                                          │
│      });                                                        │
│                                                                 │
│ 6. Send final message:                                         │
│    client.emit('message', {                                    │
│      type: 'message',                                          │
│      messageId: 'msg-assistant-789',                           │
│      role: 'assistant',                                        │
│      content: 'Here is the complete response...'               │
│    });                                                          │
│                                                                 │
│ 7. Save assistant message:                                     │
│    INSERT INTO "ChatMessage" (sessionId, role, content, ...)   │
│    VALUES ('session-uuid-123', 'assistant', 'Here...', ...)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 13: Widget displays response                              │
│ ───────────────────────────────────────────────────────────────│
│ socket.on('token', (data) => {                                 │
│   // Append streaming token to message                         │
│   updateMessage(data.messageId, (prev) => prev + data.delta);  │
│ });                                                             │
│                                                                 │
│ socket.on('message', (data) => {                               │
│   // Final message received                                    │
│   addMessage({                                                  │
│     id: data.messageId,                                        │
│     role: data.role,                                           │
│     content: data.content,                                     │
│     timestamp: new Date().toISOString()                        │
│   });                                                           │
│ });                                                             │
│                                                                 │
│ User sees:                                                      │
│ ┌────────────────────────────────────────────┐                │
│ │ You: Hello, I need help                    │                │
│ │                                            │                │
│ │ Assistant: Here is the complete response...│                │
│ └────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Analysis

### 1. Authentication Flow

**No User Authentication Required** (by design for embeddable widgets):
- Widget is **publicly accessible** on host pages
- No login required for end users
- Session is created **anonymously** per widget instance

**Project-Level Authentication**:
- `projectId` identifies the app/project
- Backend validates `projectId` exists and is active
- Only active projects can create sessions

**Optional External User Linking**:
```typescript
// If host app has authenticated users
<WidgetApp
  projectId="demo-support-widget"
  apiBaseUrl="http://localhost:3001/api"
  externalUserId={currentUser.id} // Link to your user system
/>
```

Then in backend:
```typescript
const session = await this.prisma.widgetSession.create({
  data: {
    // ...
    externalUserId: dto.externalUserId, // Stores your user ID
  }
});
```

**Benefit**: You can query all sessions for a specific user:
```sql
SELECT * FROM "WidgetSession" WHERE "externalUserId" = 'user-123';
```

---

### 2. Token-Based WebSocket Security

**Problem**: WebSocket connections can be hijacked or spoofed.

**Solution**: JWT tokens in connection URL.

**Flow**:

```
1. Client requests session
   → POST /v1/widget/session/init

2. Backend generates JWT
   → Token payload: { sessionId, projectId, type: 'widget', exp }
   → Signed with server secret

3. Backend returns wsUrl WITH token
   → ws://localhost:3001/ws/chat?sessionId=xxx&token=yyy

4. Client connects to WebSocket
   → io(wsUrl) // Token automatically included

5. Gateway validates on connection
   → Extract sessionId and token from query
   → Verify JWT signature
   → Check sessionId matches token payload
   → Query database to ensure session exists
   → If valid: accept connection
   → If invalid: disconnect immediately

6. All subsequent messages validated by session
   → client.data.sessionId is trusted (validated on connect)
```

**Security Properties**:

| Threat | Mitigation |
|--------|------------|
| Session hijacking | Token required, signed with secret |
| Token theft | Token expires after 7 days |
| Token reuse | Token bound to specific sessionId |
| MITM attacks | Use WSS (wss://) in production |
| Invalid sessions | Database check on connect |
| Cross-project access | Token includes projectId |

---

### 3. CORS and Origin Validation

**CORS Configuration** (backend):

```typescript
// main.ts or app.module.ts
app.enableCors({
  origin: [
    'http://localhost:3000', // React integration example
    'http://localhost:5173', // Vite dev server
    'https://yourdomain.com', // Production
  ],
  credentials: true,
});
```

**Origin Tracking**:
```typescript
// Stored in WidgetSession
hostOrigin: 'https://yourdomain.com'
hostPath: '/support'
```

**Benefits**:
- Track where widgets are embedded
- Identify unauthorized embeds
- Analytics: which pages use the widget

**Future Enhancement** (not implemented):
```typescript
// In widget-session.service.ts
const app = await this.prisma.app.findUnique({
  where: { projectId: dto.projectId },
});

// Check allowed origins
if (app.allowedOrigins && app.allowedOrigins.length > 0) {
  if (!app.allowedOrigins.includes(dto.hostOrigin)) {
    throw new ForbiddenException('Widget not allowed on this domain');
  }
}
```

---

### 4. Rate Limiting (Future)

**Not implemented in current code**, but recommended:

```typescript
// Using @nestjs/throttler
@ThrottlerGuard()
@Post('init')
async initSession(@Body() dto: InitSessionDto) {
  // Rate limit: 10 session inits per minute per IP
}
```

---

### 5. Content Security Policy (CSP)

**For hosts embedding the widget**:

```html
<meta http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' http://localhost:3001;
    connect-src 'self' ws://localhost:3001 http://localhost:3001;
    style-src 'self' 'unsafe-inline';
  "
>
```

**Shadow DOM helps**: Styles are isolated, reducing CSP issues.

---

### 6. XSS Protection

**React's built-in escaping**:
```tsx
// Safe - React escapes by default
<div>{message.content}</div>
```

**Dangerous patterns** (avoid):
```tsx
// UNSAFE - Never do this
<div dangerouslySetInnerHTML={{ __html: message.content }} />
```

**Backend validation**:
```typescript
// In DTO
@IsString()
@MaxLength(5000)
content: string;
```

---

## Comparison Matrix

### Integration Approaches Compared

| Feature | Direct React Component | Web Component (Embedded) | Web Component (Loader) |
|---------|------------------------|--------------------------|------------------------|
| **File** | `DirectWidget.tsx` | `EmbeddedWidget.tsx` | N/A (plain HTML) |
| **Imports** | `import { WidgetApp }` | `<kuzushi-widget>` | Script tag |
| **Bundle Size** | Shared with host | Separate + loader | Separate + loader |
| **Shadow DOM** | ❌ No | ✅ Yes | ✅ Yes |
| **Style Isolation** | ❌ No (can conflict) | ✅ Yes | ✅ Yes |
| **TypeScript Support** | ✅ Full | ⚠️ Limited (custom element) | ❌ No |
| **React DevTools** | ✅ Yes | ⚠️ Limited | ⚠️ Limited |
| **Framework Requirement** | React | Any | Any |
| **SSR Compatible** | ✅ Yes (with hydration) | ⚠️ Partial | ❌ No |
| **HMR (Hot Reload)** | ✅ Fast | ⚠️ Slower | ❌ Full page reload |
| **Setup Complexity** | Simple | Medium | Simple |
| **Best For** | React apps | React + isolation needed | Non-React sites |

---

### Widget-Loader Variants Compared

| Loader | Bundle Size | Approach | Session Handling | Best For |
|--------|-------------|----------|------------------|----------|
| `snippet.ts` | < 2KB | Async load | Via main loader | Production (2-stage load) |
| `loader-minimal.ts` | ~50KB | Command queue + r2wc | Fetches on load | Production (main bundle) |
| `loader-r2wc.ts` | ~50KB | r2wc wrapper | Fetches per widget | Modern Web Components |
| `loader.ts` | Variable | Manual Shadow DOM | Fetches per widget | Full control |
| `standalone.ts` | Large (~200KB+) | Bundles widget | Fetches per widget | Single-script integration |

---

### Session Security Comparison

| Aspect | Implementation | Security Level |
|--------|----------------|----------------|
| **Transport** | WebSocket (ws:// or wss://) | ⚠️ Medium (use wss:// in prod) |
| **Authentication** | JWT in URL query param | ✅ Good (signed, expiring) |
| **Authorization** | Session validation on connect | ✅ Good |
| **Encryption** | None (ws://) or TLS (wss://) | ⚠️ Use TLS in production |
| **Token Storage** | Not stored (in URL only) | ✅ Good (no localStorage) |
| **Token Lifetime** | 7 days (configurable) | ✅ Good |
| **Session Tracking** | Database records | ✅ Good |
| **CORS** | Configurable origins | ✅ Good |
| **Rate Limiting** | Not implemented | ⚠️ Should add |
| **Input Validation** | DTO validation | ✅ Good |
| **XSS Protection** | React escaping | ✅ Good |

---

## Key Takeaways

### 1. Widget Package = Pure React

- `@kuzushi/widget` is a **standalone React component library**
- Exports both `WidgetApp` (for direct use) and `mount()` (for Web Components)
- No knowledge of how it will be loaded (direct, Web Component, or iframe)
- Handles session initialization internally if not provided

### 2. Widget-Loader Package = Delivery Mechanism

- `@kuzushi/widget-loader` provides **multiple loading strategies**
- Converts React widget into Web Components
- Handles script loading, Shadow DOM, session initialization
- Different builds for different use cases (snippet, standalone, etc.)

### 3. React Integration Example = Direct Component Usage

- **Approach 1 (Recommended)**: Import `WidgetApp` directly
- **Approach 2**: Load `widget-loader.js` and use `<kuzushi-widget>` custom element
- **Approach 3**: Advanced with event handling and dynamic config
- Uses `useKuzushiWidget()` hook for singleton script loading

### 4. Session Security = JWT + WebSocket Validation

- Backend generates JWT on session init
- Token included in WebSocket URL
- Gateway validates token on connection
- All messages tied to validated session
- No user auth required (anonymous sessions)
- Optional external user linking

### 5. Two Initialization Paths

**Path 1: Widget handles it** (Direct React Component)
```
WidgetApp mounts → No config → Fetches session → Connects WebSocket
```

**Path 2: Loader handles it** (Web Component)
```
Loader initializes → Fetches session → Mounts widget with config → Widget connects WebSocket
```

### 6. Security Model

- **No user authentication** (by design for embeddable widgets)
- **Project authentication** (projectId must be valid)
- **Session-level security** (JWT tokens, WebSocket validation)
- **Optional user linking** (externalUserId ties to host app users)
- **CORS protection** (configurable allowed origins)
- **Rate limiting** (recommended, not implemented)

---

## Conclusion

The Kuzushi widget system achieves **flexibility** through:

1. **Separation of concerns**: Widget (UI) vs Loader (delivery)
2. **Multiple integration patterns**: Direct React, Web Component, Script tag
3. **Secure session model**: JWT tokens, WebSocket validation, database tracking
4. **Developer-friendly**: TypeScript support, React hooks, clear APIs
5. **Production-ready**: Shadow DOM isolation, CORS, validation, error handling

The `react-integration` example demonstrates that **direct React component usage** is the simplest and most performant approach for React applications, while **Web Components** provide universal compatibility for non-React environments.

The **backend session service** ensures secure, tracked, and configurable widget instances with JWT-based WebSocket authentication, providing a robust foundation for production deployments.
