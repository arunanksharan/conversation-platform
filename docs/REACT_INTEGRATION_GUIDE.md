# Complete React Integration Guide for Kuzushi Widget

This comprehensive guide shows you how to integrate the Kuzushi AI assistant widget into any React application, from simple Create React App projects to complex enterprise applications.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Basic Integration](#basic-integration)
4. [Integration Patterns](#integration-patterns)
5. [Advanced Features](#advanced-features)
6. [State Management](#state-management)
7. [TypeScript Support](#typescript-support)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- **Node.js** 18+ installed
- **React** 18+ application
- **Backend running** at `http://localhost:3001`

### 3-Minute Integration

```bash
# 1. Install dependencies (if using the package approach)
npm install @kuzushi/widget-loader

# 2. Add TypeScript definitions (create src/types/widget.d.ts)
declare namespace JSX {
  interface IntrinsicElements {
    'kuzushi-widget': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'project-id'?: string;
        'api-base-url'?: string;
      },
      HTMLElement
    >;
  }
}

# 3. Create widget component (src/components/KuzushiWidget.tsx)
# See code below

# 4. Use in your app
import { KuzushiWidget } from './components/KuzushiWidget';

function App() {
  return <KuzushiWidget projectId="demo-support-widget" />;
}
```

---

## Installation

### Method 1: Direct Script Loading (Recommended)

No npm package needed. Load the script directly from your backend:

```tsx
import { useEffect, useState } from 'react';

function useKuzushiWidget(apiBaseUrl: string) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `${apiBaseUrl.replace('/api', '')}/static/widget-loader.js`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [apiBaseUrl]);

  return isLoaded;
}
```

### Method 2: Workspace Package (Monorepo)

If you're in the same monorepo:

```json
{
  "dependencies": {
    "@kuzushi/widget-loader": "workspace:*"
  }
}
```

---

## Basic Integration

### Step 1: Create Widget Component

Create `src/components/KuzushiWidget.tsx`:

```tsx
import { useEffect, useState } from 'react';

interface KuzushiWidgetProps {
  projectId: string;
  apiBaseUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function KuzushiWidget({
  projectId,
  apiBaseUrl = 'http://localhost:3001/api',
  className,
  style,
}: KuzushiWidgetProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if script already loaded
    const existingScript = document.querySelector(
      'script[src*="widget-loader.js"]'
    );

    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    // Load the widget loader script
    const script = document.createElement('script');
    const scriptUrl = apiBaseUrl.replace('/api', '');
    script.src = `${scriptUrl}/static/widget-loader.js`;
    script.async = true;

    script.onload = () => {
      console.log('[KuzushiWidget] Loaded successfully');
      setIsLoaded(true);
    };

    script.onerror = () => {
      console.error('[KuzushiWidget] Failed to load');
      setError('Failed to load widget. Check backend connection.');
    };

    document.body.appendChild(script);

    return () => {
      // Don't remove on unmount - may be shared across components
    };
  }, [apiBaseUrl]);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
      {!isLoaded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}>
          <div>Loading widget...</div>
        </div>
      )}
      <kuzushi-widget
        project-id={projectId}
        api-base-url={apiBaseUrl}
        className={className}
        style={{
          display: isLoaded ? 'block' : 'none',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
```

### Step 2: Add TypeScript Support

Create `src/types/widget.d.ts`:

```typescript
declare namespace JSX {
  interface IntrinsicElements {
    'kuzushi-widget': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'project-id'?: string;
        'api-base-url'?: string;
      },
      HTMLElement
    >;
  }
}
```

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  },
  "include": ["src", "src/types"]
}
```

### Step 3: Use in Your App

```tsx
import { KuzushiWidget } from './components/KuzushiWidget';

function App() {
  return (
    <div className="app">
      <header>
        <h1>My Application</h1>
      </header>

      <main>
        <div style={{ height: '600px' }}>
          <KuzushiWidget
            projectId="demo-support-widget"
            apiBaseUrl="http://localhost:3001/api"
          />
        </div>
      </main>
    </div>
  );
}

export default App;
```

---

## Integration Patterns

### Pattern 1: Always-On Embedded Widget

Widget is always visible as part of your UI:

```tsx
function Dashboard() {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        {/* Your sidebar content */}
      </aside>

      <main className="content">
        {/* Your main content */}
      </main>

      <aside className="assistant">
        <KuzushiWidget
          projectId="demo-support-widget"
          style={{ height: '100vh' }}
        />
      </aside>
    </div>
  );
}
```

### Pattern 2: Modal/Popup Widget

Widget appears on-demand:

```tsx
import { useState } from 'react';
import { KuzushiWidget } from './components/KuzushiWidget';

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        💬 Get Help
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>AI Assistant</h2>
              <button onClick={() => setIsOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <KuzushiWidget projectId="demo-support-widget" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

### Pattern 3: Floating Chat Button

Common chat bubble UX pattern:

```tsx
function FloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="floating-chat">
      {!isExpanded ? (
        <button
          className="chat-bubble"
          onClick={() => setIsExpanded(true)}
        >
          💬
        </button>
      ) : (
        <div className="chat-window">
          <div className="chat-header">
            <span>AI Assistant</span>
            <button onClick={() => setIsExpanded(false)}>−</button>
          </div>
          <div className="chat-body">
            <KuzushiWidget
              projectId="demo-support-widget"
              style={{ height: '500px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

CSS:

```css
.floating-chat {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
}

.chat-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #667eea;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
}

.chat-bubble:hover {
  transform: scale(1.1);
}

.chat-window {
  width: 400px;
  height: 600px;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 1rem;
  background: #667eea;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-body {
  flex: 1;
  overflow: hidden;
}
```

### Pattern 4: Conditional Loading

Load widget only when user navigates to a specific route:

```tsx
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const HelpPage = lazy(() => import('./pages/HelpPage'));

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/help"
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <HelpPage />
          </Suspense>
        }
      />
    </Routes>
  );
}

