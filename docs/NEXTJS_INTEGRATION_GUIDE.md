# Complete Next.js Integration Guide for Kuzushi Widget

This comprehensive guide shows you how to integrate the Kuzushi AI assistant widget into Next.js 13+ applications using the App Router, with support for both Server and Client Components.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Understanding App Router](#understanding-app-router)
4. [Basic Integration](#basic-integration)
5. [Integration Patterns](#integration-patterns)
6. [Advanced Features](#advanced-features)
7. [Server-Side Rendering](#server-side-rendering)
8. [Performance Optimization](#performance-optimization)
9. [TypeScript Support](#typescript-support)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- **Node.js** 18+ installed
- **Next.js** 14+ application
- **Backend running** at `http://localhost:3001`

### 3-Minute Integration

```bash
# 1. Create Next.js app (if starting fresh)
npx create-next-app@latest my-app
cd my-app

# 2. Add TypeScript definitions (create global.d.ts)
# See code below

# 3. Create widget component (components/KuzushiWidget.tsx)
# Must be a Client Component with 'use client'

# 4. Use in your pages
# Pages can be Server or Client Components
```

---

## Installation

### Create Next.js Project

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app
```

### No Additional Dependencies Needed

The widget is loaded via script tag - no npm packages required for basic usage.

---

## Understanding App Router

### Server vs Client Components

**Key concept in Next.js App Router:**

| Feature | Server Component | Client Component |
|---------|-----------------|------------------|
| Default | ✅ Yes | No (needs 'use client') |
| Runs on | Server | Client |
| Can fetch data | ✅ Yes | Via useEffect/SWR |
| Can use hooks | ❌ No | ✅ Yes |
| Can use browser APIs | ❌ No | ✅ Yes |

**For Kuzushi Widget:**
- **Widget wrapper MUST be Client Component** (needs DOM access)
- **Parent pages CAN be Server Components** (recommended for data fetching)

---

## Basic Integration

### Step 1: Add Type Definitions

Create `global.d.ts` in project root:

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
  "include": ["global.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

### Step 2: Create Widget Component

Create `components/KuzushiWidget.tsx`:

```tsx
'use client'; // ⚠️ REQUIRED - This makes it a Client Component

import { useEffect, useState } from 'react';

interface KuzushiWidgetProps {
  projectId: string;
  apiBaseUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function KuzushiWidget({
  projectId,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
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

    // Load widget loader script
    const script = document.createElement('script');
    const scriptUrl = apiBaseUrl.replace('/api', '');
    script.src = `${scriptUrl}/static/widget-loader.js`;
    script.async = true;

    script.onload = () => {
      console.log('[KuzushiWidget] Loaded');
      setIsLoaded(true);
    };

    script.onerror = () => {
      console.error('[KuzushiWidget] Load failed');
      setError('Failed to load widget');
    };

    document.body.appendChild(script);

    // Note: Don't remove script on unmount - may be shared across pages
  }, [apiBaseUrl]);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width: '100%', height: '100%', position: 'relative', ...style }}
    >
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

### Step 3: Use in Server Component Page (Recommended)

Create `app/page.tsx`:

```tsx
// This is a Server Component (default in App Router)
import { KuzushiWidget } from '@/components/KuzushiWidget';

export default function HomePage() {
  return (
    <main>
      <h1>Welcome to My App</h1>

      {/* Client Component embedded in Server Component */}
      <div style={{ height: '600px' }}>
        <KuzushiWidget
          projectId="demo-support-widget"
          apiBaseUrl="http://localhost:3001/api"
        />
      </div>
    </main>
  );
}
```

---

## Integration Patterns

### Pattern 1: Server Component Page + Client Widget

**Best for:** Most use cases, optimal performance

```tsx
// app/help/page.tsx (Server Component)
import { KuzushiWidget } from '@/components/KuzushiWidget';

export default async function HelpPage() {
  // Can fetch data on server
  const config = await fetchWidgetConfig();

  return (
    <div>
      <h1>Help & Support</h1>
      <KuzushiWidget projectId={config.projectId} />
    </div>
  );
}

async function fetchWidgetConfig() {
  // This runs on the server - API keys are safe
  const res = await fetch('https://api.example.com/widget-config', {
    headers: {
      'Authorization': `Bearer ${process.env.API_SECRET}`, // Safe!
    },
  });
  return res.json();
}
```

### Pattern 2: Modal Widget with Client Component

**Best for:** On-demand assistance

```tsx
// components/ModalWidget.tsx
'use client';

import { useState } from 'react';
import { KuzushiWidget } from './KuzushiWidget';

export function ModalWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        💬 Get Help
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsOpen(false)}>×</button>
            <KuzushiWidget projectId="demo-support-widget" />
          </div>
        </div>
      )}
    </>
  );
}

// app/page.tsx (Server Component)
import { ModalWidget } from '@/components/ModalWidget';

export default function HomePage() {
  return (
    <>
      <h1>My App</h1>
      <ModalWidget /> {/* Client Component */}
    </>
  );
}
```

### Pattern 3: Route-Based Loading

**Best for:** Help/support pages

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}

// app/help/page.tsx
import { KuzushiWidget } from '@/components/KuzushiWidget';

export default function HelpPage() {
  return (
    <div className="help-page">
      <aside className="sidebar">
        {/* Navigation */}
      </aside>

      <main>
        <KuzushiWidget
          projectId="demo-support-widget"
          style={{ height: '100vh' }}
        />
      </main>
    </div>
  );
}
```

### Pattern 4: Floating Chat Button

**Best for:** Global assistant access

```tsx
// components/FloatingChat.tsx
'use client';

import { useState } from 'react';
import { KuzushiWidget } from './KuzushiWidget';
import styles from './FloatingChat.module.css';

export function FloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.container}>
      {!isExpanded ? (
        <button
          className={styles.bubble}
          onClick={() => setIsExpanded(true)}
        >
          💬
        </button>
      ) : (
        <div className={styles.window}>
          <div className={styles.header}>
            <span>AI Assistant</span>
            <button onClick={() => setIsExpanded(false)}>−</button>
          </div>
          <div className={styles.body}>
            <KuzushiWidget projectId="demo-support-widget" />
          </div>
        </div>
      )}
    </div>
  );
}

// app/layout.tsx
import { FloatingChat } from '@/components/FloatingChat';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <FloatingChat />
      </body>
    </html>
  );
}
```

---

## Advanced Features

### Using Next.js Script Component

For better control over script loading:

```tsx
// components/KuzushiWidget.tsx
'use client';

