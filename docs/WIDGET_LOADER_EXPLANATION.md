# Widget Loader - Comprehensive Technical Explanation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Package Structure](#package-structure)
3. [Loader Variants](#loader-variants)
4. [Step-by-Step Loading Flow](#step-by-step-loading-flow)
5. [Build System](#build-system)
6. [Integration with Widget Package](#integration-with-widget-package)
7. [Technical Patterns](#technical-patterns)
8. [Usage Examples](#usage-examples)

---

## Architecture Overview

The `@kuzushi/widget-loader` package is responsible for embedding the Kuzushi AI assistant widget into third-party websites. It provides multiple loading strategies to support different integration scenarios:

```
┌─────────────────────────────────────────────────────────┐
│                     Host Website                         │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Widget Loader (Tiny Script)            │   │
│  │  - Initializes API stub                          │   │
│  │  - Loads main widget asynchronously              │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐   │
│  │         Main Widget Loader Bundle                │   │
│  │  - Fetches session config from backend           │   │
│  │  - Converts React component to Web Component     │   │
│  │  - Creates Shadow DOM for isolation              │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐   │
│  │          React Widget Application                │   │
│  │  - Chat interface                                │   │
│  │  - Voice controls                                │   │
│  │  - Message history                               │   │
│  │  - Settings                                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Package Structure

```
packages/widget-loader/
├── src/
│   ├── snippet.ts              # Tiny loader stub (< 2KB gzipped)
│   ├── loader-minimal.ts       # Minimal loader with command queue
│   ├── loader-r2wc.ts          # React-to-Web-Component loader
│   ├── loader.ts               # Full-featured loader with Shadow DOM
│   └── standalone.ts           # Self-contained bundle
├── vite.config.ts              # Build config for loader-r2wc
├── vite.standalone.config.ts   # Build config for standalone bundle
├── package.json
└── tsconfig.json
```

### Key Files

| File | Purpose | Size Target | Usage Scenario |
|------|---------|-------------|----------------|
| `snippet.ts` | Minimal async loader | < 2KB gzipped | Initial page embed (like Segment/Intercom) |
| `loader-minimal.ts` | Command queue pattern | < 50KB | Main bundle after snippet loads |
| `loader-r2wc.ts` | React-to-Web-Component | Variable | Modern integration |
| `loader.ts` | Manual Shadow DOM + dynamic import | Variable | Full control over loading |
| `standalone.ts` | All-in-one bundle | Large | Single-script integration |

---

## Loader Variants

### 1. Snippet Loader (`snippet.ts`)

**Purpose**: The smallest possible script that initializes on the host page and asynchronously loads the full widget.

**Pattern**: Command Queue (Segment/Intercom style)

**Key Features**:
- Creates `window.Kuzushi` API stub
- Queues commands before widget loads
- Loads main widget script asynchronously
- < 2KB minified + gzipped

**How it Works**:

```javascript
// 1. Check if already loaded
if (window.Kuzushi && window.Kuzushi._loaded) return;

// 2. Create API stub with command queue
const api = function(...args) {
  if (!api._loaded) {
    api.q = api.q || [];
    api.q.push({ method: args[0], args: args.slice(1) });
  }
};

// 3. Get config from window.KuzushiConfig
api.config = window.KuzushiConfig;

// 4. Load main script asynchronously
const script = document.createElement('script');
script.src = `${config.apiBaseUrl}/widget/loader.js`;
script.async = true;
document.head.appendChild(script);
```

**Usage**:
```html
<script>
  window.KuzushiConfig = {
    projectId: 'your-project-id',
    apiBaseUrl: 'https://api.yoursite.com'
  };
</script>
<script src="https://cdn.kuzushi.ai/widget/v1/snippet.js" async></script>
```

---

### 2. Minimal Loader (`loader-minimal.ts`)

**Purpose**: The main loader that executes after `snippet.ts`, processes queued commands, and mounts the widget.

**Key Features**:
- Processes command queue from snippet
- Initializes session with backend API
- Dynamically imports React widget
- Uses `r2wc` to convert React → Web Component
- Provides widget API (show, hide, destroy)

**Flow**:

```
1. Get API stub from window.Kuzushi
2. Initialize session: POST /v1/widget/session/init
3. Dynamic import: @kuzushi/widget
4. Convert to Web Component using r2wc
5. Register custom element: <kuzushi-widget>
6. Create and mount widget element
7. Process queued commands
8. Mark as loaded
```

**Session Initialization**:
```javascript
POST /v1/widget/session/init
Body: {
  projectId: string,
  widgetInstanceId: string,
  pageUrl: string,
  hostOrigin: string,
  userAgent: string,
  locale: string
}

Response: {
  sessionId: string,
  configVersion: number,
  features: { textChat, voice },
  theme: {...},
  chat: { wsUrl },
  voice: { enabled, signalingUrl, rtcConfig },
  uiHints: { welcomeMessage, ... }
}
```

---

### 3. r2wc Loader (`loader-r2wc.ts`)

**Purpose**: Modern loader using `@r2wc/react-to-web-component` library to convert the React widget into a standard Web Component.

**Key Concept**: `r2wc` (React to Web Component) automatically handles:
- Converting React props to Web Component attributes
- Shadow DOM creation
- Lifecycle management
- Prop/attribute synchronization

**Implementation**:

```typescript
// 1. Dynamic import of React widget
const { WidgetApp } = await import('@kuzushi/widget');

// 2. Convert to Web Component
const KuzushiWidget = r2wc(WidgetApp, {
  shadow: 'open',  // Use Shadow DOM for isolation
  props: {
    projectId: 'string',
    apiBaseUrl: 'string',
    sessionId: 'string',
    config: 'string'  // JSON string
  }
});

// 3. Register custom element
customElements.define('kuzushi-widget', KuzushiWidget);

// 4. Initialize widgets on page
document.querySelectorAll('kuzushi-widget').forEach(async (element) => {
  const sessionConfig = await initSession(...);
  element.setAttribute('session-id', sessionConfig.sessionId);
  element.setAttribute('config', JSON.stringify(sessionConfig));
});
```

**Builds to**: `dist/widget-loader.js` (IIFE format)

---

### 4. Full Loader (`loader.ts`)

**Purpose**: Complete implementation with manual Shadow DOM management and full control over the loading lifecycle.

**Key Features**:
- Custom element class: `KuzushiWidgetElement`
- Manual Shadow DOM creation
- Inline Tailwind CSS injection
- Loading skeleton
- Error states
- Dynamic import of widget
- Session initialization

**Class Structure**:

```typescript
class KuzushiWidgetElement extends HTMLElement {
  private _mounted = false;
  private _shadowRoot: ShadowRoot | null = null;

  // Lifecycle methods
  connectedCallback() {
    // 1. Create shadow root
    // 2. Inject styles
    // 3. Render skeleton
    // 4. Get attributes (project-id, api-base-url)
    // 5. Initialize widget
  }

  disconnectedCallback() {
    // Cleanup
  }

  // Private methods
  private injectStyles() { ... }
  private renderSkeleton() { ... }
  private renderError(message: string) { ... }
  private async initializeWidget(projectId, apiBaseUrl) { ... }
  private async initSession(projectId, apiBaseUrl): SessionInitResponse { ... }
  private async lazyMount(config) { ... }
  private generateInstanceId(): string { ... }
}

// Register
customElements.define('kuzushi-widget', KuzushiWidgetElement);
```

**Style Injection**:

The loader includes inline Tailwind CSS with CSS custom properties for theming:

```javascript
const widgetStyles = `
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  @layer base {
    :host, .kuzushi-widget-root {
      --widget-radius: 0.5rem;
      --widget-bg: 0 0% 100%;
      --widget-fg: 222.2 47.4% 11.2%;
      --widget-primary: 222.2 47.4% 11.2%;
      // ... more CSS variables
    }
  }
`;

// Use Constructable Stylesheets (modern) or <style> tag fallback
if ('adoptedStyleSheets' in Document.prototype) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(widgetStyles);
  this._shadowRoot.adoptedStyleSheets = [sheet];
} else {
  const styleEl = document.createElement('style');
  styleEl.textContent = widgetStyles;
  this._shadowRoot.appendChild(styleEl);
}
```

**Usage**:
```html
<kuzushi-widget
  project-id="your-project-id"
  api-base-url="https://api.yoursite.com">
</kuzushi-widget>
```

---

### 5. Standalone Loader (`standalone.ts`)

**Purpose**: Self-contained bundle that includes both the loader and widget in a single file. No dynamic imports.

**Use Case**: Plain HTML pages without a bundler.

**Key Difference**: Bundles `@kuzushi/widget` directly instead of dynamic import.

**Implementation**:

```typescript
// Direct import (bundled)
import r2wc from '@r2wc/react-to-web-component';
import { WidgetApp } from '@kuzushi/widget';

function initWidget() {
  // Convert to Web Component
  const KuzushiWidget = r2wc(WidgetApp, {
    shadow: 'open',
    props: { projectId: 'string', apiBaseUrl: 'string', sessionId: 'string', config: 'json' }
  });

  // Register
  customElements.define('kuzushi-widget', KuzushiWidget);

  // Initialize all widgets on page
  const initializeWidgets = async () => {
    document.querySelectorAll('kuzushi-widget').forEach(async (element) => {
      const sessionConfig = await initSession(...);
      element.setAttribute('session-id', sessionConfig.sessionId);
      element.setAttribute('config', JSON.stringify(sessionConfig));
    });
  };

  // Auto-initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidgets);
  } else {
    initializeWidgets();
  }
}

// Auto-initialize
initWidget();
```

**Builds to**: `dist/widget-standalone.js` (IIFE format, larger bundle)

**Usage**:
```html
<script src="https://cdn.kuzushi.ai/widget/v1/standalone.js"></script>
<kuzushi-widget
  project-id="your-project-id"
  api-base-url="https://api.yoursite.com">
</kuzushi-widget>
```

---

## Step-by-Step Loading Flow

### Flow 1: Snippet → Loader → Widget (Recommended for Production)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Host Page Loads                                      │
│ ─────────────────────────────────────────────────────────── │
│ <script>                                                      │
│   window.KuzushiConfig = {                                   │
│     projectId: 'abc123',                                     │
│     apiBaseUrl: 'https://api.example.com'                   │
│   };                                                         │
│ </script>                                                     │
│ <script src="cdn/snippet.js" async></script>               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Snippet Executes (< 2KB, instant)                   │
│ ─────────────────────────────────────────────────────────── │
│ • Create window.Kuzushi API stub                            │
│ • Initialize command queue (api.q = [])                     │
│ • Store config (api.config = window.KuzushiConfig)         │
│ • Inject loader script asynchronously                        │
│   <script src="api.example.com/widget/loader.js" async>     │
│ • User can call: Kuzushi('show') → queued                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Loader Script Downloads & Executes (~50KB)          │
│ ─────────────────────────────────────────────────────────── │
│ 1. Get api = window.Kuzushi                                 │
│ 2. Generate instance ID: widget_1234567890_abc123           │
│ 3. POST /v1/widget/session/init                             │
│    → Receives: { sessionId, wsUrl, theme, features, ... }   │
│ 4. Dynamic import: const { WidgetApp } = await import(...)  │
│ 5. Convert to Web Component with r2wc                       │
│ 6. Register: customElements.define('kuzushi-widget', ...)   │
│ 7. Create widget element with attributes                     │
│ 8. Append to DOM (document.body)                            │
│ 9. Process queued commands (api.q)                          │
│ 10. Mark loaded: api._loaded = true                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Widget Renders (React App)                          │
│ ─────────────────────────────────────────────────────────── │
│ • WidgetApp component mounts                                │
│ • Parse config from attributes                               │
│ • Initialize router (TanStack Router)                        │
│ • Connect WebSocket: wsUrl                                   │
│ • Setup voice pipeline if enabled                            │
│ • Render chat interface                                      │
│ • Apply theme CSS variables                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Widget Ready for User Interaction                   │
│ ─────────────────────────────────────────────────────────── │
│ • Chat interface active                                      │
│ • WebSocket connected                                        │
│ • Voice available (if enabled)                               │
│ • API methods: Kuzushi.show(), .hide(), .destroy()          │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 2: Standalone Bundle (Simple Integration)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Host Page Loads                                      │
│ ─────────────────────────────────────────────────────────── │
│ <script src="cdn/widget-standalone.js"></script>           │
│ <kuzushi-widget                                             │
│   project-id="abc123"                                       │
│   api-base-url="https://api.example.com">                  │
│ </kuzushi-widget>                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Standalone Script Executes (Larger Bundle)          │
│ ─────────────────────────────────────────────────────────── │
│ 1. Convert WidgetApp to Web Component with r2wc            │
│ 2. Register: customElements.define('kuzushi-widget', ...)   │
│ 3. Wait for DOMContentLoaded                                │
│ 4. Find all <kuzushi-widget> elements                       │
│ 5. For each widget:                                          │
│    a. Get attributes (project-id, api-base-url)             │
│    b. POST /v1/widget/session/init                          │
│    c. Set session-id and config attributes                  │
│ 6. r2wc handles mounting React app                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Widget Renders                                       │
│ (Same as Flow 1, Step 4)                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 3: Full Loader with Shadow DOM (Manual Control)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Host Page Loads                                      │
│ ─────────────────────────────────────────────────────────── │
│ <script src="cdn/widget-loader.js"></script>               │
│ <kuzushi-widget                                             │
│   project-id="abc123"                                       │
│   api-base-url="https://api.example.com">                  │
│ </kuzushi-widget>                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Custom Element Registered                           │
│ ─────────────────────────────────────────────────────────── │
│ customElements.define('kuzushi-widget', KuzushiWidgetElement) │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: connectedCallback() Fires                           │
│ ─────────────────────────────────────────────────────────── │
│ 1. Create Shadow Root (mode: 'open')                        │
│ 2. Inject Tailwind CSS styles                               │
│    • Try Constructable Stylesheets (modern)                 │
│    • Fallback to <style> tag                                │
│ 3. Render loading skeleton                                  │
│    • Spinner animation                                       │
│    • "Loading assistant..." text                            │
│ 4. Get attributes: project-id, api-base-url                 │
│ 5. Call initializeWidget()                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: initializeWidget() Method                           │
│ ─────────────────────────────────────────────────────────── │
│ 1. Call initSession(projectId, apiBaseUrl)                  │
│    → POST /v1/widget/session/init                           │
│    → Returns SessionInitResponse                            │
│ 2. Prepare widget config object                             │
│ 3. Call lazyMount(config)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: lazyMount() Method                                  │
│ ─────────────────────────────────────────────────────────── │
│ 1. Dynamic import: await import('@kuzushi/widget')         │
│ 2. Clear skeleton from Shadow Root                          │
│ 3. Re-inject styles (were cleared)                          │
│ 4. Call coreModule.mount(shadowRoot, config)               │
│ 5. Mark as mounted: this._mounted = true                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Widget Mounted in Shadow DOM                         │
│ ─────────────────────────────────────────────────────────── │
│ • React app renders inside Shadow Root                       │
│ • Styles isolated from host page                            │
│ • Widget ready for use                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Build System

The widget-loader uses **Vite** for building with two separate configurations:

### Build Configuration 1: `vite.config.ts` (r2wc loader)

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/loader-r2wc.ts'),
      name: 'KuzushiWidgetLoader',
      formats: ['iife'],  // Immediately Invoked Function Expression
      fileName: () => 'widget-loader.js'
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@kuzushi/widget'],  // Don't bundle these
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    sourcemap: true,
    minify: 'terser'
  }
});
```

**Output**: `dist/widget-loader.js`

**Externals**:
- `react`, `react-dom`: Expected from CDN or host page
- `@kuzushi/widget`: Dynamically imported at runtime

---

### Build Configuration 2: `vite.standalone.config.ts` (Standalone bundle)

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/standalone.ts'),
      name: 'KuzushiWidget',
      formats: ['iife'],
      fileName: () => 'widget-standalone.js'
    },
    rollupOptions: {
      external: ['react', 'react-dom'],  // Only externalize React
      // @kuzushi/widget is bundled
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    sourcemap: true,
    minify: 'terser'
  }
});
```

**Output**: `dist/widget-standalone.js`

**Key Difference**: Bundles `@kuzushi/widget` package, resulting in a larger file but no runtime imports.

---

### Build Command

```bash
pnpm build
# Runs both:
# 1. vite build (using vite.config.ts)
# 2. vite build --config vite.standalone.config.ts
```

**Outputs**:
```
dist/
├── widget-loader.js        # r2wc loader (small, dynamic import)
├── widget-loader.js.map
├── widget-standalone.js    # Standalone bundle (larger, self-contained)
└── widget-standalone.js.map
```

---

## Integration with Widget Package

The loader depends on `@kuzushi/widget` package which exports:

```typescript
// From packages/widget/src/index.ts
export { WidgetApp, App } from './App';
export { mount } from './mount';
export type { WidgetConfig, MountOptions, ... } from './types';
```

### WidgetApp Component

**Props**:
```typescript
interface WidgetAppProps {
  projectId: string;
  apiBaseUrl: string;
  sessionId?: string;
  config?: string;  // JSON string (from r2wc attribute)
}
```

**Initialization Flow**:

1. **Parse Config**: If `config` string is provided, parse JSON
2. **Fetch Session**: If no config, call `/v1/widget/session/init`
3. **Create Router**: Initialize TanStack Router with config
4. **Apply Theme**: Set CSS variables from `config.theme`
5. **Render UI**: Show loading → error → or main app

**Main UI Structure**:
```
<KuzushiOverlayProvider>
  <div className="kuzushi-widget-root">
    {/* Navigation Bar */}
    <div className="flex items-center gap-1 p-2">
      <Button>💬 Chat</Button>
      <Button>📋 History</Button>
      <Button>⚙️ Settings</Button>
    </div>

    {/* Router Outlet */}
    <div className="flex-1 overflow-hidden">
      <RouterProvider router={router} />
    </div>

    {/* Voice Controls (if enabled) */}
    {features.voice && <VoiceControls />}
  </div>
</KuzushiOverlayProvider>
```

---

## Technical Patterns

### 1. Web Components

All loaders use the **Custom Elements API**:

```javascript
class KuzushiWidgetElement extends HTMLElement {
  connectedCallback() { /* Mount */ }
  disconnectedCallback() { /* Cleanup */ }
  attributeChangedCallback(name, oldValue, newValue) { /* Update */ }
}

customElements.define('kuzushi-widget', KuzushiWidgetElement);
```

**Benefits**:
- Framework-agnostic
- Works in any HTML page
- Standard browser API
- Lifecycle management

---

### 2. Shadow DOM

Used for **style isolation**:

```javascript
const shadowRoot = this.attachShadow({ mode: 'open' });
shadowRoot.innerHTML = `<div class="widget">...</div>`;
```

**Benefits**:
- Widget styles don't leak to host page
- Host page styles don't affect widget
- Scoped CSS with `:host` selector
- Encapsulation

---

### 3. React to Web Component (r2wc)

Library: `@r2wc/react-to-web-component`

**Purpose**: Automatically wrap React components as Web Components.

```javascript
const KuzushiWidget = r2wc(WidgetApp, {
  shadow: 'open',
  props: {
    projectId: 'string',
    config: 'json'  // Automatically parses JSON
  }
});

customElements.define('kuzushi-widget', KuzushiWidget);
```

**r2wc handles**:
- Attribute → Prop conversion
- Prop type coercion (string, number, boolean, json)
- React rendering lifecycle
- Shadow DOM creation
- Event listeners

---

### 4. Command Queue Pattern

Used in `snippet.ts` for async loading:

```javascript
// Before widget loads: queue commands
window.Kuzushi = function(...args) {
  api.q.push({ method: args[0], args: args.slice(1) });
};

// After widget loads: process queue
api.q.forEach(cmd => {
  if (typeof widget[cmd.method] === 'function') {
    widget[cmd.method](...cmd.args);
  }
});
```

**Benefits**:
- Users can call API immediately
- No race conditions
- Segment/Intercom pattern
- Minimal blocking

---

### 5. Dynamic Import

Used for code splitting:

```javascript
// Lazy load widget only when needed
const { WidgetApp } = await import('@kuzushi/widget');
```

**Benefits**:
- Smaller initial bundle
- Faster page load
- Load on demand
- Better performance

---

### 6. CSS-in-JS with Constructable Stylesheets

Modern approach to inject styles:

```javascript
const sheet = new CSSStyleSheet();
sheet.replaceSync(widgetStyles);
shadowRoot.adoptedStyleSheets = [sheet];

// Fallback for older browsers
if (!('adoptedStyleSheets' in Document.prototype)) {
  const styleEl = document.createElement('style');
  styleEl.textContent = widgetStyles;
  shadowRoot.appendChild(styleEl);
}
```

**Benefits**:
- Better performance than `<style>` tags
- Reusable stylesheets
- Dynamic updates
- Memory efficient

---

## Usage Examples

### Example 1: Snippet + Loader (Production Recommended)

**Host page**:
```html
<!DOCTYPE html>
<html>
<head>
  <script>
    window.KuzushiConfig = {
      projectId: 'proj_abc123',
      apiBaseUrl: 'https://api.kuzushi.ai'
    };
  </script>
  <script src="https://cdn.kuzushi.ai/widget/v1/snippet.js" async></script>
</head>
<body>
  <h1>My Website</h1>

  <!-- Widget loads automatically -->

  <script>
    // Can call API immediately (queued if not loaded)
    Kuzushi('show');
  </script>
</body>
</html>
```

---

### Example 2: Standalone Bundle

**Host page**:
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Load React from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Load standalone widget -->
  <script src="https://cdn.kuzushi.ai/widget/v1/standalone.js"></script>
</head>
<body>
  <h1>My Website</h1>

  <!-- Declarative widget placement -->
  <kuzushi-widget
    project-id="proj_abc123"
    api-base-url="https://api.kuzushi.ai">
  </kuzushi-widget>
</body>
</html>
```

---

### Example 3: Manual Custom Element

**Host page**:
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.kuzushi.ai/widget/v1/widget-loader.js"></script>
</head>
<body>
  <h1>My Website</h1>

  <div id="widget-container"></div>

  <script>
    // Programmatic insertion
    const widget = document.createElement('kuzushi-widget');
    widget.setAttribute('project-id', 'proj_abc123');
    widget.setAttribute('api-base-url', 'https://api.kuzushi.ai');

    document.getElementById('widget-container').appendChild(widget);
  </script>
</body>
</html>
```

---

### Example 4: Multiple Widgets on Same Page

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.kuzushi.ai/widget/v1/standalone.js"></script>
</head>
<body>
  <!-- Widget 1: Customer Support -->
  <kuzushi-widget
    project-id="proj_support"
    api-base-url="https://api.kuzushi.ai">
  </kuzushi-widget>

  <!-- Widget 2: Sales Assistant -->
  <kuzushi-widget
    project-id="proj_sales"
    api-base-url="https://api.kuzushi.ai">
  </kuzushi-widget>

  <!-- Each widget:
    - Has its own session
    - Is isolated in Shadow DOM
    - Has independent state
  -->
</body>
</html>
```

---

## Key Takeaways

1. **Multiple Loading Strategies**: Snippet (async) vs Standalone (sync) vs Manual
2. **Web Components**: Standard, framework-agnostic, works anywhere
3. **Shadow DOM**: Style isolation prevents CSS conflicts
4. **r2wc**: Converts React components to Web Components automatically
5. **Session Management**: Backend initializes each widget instance
6. **Dynamic Import**: Lazy loads widget for better performance
7. **Command Queue**: Allows immediate API calls before widget loads
8. **Build System**: Two separate Vite configs for different bundles
9. **Integration**: Works with `@kuzushi/widget` React app package

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Web Components | Framework-agnostic, standard, widely supported |
| Shadow DOM | CSS isolation from host page |
| r2wc library | Simplifies React → Web Component conversion |
| Multiple loaders | Different use cases (snippet, standalone, manual) |
| Dynamic imports | Reduce initial bundle size |
| Command queue | Prevent race conditions, improve UX |
| TypeScript | Type safety, better DX |
| Vite | Fast builds, modern tooling |
| Tailwind CSS | Utility-first, easy theming |

---

## Performance Considerations

1. **Snippet size**: < 2KB gzipped (critical for page load)
2. **Loader size**: ~50KB (lazy loaded after page render)
3. **Widget bundle**: Variable (dynamic import, not blocking)
4. **Constructable Stylesheets**: Faster than `<style>` tag injection
5. **Shadow DOM**: Minimal overhead, better isolation
6. **Code splitting**: Dynamic import delays widget load until needed

---

## Security Considerations

1. **Shadow DOM**: Prevents CSS injection attacks
2. **Session validation**: Backend validates all session init requests
3. **Origin checking**: Can restrict to allowed domains
4. **XSS protection**: React automatically escapes content
5. **CSP compatibility**: Works with Content Security Policy
6. **No eval()**: No dynamic code execution

---

## Browser Compatibility

- **Custom Elements**: All modern browsers (IE11 needs polyfill)
- **Shadow DOM**: All modern browsers (IE11 needs polyfill)
- **Constructable Stylesheets**: Chrome 73+, Safari 16.4+, Firefox 101+
- **Dynamic Import**: All modern browsers (IE11 not supported)
- **Fallbacks**: Provided for older browsers where possible

---

## Future Enhancements

1. **Lazy hydration**: Delay React hydration until user interaction
2. **Service worker**: Offline support and caching
3. **Progressive loading**: Load features incrementally
4. **A/B testing**: Built-in experimentation framework
5. **Analytics**: Track widget usage and performance
6. **Error boundaries**: Better error handling and recovery
7. **Internationalization**: Multi-language support
8. **Accessibility**: WCAG 2.1 AA compliance

---

## Conclusion

The `@kuzushi/widget-loader` package provides a robust, flexible, and performant solution for embedding React-based widgets into any website. By leveraging Web Components, Shadow DOM, and modern JavaScript patterns, it achieves:

- **Universal compatibility** (works anywhere HTML works)
- **Style isolation** (no CSS conflicts)
- **Performance** (async loading, code splitting)
- **Developer experience** (multiple integration options)
- **Production-ready** (error handling, loading states, security)

The architecture supports multiple loading strategies to accommodate different use cases, from simple script tags to complex integrations with command queuing and programmatic control.
