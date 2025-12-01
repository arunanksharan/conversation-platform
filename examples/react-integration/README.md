# Kuzushi Widget - React Integration Example

This is a complete, production-ready example of integrating the Kuzushi AI assistant widget into a React application built with Vite.

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

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 What's Included

This example demonstrates **three integration patterns**:

### 1. 📦 Embedded Widget (Simplest)

The most straightforward approach - just add the custom element to your JSX.

**Use case:** Main application feature, always-visible assistant

**File:** `src/components/EmbeddedWidget.tsx`

**Code:**
```tsx
import { useKuzushiWidget } from '../hooks/useKuzushiWidget';

function MyComponent() {
  const isLoaded = useKuzushiWidget();

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

**What's happening:**
- `useKuzushiWidget()` hook loads the script once (shared across all components)
- Returns `isLoaded` boolean when script is ready
- Shows loading state until widget is ready

### 2. 💬 Modal Widget

Shows the widget on-demand in a modal/overlay.

**Use case:** Chat popup, help button, contextual assistance

**File:** `src/components/ModalWidget.tsx`

**Code:**
```tsx
import { useState } from 'react';
import { useKuzushiWidget } from '../hooks/useKuzushiWidget';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const isLoaded = useKuzushiWidget();

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open AI Assistant
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsOpen(false)}>×</button>
            {!isLoaded && <div>Loading widget...</div>}
            <kuzushi-widget
              project-id="demo-support-widget"
              api-base-url="http://localhost:3001/api"
              style={{ display: isLoaded ? 'block' : 'none' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
```

**Benefits:**
- Widget script loads once, even with multiple modals
- Loading state handles script load time
- Click outside to close modal

### 3. ⚙️ Advanced Integration

Demonstrates advanced features like event handling and dynamic configuration.

**Use case:** Complex integrations, event-driven apps, dynamic configuration

**File:** `src/components/CustomIntegration.tsx`

**Features:**
- Dynamic project ID switching
- Event listener integration
- Ref-based widget access
- Real-time event logging

---

## 🏗️ Project Structure

```
examples/react-integration/
├── src/
│   ├── components/
│   │   ├── EmbeddedWidget.tsx    # Pattern 1: Simple embedding
│   │   ├── ModalWidget.tsx        # Pattern 2: Modal/popup
│   │   └── CustomIntegration.tsx  # Pattern 3: Advanced
│   ├── App.tsx                    # Main app with tab navigation
│   ├── App.css                    # Styling
│   ├── main.tsx                   # Entry point
│   └── vite-env.d.ts             # TypeScript definitions
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔧 Configuration

### TypeScript Support

The custom element is properly typed in `src/vite-env.d.ts`:

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

This provides full TypeScript autocomplete and type checking for the widget element.

### Environment Configuration

This example includes `.env.example` for configuration. Copy it to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Development
VITE_WIDGET_PROJECT_ID=demo-support-widget
VITE_WIDGET_API_URL=http://localhost:3001/api

# Production
# VITE_WIDGET_PROJECT_ID=your-production-project-id
# VITE_WIDGET_API_URL=https://api.yourdomain.com/api
```

Use in your code:

```tsx
const API_BASE_URL = import.meta.env.VITE_WIDGET_API_URL || 'http://localhost:3001/api';

<kuzushi-widget
  project-id={import.meta.env.VITE_WIDGET_PROJECT_ID || "demo-support-widget"}
  api-base-url={API_BASE_URL}
/>
```

**Note:** The `useKuzushiWidget` hook in this example already uses `VITE_WIDGET_API_URL`.

---

## 📚 Integration Guide

### Step 1: Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### Step 2: Add TypeScript Definitions

Create `src/vite-env.d.ts` (or add to existing):

```typescript
/// <reference types="vite/client" />

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

### Step 3: Create Widget Hook

Create `src/hooks/useKuzushiWidget.ts` to handle script loading:

```tsx
import { useEffect, useState } from 'react';

// Global state ensures script loads only once
let scriptLoading = false;
let scriptLoaded = false;
const loadCallbacks: Array<() => void> = [];

export function useKuzushiWidget(): boolean {
  const [isLoaded, setIsLoaded] = useState(scriptLoaded);

  useEffect(() => {
    if (scriptLoaded) {
      setIsLoaded(true);
      return;
    }

    if (scriptLoading) {
      const callback = () => setIsLoaded(true);
      loadCallbacks.push(callback);
      return () => {
        const index = loadCallbacks.indexOf(callback);
        if (index > -1) loadCallbacks.splice(index, 1);
      };
    }

    const existingScript = document.querySelector(
      'script[src*="widget-loader.js"]'
    );
    if (existingScript) {
      scriptLoaded = true;
      setIsLoaded(true);
      return;
    }

    scriptLoading = true;
    const script = document.createElement('script');
    script.src = 'http://localhost:3001/static/widget-loader.js';
    script.async = true;

    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      setIsLoaded(true);
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
- Loads script only once across all components
- Handles multiple widgets mounting simultaneously
- Provides loading state to all consumers
- Safe cleanup (doesn't remove shared script)

### Step 4: Use the Widget

```tsx
function App() {
  useKuzushiWidget(); // Load the script

  return (
    <div>
      <h1>My App</h1>
      <kuzushi-widget
        project-id="demo-support-widget"
        api-base-url="http://localhost:3001/api"
      />
    </div>
  );
}
```

---

## 🎨 Styling

The widget uses Shadow DOM for style isolation, so your app's CSS won't affect it. However, you can:

1. **Style the container:**
   ```css
   kuzushi-widget {
     width: 100%;
     height: 600px;
     border-radius: 1rem;
     overflow: hidden;
   }
   ```

2. **Customize via backend:**
   Widget appearance is controlled by backend configuration (see main integration guide)

---

## 🐛 Troubleshooting

### Widget not loading?

1. **Check backend is running:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok"}
   ```

2. **Check browser console** for errors

3. **Verify project ID exists** in database:
   ```bash
   psql postgresql://localhost:5432/kuzushi_db
   SELECT "projectId", name FROM "App";
   ```

### CORS errors?

Ensure your backend `.env` has:
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### TypeScript errors?

Make sure `vite-env.d.ts` is included in your `tsconfig.json`:
```json
{
  "include": ["src"],
  ...
}
```

---

## 🚢 Production Deployment

### 1. Update API URL

Use environment variables:

```tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

<kuzushi-widget
  project-id="your-production-project-id"
  api-base-url={API_BASE_URL}
/>
```

Create `.env.production`:
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### 2. Build for Production

```bash
pnpm build
```

This creates an optimized production build in `dist/`.

### 3. Deploy

Deploy the `dist/` folder to your hosting platform:

- **Vercel:** `vercel deploy`
- **Netlify:** `netlify deploy`
- **AWS S3:** `aws s3 sync dist/ s3://your-bucket`

---

## 📖 Additional Resources

- [Main Integration Guide](../../INTEGRATION_GUIDE.md)
- [Backend Documentation](../../packages/backend/README.md)
- [Architecture Overview](../../ARCHITECTURE.md)
- [Widget Loader Source](../../packages/widget-loader/)

---

## 🤝 Support

Having issues? Check:

1. [Troubleshooting Guide](../../INTEGRATION_GUIDE.md#troubleshooting)
2. [GitHub Issues](https://github.com/your-org/kuzushi/issues)
3. Backend logs: `cd packages/backend && pnpm run start:dev`

---

## 📝 License

See [LICENSE](../../LICENSE) in the repository root.

---

**Happy coding!** 🎉