// pages/HelpPage.tsx
import { KuzushiWidget } from '../components/KuzushiWidget';

export default function HelpPage() {
  return (
    <div className="help-page">
      <h1>Help & Support</h1>
      <KuzushiWidget projectId="demo-support-widget" />
    </div>
  );
}
```

---

## Advanced Features

### Event Handling

Listen to widget events (if your widget emits them):

```tsx
import { useEffect, useRef } from 'react';

function ChatWidget() {
  const widgetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      console.log('Widget message:', event.detail);
      // Handle message, update analytics, etc.
    };

    const handleError = (event: CustomEvent) => {
      console.error('Widget error:', event.detail);
      // Show user notification, log to error tracking, etc.
    };

    window.addEventListener('widget:message', handleMessage as EventListener);
    window.addEventListener('widget:error', handleError as EventListener);

    return () => {
      window.removeEventListener('widget:message', handleMessage as EventListener);
      window.removeEventListener('widget:error', handleError as EventListener);
    };
  }, []);

  return (
    <kuzushi-widget
      ref={widgetRef}
      project-id="demo-support-widget"
      api-base-url="http://localhost:3001/api"
    />
  );
}
```

### Dynamic Project ID

Switch between different widget configurations:

```tsx
function MultiTenantApp() {
  const [tenant, setTenant] = useState<'sales' | 'support'>('support');

  const projectIds = {
    sales: 'sales-assistant',
    support: 'demo-support-widget',
  };

  return (
    <>
      <select value={tenant} onChange={(e) => setTenant(e.target.value as any)}>
        <option value="support">Support</option>
        <option value="sales">Sales</option>
      </select>

      <KuzushiWidget
        key={tenant} // Force remount on change
        projectId={projectIds[tenant]}
      />
    </>
  );
}
```

### Environment-Based Configuration

```tsx
// src/config/widget.ts
export const widgetConfig = {
  projectId: import.meta.env.VITE_WIDGET_PROJECT_ID || 'demo-support-widget',
  apiBaseUrl: import.meta.env.VITE_WIDGET_API_URL || 'http://localhost:3001/api',
};

// src/App.tsx
import { widgetConfig } from './config/widget';