import { useState } from 'react';
import Script from 'next/script';

export function KuzushiWidget({ projectId, apiBaseUrl }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <>
      <Script
        src={`${apiBaseUrl.replace('/api', '')}/static/widget-loader.js`}
        strategy="lazyOnload"
        onLoad={() => setIsLoaded(true)}
        onError={() => console.error('Widget failed to load')}
      />

      {isLoaded && (
        <kuzushi-widget
          project-id={projectId}
          api-base-url={apiBaseUrl}
        />
      )}
    </>
  );
}
```

### Dynamic Imports (Code Splitting)

Load widget only when needed:

```tsx
// app/help/page.tsx
import dynamic from 'next/dynamic';

const KuzushiWidget = dynamic(
  () => import('@/components/KuzushiWidget').then((mod) => mod.KuzushiWidget),
  {
    ssr: false, // Don't render on server
    loading: () => <div>Loading widget...</div>,
  }
);

export default function HelpPage() {
  return <KuzushiWidget projectId="demo-support-widget" />;
}
```

### Environment Variables

```tsx
// .env.local
NEXT_PUBLIC_WIDGET_PROJECT_ID=demo-support-widget
NEXT_PUBLIC_WIDGET_API_URL=http://localhost:3001/api

// .env.production
NEXT_PUBLIC_WIDGET_PROJECT_ID=production-widget
NEXT_PUBLIC_WIDGET_API_URL=https://api.yourdomain.com/api

