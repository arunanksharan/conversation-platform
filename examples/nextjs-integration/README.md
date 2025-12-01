# Kuzushi Widget - Next.js Integration Example

This is a complete, production-ready example of integrating the Kuzushi AI assistant widget into a Next.js 14+ application using the App Router.

## 🚀 Quick Start

### Prerequisites

1. **Backend must be running:**
   ```bash
   cd ../../packages/backend
   pnpm install
   pnpm run db:migrate
   pnpm run db:seed
   pnpm run start:dev
   ```

2. **Widget packages must be built:**
   ```bash
   cd ../..  # Back to repo root
   pnpm build
   ```

### Run This Example

```bash
# From this directory
pnpm install
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

---

## 📋 What's Included

This example demonstrates **three integration patterns** for Next.js App Router:

### 1. 📦 Client-Side Embedded (`/embedded`)

The simplest approach - widget as a client component.

**Use case:** Main application feature, always-visible assistant

**File:** `app/embedded/page.tsx`

**Key points:**
- Page can be Server Component or Client Component
- Widget wrapper is Client Component
- Clean separation of concerns

### 2. 💬 Modal Widget (`/modal`)

Shows the widget on-demand in a modal/overlay.

**Use case:** Chat popup, help button, contextual assistance

**File:** `app/modal/page.tsx`

**Key points:**
- Conditional rendering
- State management with useState
- Responsive modal design

### 3. 🚀 SSR Integration (`/ssr`)

Server-side rendering with data fetching.

**Use case:** Passing server-side data, SEO optimization, secure config

**File:** `app/ssr/page.tsx`

**Key points:**
- Server Component page
- Client Component widget
- Props passed from server to client

---

## 🏗️ Project Structure

```
examples/nextjs-integration/
├── app/
│   ├── embedded/
│   │   └── page.tsx          # Pattern 1: Simple embedding
│   ├── modal/
│   │   └── page.tsx          # Pattern 2: Modal widget
│   ├── ssr/
│   │   └── page.tsx          # Pattern 3: SSR integration
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page with navigation
│   └── globals.css           # Global styles
├── components/
│   ├── KuzushiWidget.tsx     # Client component wrapper
│   └── ModalWidget.tsx       # Modal implementation
├── global.d.ts               # TypeScript definitions
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Integration Guide

### Step 1: Install Next.js

```bash
npx create-next-app@latest my-app
cd my-app
```

### Step 2: Add TypeScript Definitions

Create `global.d.ts` in your project root:

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

### Step 3: Create Widget Wrapper Component

Create `components/KuzushiWidget.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

interface KuzushiWidgetProps {
  projectId: string;
  apiBaseUrl: string;
}

export function KuzushiWidget({ projectId, apiBaseUrl }: KuzushiWidgetProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if already loaded
    const existing = document.querySelector('script[src*="widget-loader.js"]');
    if (existing) {
      setIsLoaded(true);
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = `${apiBaseUrl.replace('/api', '')}/static/widget-loader.js`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);
  }, [apiBaseUrl]);

  if (!isLoaded) {
    return <div>Loading widget...</div>;
  }

  return (
    <kuzushi-widget
      project-id={projectId}
      api-base-url={apiBaseUrl}
      style={{ width: '100%', height: '600px' }}
    />
  );
}
```

### Step 4: Use in Your Pages

#### Option A: Server Component Page (Recommended)

```tsx
// app/page.tsx (Server Component - default)
import { KuzushiWidget } from '@/components/KuzushiWidget';

export default function HomePage() {
  return (
    <div>
      <h1>My App</h1>
      <KuzushiWidget
        projectId="demo-support-widget"
        apiBaseUrl="http://localhost:3001/api"
      />
    </div>
  );
}
```

#### Option B: Client Component Page

```tsx
// app/page.tsx
'use client';

import { KuzushiWidget } from '@/components/KuzushiWidget';

export default function HomePage() {
  return (
    <div>
      <h1>My App</h1>
      <KuzushiWidget
        projectId="demo-support-widget"
        apiBaseUrl="http://localhost:3001/api"
      />
    </div>
  );
}
```

---

## 🎨 Styling

The widget uses Shadow DOM for complete style isolation. You can style the container:

```tsx
<div style={{ width: '100%', height: '600px', borderRadius: '1rem' }}>
  <KuzushiWidget ... />
</div>
```

Or use CSS modules:

```css
/* styles/widget.module.css */
.widgetContainer {
  width: 100%;
  height: 600px;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

```tsx
import styles from './styles/widget.module.css';

<div className={styles.widgetContainer}>
  <KuzushiWidget ... />
</div>
```

---

## 🌍 Environment Variables

This example includes `.env.example` for configuration. Copy it to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:

```env
# Development
NEXT_PUBLIC_WIDGET_PROJECT_ID=demo-support-widget
NEXT_PUBLIC_WIDGET_API_URL=http://localhost:3001/api