function App() {
  return <KuzushiWidget {...widgetConfig} />;
}
```

`.env.local`:
```env
VITE_WIDGET_PROJECT_ID=demo-support-widget
VITE_WIDGET_API_URL=http://localhost:3001/api
```

`.env.production`:
```env
VITE_WIDGET_PROJECT_ID=production-widget
VITE_WIDGET_API_URL=https://api.yourdomain.com/api
```

---

## State Management

### With React Context

```tsx
// contexts/WidgetContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface WidgetContextType {
  isOpen: boolean;
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
}

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

export function WidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <WidgetContext.Provider
      value={{
        isOpen,
        openWidget: () => setIsOpen(true),
        closeWidget: () => setIsOpen(false),
        toggleWidget: () => setIsOpen(!isOpen),
      }}
    >
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidget() {
  const context = useContext(WidgetContext);
  if (!context) throw new Error('useWidget must be used within WidgetProvider');
  return context;
}

// App.tsx
function App() {
  return (
    <WidgetProvider>
      <Layout />
      <FloatingChatButton />
    </WidgetProvider>
  );
}

// FloatingChatButton.tsx
function FloatingChatButton() {
  const { isOpen, toggleWidget } = useWidget();

  return (
    <>
      <button onClick={toggleWidget}>💬</button>
      {isOpen && <KuzushiWidget projectId="demo-support-widget" />}
    </>
  );
}
```

### With Redux

```tsx
// store/widgetSlice.ts
import { createSlice } from '@reduxjs/toolkit';

interface WidgetState {
  isOpen: boolean;
  projectId: string;
}

const widgetSlice = createSlice({
  name: 'widget',
  initialState: {
    isOpen: false,
    projectId: 'demo-support-widget',
  } as WidgetState,
  reducers: {
    openWidget: (state) => {
      state.isOpen = true;
    },
    closeWidget: (state) => {
      state.isOpen = false;
    },
    setProjectId: (state, action) => {
      state.projectId = action.payload;
    },
  },
});

export const { openWidget, closeWidget, setProjectId } = widgetSlice.actions;
export default widgetSlice.reducer;

// Component
import { useDispatch, useSelector } from 'react-redux';
import { openWidget, closeWidget } from './store/widgetSlice';

function ChatButton() {
  const dispatch = useDispatch();
  const { isOpen, projectId } = useSelector((state) => state.widget);

  return (
    <>
      <button onClick={() => dispatch(openWidget())}>Open Chat</button>
      {isOpen && (
        <KuzushiWidget
          projectId={projectId}
          onClose={() => dispatch(closeWidget())}
        />
      )}
    </>
  );
}
```

---

## TypeScript Support

### Complete Type Definitions

```typescript
// src/types/widget.d.ts

// Custom element definition
declare namespace JSX {
  interface IntrinsicElements {
    'kuzushi-widget': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & KuzushiWidgetAttributes,
      HTMLElement
    >;
  }
}

// Widget attributes
interface KuzushiWidgetAttributes {
  'project-id'?: string;
  'api-base-url'?: string;
}

// Widget events (if your widget emits custom events)
interface WidgetMessageEvent extends CustomEvent {
  detail: {
    type: 'message' | 'error' | 'ready';
    payload: any;
  };
}

declare global {
  interface WindowEventMap {
    'widget:message': WidgetMessageEvent;
    'widget:error': WidgetMessageEvent;
    'widget:ready': WidgetMessageEvent;
  }
}

export {};
```

### Typed Component Props

```typescript
// src/components/KuzushiWidget.tsx
interface KuzushiWidgetProps {
  /** Project ID from backend configuration */
  projectId: string;

  /** Backend API base URL */
  apiBaseUrl?: string;

  /** Optional CSS class name */
  className?: string;

  /** Optional inline styles */
  style?: React.CSSProperties;

  /** Callback when widget is loaded */
  onLoad?: () => void;

  /** Callback when widget fails to load */
  onError?: (error: string) => void;
}

export function KuzushiWidget({
  projectId,
  apiBaseUrl = 'http://localhost:3001/api',
  className,
  style,
  onLoad,
  onError,
}: KuzushiWidgetProps) {
  // Implementation...
}
```

---

## Testing

### Unit Testing

```tsx
// KuzushiWidget.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { KuzushiWidget } from './KuzushiWidget';