// components/KuzushiWidget.tsx
export function KuzushiWidget() {
  return (
    <kuzushi-widget
      project-id={process.env.NEXT_PUBLIC_WIDGET_PROJECT_ID}
      api-base-url={process.env.NEXT_PUBLIC_WIDGET_API_URL}
    />
  );
}
```

---

## Server-Side Rendering

### Fetching Config on Server

```tsx
// app/chat/page.tsx
import { KuzushiWidget } from '@/components/KuzushiWidget';

async function getWidgetConfig(userId: string) {
  // This runs on the server - secure!
  const res = await fetch(`https://api.example.com/users/${userId}/widget-config`, {
    headers: {
      'Authorization': `Bearer ${process.env.API_SECRET}`,
    },
  });

  return res.json();
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  const userId = searchParams.userId || 'default';
  const config = await getWidgetConfig(userId);

  return (
    <div>
      <h1>Chat with {config.assistantName}</h1>
      <KuzushiWidget
        projectId={config.projectId}
        apiBaseUrl={config.apiBaseUrl}
      />
    </div>
  );
}
```

### Streaming SSR

```tsx
// app/support/page.tsx
import { Suspense } from 'react';
import { KuzushiWidget } from '@/components/KuzushiWidget';

async function WidgetWrapper() {
  // Simulate slow data fetch
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return <KuzushiWidget projectId="demo-support-widget" />;
}

export default function SupportPage() {
  return (
    <div>
      <h1>Support</h1>

      <Suspense fallback={<div>Loading support assistant...</div>}>
        <WidgetWrapper />
      </Suspense>
    </div>
  );
}
```

### Database Integration

```tsx
// app/chat/[userId]/page.tsx
import { KuzushiWidget } from '@/components/KuzushiWidget';
import { prisma } from '@/lib/prisma';

export default async function UserChatPage({
  params,
}: {
  params: { userId: string };
}) {
  // Query database on server
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { widgetConfig: true },
  });

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>Chat for {user.name}</h1>
      <KuzushiWidget
        projectId={user.widgetConfig.projectId}
        apiBaseUrl={user.widgetConfig.apiBaseUrl}
      />
    </div>
  );
}
```

---

## Performance Optimization

### 1. Lazy Loading

```tsx
import dynamic from 'next/dynamic';

const KuzushiWidget = dynamic(
  () => import('@/components/KuzushiWidget').then((mod) => mod.KuzushiWidget),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);
```

### 2. Route-Based Code Splitting

```tsx
// app/layout.tsx - No widget here
export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}

// app/help/page.tsx - Widget only loads on /help route
import { KuzushiWidget } from '@/components/KuzushiWidget';

export default function HelpPage() {
  return <KuzushiWidget projectId="demo-support-widget" />;
}
```

### 3. Preloading Script

```tsx
// app/layout.tsx
import { headers } from 'next/headers';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* Preload widget script on help pages */}
        <link
          rel="preload"
          href="http://localhost:3001/static/widget-loader.js"
          as="script"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 4. Bundle Analysis

```bash
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your config
});

# Analyze
ANALYZE=true npm run build
```

---

## TypeScript Support

### Complete Type Safety

```typescript
// global.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    'kuzushi-widget': KuzushiWidgetElement;
  }
}

interface KuzushiWidgetElement
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  'project-id'?: string;
  'api-base-url'?: string;
}

// Widget events
interface WidgetEventDetail {
  type: 'ready' | 'message' | 'error';
  data: any;
}

declare global {
  interface WindowEventMap {
    'widget:ready': CustomEvent<WidgetEventDetail>;
    'widget:message': CustomEvent<WidgetEventDetail>;
    'widget:error': CustomEvent<WidgetEventDetail>;
  }
}

export {};
```