# Production
# NEXT_PUBLIC_WIDGET_PROJECT_ID=your-production-project-id
# NEXT_PUBLIC_WIDGET_API_URL=https://api.yourdomain.com/api
```

Use in components:

```tsx
<KuzushiWidget
  projectId={process.env.NEXT_PUBLIC_WIDGET_PROJECT_ID!}
  apiBaseUrl={process.env.NEXT_PUBLIC_WIDGET_API_URL!}
/>
```

**Note:** The `KuzushiWidget` component in this example already uses environment variables as defaults, so you can omit props if you set the env vars:

```tsx
// Props are optional if env vars are set
<KuzushiWidget />
```

---

## 🐛 Troubleshooting

### Hydration Errors

**Problem:** "Text content does not match server-rendered HTML"

**Solution:** Ensure widget wrapper is a Client Component with 'use client'

```tsx
// ✅ Correct
'use client';
export function KuzushiWidget() { ... }

// ❌ Wrong - causes hydration mismatch
export function KuzushiWidget() { ... }
```

### Script Not Loading

**Problem:** Widget doesn't appear

**Solutions:**
1. Check backend is running: `curl http://localhost:3001/health`
2. Check browser console for errors
3. Verify CORS settings in backend `.env`:
   ```env
   CORS_ORIGINS="http://localhost:3002"
   ```

### TypeScript Errors

**Problem:** Type errors with custom element

**Solution:** Ensure `global.d.ts` is included:

```json
// tsconfig.json
{
  "include": ["global.d.ts", "**/*.ts", "**/*.tsx"],
  ...
}
```

### Widget Renders Multiple Times

**Problem:** Widget script loads multiple times

**Solution:** Add script check in useEffect:

```tsx
useEffect(() => {
  const existing = document.querySelector('script[src*="widget-loader.js"]');
  if (existing) {
    setIsLoaded(true);
    return;
  }
  // ... load script
}, []);
```

---

## 🚢 Production Deployment

### 1. Update Environment Variables

Create `.env.production`:

```env
NEXT_PUBLIC_WIDGET_PROJECT_ID=your-production-project-id
NEXT_PUBLIC_WIDGET_API_URL=https://api.yourdomain.com/api
```

### 2. Build for Production

```bash
pnpm build
```

### 3. Deploy

#### Vercel (Recommended for Next.js)

```bash
npm i -g vercel
vercel
```

Environment variables will be automatically detected from `.env.production`.

#### Docker

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

#### Other Platforms

- **AWS Amplify:** Connect repo and deploy
- **Netlify:** Connect repo and deploy
- **Railway:** Connect repo and deploy

---

## 🔐 Security Best Practices

### 1. Environment Variables

Never expose backend secrets in `NEXT_PUBLIC_*` variables:

```env
# ✅ Safe (client-side)
NEXT_PUBLIC_WIDGET_API_URL=https://api.yourdomain.com/api

# ❌ Unsafe (don't use NEXT_PUBLIC_ for secrets)
NEXT_PUBLIC_DATABASE_URL=...
NEXT_PUBLIC_API_SECRET=...
```

### 2. CORS Configuration

Configure strict CORS in backend:

```env
# Backend .env
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

### 3. Content Security Policy

Add CSP headers in `next.config.js`:

```js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
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

---

## 📊 Performance Optimization

### 1. Lazy Loading

Load widget only when needed:

```tsx
'use client';

import dynamic from 'next/dynamic';

const KuzushiWidget = dynamic(
  () => import('@/components/KuzushiWidget').then((mod) => mod.KuzushiWidget),
  { ssr: false, loading: () => <div>Loading widget...</div> }
);
```

### 2. Script Strategy

Use Next.js Script component for better control:

```tsx
import Script from 'next/script';

export function KuzushiWidget() {
  return (
    <>
      <Script
        src="http://localhost:3001/static/widget-loader.js"
        strategy="lazyOnload"
        onLoad={() => console.log('Widget loaded')}
      />
      <kuzushi-widget ... />
    </>
  );
}
```

### 3. Bundle Analysis

Analyze your bundle:

```bash
npm install @next/bundle-analyzer
```

```js
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

Run: `ANALYZE=true pnpm build`

---

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Main Integration Guide](../../INTEGRATION_GUIDE.md)
- [Backend Documentation](../../packages/backend/README.md)
- [React Example](../react-integration/README.md)

---

## 🤝 Support

Having issues? Check:

1. [Troubleshooting](#troubleshooting) section above
2. [Main Integration Guide](../../INTEGRATION_GUIDE.md#troubleshooting)
3. [GitHub Issues](https://github.com/your-org/kuzushi/issues)

---

## 📝 License

See [LICENSE](../../LICENSE) in the repository root.

---

**Happy coding with Next.js!** 🎉