describe('KuzushiWidget', () => {
  it('shows loading state initially', () => {
    render(<KuzushiWidget projectId="test-project" />);
    expect(screen.getByText(/loading widget/i)).toBeInTheDocument();
  });

  it('loads widget script', async () => {
    render(<KuzushiWidget projectId="test-project" />);

    await waitFor(() => {
      const script = document.querySelector('script[src*="widget-loader.js"]');
      expect(script).toBeInTheDocument();
    });
  });

  it('renders custom element with correct props', async () => {
    render(
      <KuzushiWidget
        projectId="test-project"
        apiBaseUrl="http://localhost:3001/api"
      />
    );

    // Trigger script load
    const script = document.querySelector('script[src*="widget-loader.js"]');
    script?.dispatchEvent(new Event('load'));

    await waitFor(() => {
      const widget = document.querySelector('kuzushi-widget');
      expect(widget).toHaveAttribute('project-id', 'test-project');
      expect(widget).toHaveAttribute('api-base-url', 'http://localhost:3001/api');
    });
  });
});
```

### Integration Testing

```tsx
// App.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Integration', () => {
  it('opens widget when button is clicked', async () => {
    render(<App />);

    const button = screen.getByText(/open chat/i);
    fireEvent.click(button);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
```

---

## Production Deployment

### Build Optimization

```bash
# Vite
npm run build

# Create React App
npm run build

# Analyze bundle size
npm install --save-dev vite-bundle-visualizer
```

### Environment Configuration

Production `.env`:

```env
VITE_WIDGET_PROJECT_ID=production-widget-id
VITE_WIDGET_API_URL=https://api.yourdomain.com/api
VITE_APP_ENV=production
```

### CDN Deployment

```tsx
// Use CDN for widget loader in production
const getWidgetLoaderUrl = () => {
  if (import.meta.env.PROD) {
    return 'https://cdn.yourdomain.com/widget-loader.js';
  }
  return 'http://localhost:3001/static/widget-loader.js';
};
```

---

## Troubleshooting

### Widget Not Loading

**Symptoms:** Loading spinner never disappears

**Solutions:**
1. Check backend is running: `curl http://localhost:3001/health`
2. Check browser console for CORS errors
3. Verify script URL is correct

```tsx
// Add debugging
useEffect(() => {
  const script = document.createElement('script');
  script.src = `${apiBaseUrl}/static/widget-loader.js`;

  script.onload = () => console.log('✅ Script loaded');
  script.onerror = (e) => console.error('❌ Script failed:', e);

  document.body.appendChild(script);
}, [apiBaseUrl]);
```

### React StrictMode Issues

**Problem:** Script loads twice in development

**Solution:** Track loading state globally

```tsx
let scriptLoading = false;
let scriptLoaded = false;

function useKuzushiWidget(apiBaseUrl: string) {
  const [isLoaded, setIsLoaded] = useState(scriptLoaded);

  useEffect(() => {
    if (scriptLoaded) {
      setIsLoaded(true);
      return;
    }

    if (scriptLoading) {
      return;
    }

    scriptLoading = true;
    const script = document.createElement('script');
    // ... rest of implementation
  }, [apiBaseUrl]);

  return isLoaded;
}
```

### Memory Leaks

**Problem:** Multiple script instances

**Solution:** Proper cleanup

```tsx
useEffect(() => {
  let script: HTMLScriptElement | null = null;

  const loadScript = () => {
    script = document.createElement('script');
    // ... load script
  };

  loadScript();

  return () => {
    if (script && document.body.contains(script)) {
      document.body.removeChild(script);
    }
  };
}, []);
```

---

## Complete Working Example

See the full working example in:
- **Code:** [`examples/react-integration/`](./examples/react-integration/)
- **Live Demo:** Run `cd examples/react-integration && pnpm dev`

---

## Next Steps

- ✅ Try the [React example project](./examples/react-integration/)
- ✅ Explore [Next.js integration](./NEXTJS_INTEGRATION_GUIDE.md)
- ✅ Read [Main Integration Guide](./INTEGRATION_GUIDE.md)
- ✅ Check [Backend Documentation](./packages/backend/README.md)

---

**Questions?** Check our [Troubleshooting Guide](./INTEGRATION_GUIDE.md#troubleshooting) or open an issue.