### Typed Props Component

```typescript
// components/KuzushiWidget.tsx
'use client';

interface KuzushiWidgetProps {
  /** Project ID from backend config */
  projectId: string;

  /** Backend API base URL */
  apiBaseUrl?: string;

  /** Optional CSS class */
  className?: string;

  /** Optional inline styles */
  style?: React.CSSProperties;

  /** Callback when loaded */
  onLoad?: () => void;

  /** Callback on error */
  onError?: (error: Error) => void;
}

export function KuzushiWidget(props: KuzushiWidgetProps) {
  // Implementation with full type safety
}
```

---

## Production Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_WIDGET_PROJECT_ID=production-widget
# NEXT_PUBLIC_WIDGET_API_URL=https://api.yourdomain.com/api
```

### Docker

```dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_PUBLIC_WIDGET_PROJECT_ID=production-widget
ENV NEXT_PUBLIC_WIDGET_API_URL=https://api.yourdomain.com/api

RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### AWS Amplify

```yaml
# amplify.yml
version: 1
applications:
  - appRoot: /
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```

---

## Troubleshooting

### Hydration Mismatch Errors

**Problem:** "Text content does not match server-rendered HTML"

**Cause:** Widget wrapper missing 'use client' directive

**Solution:**

```tsx
// ✅ Correct
'use client';
export function KuzushiWidget() { ... }

// ❌ Wrong
export function KuzushiWidget() { ... }
```

### Script Loading Issues

**Problem:** Widget doesn't load in production

**Solutions:**

1. **Check CSP headers:**

```tsx
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "connect-src 'self' https://api.yourdomain.com wss://api.yourdomain.com"
          },
        ],
      },
    ];
  },
};
```

2. **Verify environment variables:**

```bash
# Check build output
npm run build

# Should see:
# Environment Variables:
# - NEXT_PUBLIC_WIDGET_API_URL
```

### Server Component Restrictions

**Problem:** "You're importing a component that needs useState"

**Cause:** Using widget directly in Server Component

**Solution:** Widget wrapper must be Client Component:

```tsx
// components/KuzushiWidget.tsx
'use client'; // ⬅️ Add this!

export function KuzushiWidget() { ... }
```

### Dynamic Import Issues

**Problem:** Widget doesn't load with dynamic import

**Solution:**

```tsx
// ✅ Correct
const KuzushiWidget = dynamic(
  () => import('@/components/KuzushiWidget').then(mod => mod.KuzushiWidget),
  { ssr: false }
);

// ❌ Wrong - default export mismatch
const KuzushiWidget = dynamic(
  () => import('@/components/KuzushiWidget'),
  { ssr: false }
);
```

---

## Complete Working Example

See the full working example in:
- **Code:** [`examples/nextjs-integration/`](./examples/nextjs-integration/)
- **Live Demo:** Run `cd examples/nextjs-integration && pnpm dev`
- **Open:** [http://localhost:3002](http://localhost:3002)

---

## Key Takeaways

✅ **DO:**
- Use 'use client' for widget wrapper component
- Keep parent pages as Server Components when possible
- Use environment variables for configuration
- Leverage Next.js Script component for optimization
- Test hydration thoroughly

❌ **DON'T:**
- Try to render widget in Server Component
- Forget 'use client' directive
- Hardcode API URLs (use env vars)
- Skip TypeScript definitions
- Ignore hydration warnings

---

## Next Steps

- ✅ Try the [Next.js example project](./examples/nextjs-integration/)
- ✅ Explore [React integration](./REACT_INTEGRATION_GUIDE.md)
- ✅ Read [Main Integration Guide](./INTEGRATION_GUIDE.md)
- ✅ Check [Backend Documentation](./packages/backend/README.md)

---

**Questions?** Check our [Troubleshooting Guide](./INTEGRATION_GUIDE.md#troubleshooting) or open an issue.
