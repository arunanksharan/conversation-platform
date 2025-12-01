# Widget Integration Patterns

This document explains the **correct** way to integrate the Kuzushi widget in different environments.

---

## 🎯 **Key Principle: Different Patterns for Different Environments**

| Environment | Pattern | Why |
|-------------|---------|-----|
| **Plain HTML/JS** | Web Component + Standalone Bundle | React not in module system |
| **React Apps** | Direct React Component | React available as ES modules |
| **Next.js Apps** | Direct React Component | React available as ES modules |

---

## 🌐 **Pattern 1: Plain HTML/JavaScript (No Bundler)**

**Use Case:** Static websites, WordPress, Wix, Squarespace, plain HTML

**Files Needed:**
- `widget-standalone.js` (517KB) - Includes widget + loader + r2wc

**Integration:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <!-- Your content -->

    <!-- Step 1: Load React from CDN -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

    <!-- Step 2: Add JSX runtime polyfill -->
    <script>
        if (typeof React !== 'undefined' && !React.jsx) {
            React.jsx = React.createElement;
            React.jsxs = React.createElement;
            React.Fragment = React.Fragment || 'div';
        }
        window['react/jsx-runtime'] = React;
    </script>

    <!-- Step 3: Load standalone widget -->
    <script src="http://localhost:3001/static/widget-standalone.js"></script>

    <!-- Step 4: Use the custom element -->
    <kuzushi-widget
        project-id="demo-support-widget"
        api-base-url="http://localhost:3001/api"
    ></kuzushi-widget>
</body>
</html>
```

**How It Works:**
1. React loaded as UMD (global variables)
2. JSX runtime polyfill makes `React.jsx` available
3. Standalone widget bundle:
   - Registers `<kuzushi-widget>` custom element
   - Converts React component to Web Component using r2wc
   - Initializes all widgets automatically
   - Fetches session config from backend

**Pros:**
- ✅ Works in any HTML page
- ✅ No build tools required
- ✅ Shadow DOM isolation
- ✅ Easy to drop into existing sites

**Cons:**
- ❌ Larger bundle size (~517KB + React)
- ❌ React must be loaded from CDN
- ❌ Extra overhead from Web Component wrapper

---

## ⚛️ **Pattern 2: React Applications (Vite, CRA, etc.)**

**Use Case:** React SPAs built with Vite, Create React App, or other bundlers

**Files Needed:**
- `@kuzushi/widget` package (imported as dependency)

**Integration:**
```tsx
// Step 1: Import the widget component
import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

// Step 2: Use it like any React component
function MyPage() {
  return (
    <div>
      <h1>Support Chat</h1>
      <WidgetApp
        projectId="demo-support-widget"
        apiBaseUrl="http://localhost:3001/api"
      />
    </div>
  );
}
```

**How It Works:**
1. Widget imported as ES module
2. React already available in the bundle
3. Component rendered directly in React tree
4. Session initialization handled internally
5. Bundler optimizes everything

**Pros:**
- ✅ Best performance (no Web Component overhead)
- ✅ Full TypeScript support
- ✅ Direct React integration
- ✅ Smaller bundle (shared React dependency)
- ✅ Tree-shaking and optimization

**Cons:**
- ❌ Requires build step
- ❌ Not isolated (shares CSS scope)

**Why NOT to Use Web Components in React:**
- React already handles components
- Web Components add unnecessary overhead
- Shadow DOM breaks React context
- Custom elements are anti-pattern in React

---

## 🔷 **Pattern 3: Next.js Applications**

**Use Case:** Next.js apps (App Router or Pages Router)

**Files Needed:**
- `@kuzushi/widget` package (imported as dependency)

**Integration:**
```tsx
// app/components/ChatWidget.tsx
'use client'; // Mark as client component

import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

export function ChatWidget() {
  return (
    <WidgetApp
      projectId="demo-support-widget"
      apiBaseUrl="http://localhost:3001/api"
    />
  );
}
```

```tsx
// app/page.tsx
import { ChatWidget } from './components/ChatWidget';

export default function Page() {
  return (
    <div>
      <h1>Home Page</h1>
      <ChatWidget />
    </div>
  );
}
```

**How It Works:**
1. Widget imported in client component (`'use client'`)
2. Server-side rendering skips widget (client-only)
3. Widget hydrates on client side
4. Same performance as Pattern 2

**Pros:**
- ✅ Full Next.js compatibility
- ✅ SSR support
- ✅ Automatic code splitting
- ✅ Best performance

**Cons:**
- ❌ Must be in client component
- ❌ Not rendered during SSR

---

## 📊 **Comparison Matrix**

| Feature | HTML/JS | React | Next.js |
|---------|---------|-------|---------|
| **Bundle Approach** | Standalone IIFE | ES Module | ES Module |
| **React Loading** | CDN (UMD) | Bundled | Bundled |
| **Web Component** | Yes | No | No |
| **Build Required** | No | Yes | Yes |
| **Bundle Size** | ~517KB | ~346KB | ~346KB |
| **TypeScript** | No | Yes | Yes |
| **SSR Support** | N/A | N/A | Yes (client-side) |
| **Performance** | Good | Excellent | Excellent |

---

## 🔧 **Build Outputs**

### **For Plain HTML (Pattern 1)**
```
packages/widget-loader/dist/
  └── widget-standalone.js (517KB)
      - Widget component
      - Loader logic
      - r2wc wrapper
      - JSX runtime
```

Served at: `http://localhost:3001/static/widget-standalone.js`

### **For React/Next.js (Pattern 2 & 3)**
```
packages/widget/dist/
  ├── index.mjs (905KB) - ES module for bundlers
  ├── index.js (346KB) - CommonJS
  ├── index.umd.js (346KB) - UMD (not used)
  └── styles.css (18KB) - Widget styles
```

Imported as: `import { WidgetApp } from '@kuzushi/widget'`

---

## ⚠️ **Common Mistakes**

### ❌ **Mistake 1: Using Web Components in React**
**Wrong:**
```tsx
import { useKuzushiWidget } from './hooks/useKuzushiWidget';

function MyComponent() {
  const isLoaded = useKuzushiWidget(); // Loads widget-loader.js
  return <kuzushi-widget project-id="..."/>; // ❌ Anti-pattern
}
```

**Right:**
```tsx
import { WidgetApp } from '@kuzushi/widget';

function MyComponent() {
  return <WidgetApp projectId="..." apiBaseUrl="..." />; // ✅ Correct
}
```

**Why Wrong:**
- Loads widget-loader.js which expects global React
- In React apps, React is NOT global (it's module-based)
- Adds unnecessary Web Component overhead
- Breaks React patterns

---

### ❌ **Mistake 2: Missing React in Plain HTML**
**Wrong:**
```html
<script src="/widget-standalone.js"></script>
<kuzushi-widget project-id="..."></kuzushi-widget>
<!-- ❌ React not loaded -->
```

**Right:**
```html
<!-- Load React FIRST -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- THEN load widget -->
<script src="/widget-standalone.js"></script>
<kuzushi-widget project-id="..."></kuzushi-widget>
```

---

### ❌ **Mistake 3: Wrong File for Environment**
| Environment | ❌ Wrong File | ✅ Right File |
|-------------|---------------|---------------|
| Plain HTML | `widget-loader.js` | `widget-standalone.js` |
| React App | `widget-standalone.js` | Import `@kuzushi/widget` |
| Next.js | `widget-standalone.js` | Import `@kuzushi/widget` |

---

## 📚 **Examples**

### **Example 1: Plain HTML**
Location: `examples/host-site/`
File: `index.html`
Port: `8080`

### **Example 2: React SPA**
Location: `examples/react-integration/`
Component: `src/components/DirectWidget.tsx`
Port: `5174`

### **Example 3: Next.js**
Location: `examples/nextjs-integration/`
Component: `src/components/KuzushiWidget.tsx`
Port: `3000`

---

## 🎓 **Quick Decision Tree**

```
Are you using a bundler (Vite, Webpack, Next.js)?
│
├─ YES → Use Pattern 2 (Direct React Component)
│         Import: import { WidgetApp } from '@kuzushi/widget'
│         No Web Components, No widget-loader.js
│
└─ NO  → Use Pattern 1 (Web Component + Standalone)
          Load React from CDN
          Load widget-standalone.js
          Use <kuzushi-widget> custom element
```

---

## ✅ **Summary**

**Golden Rules:**
1. **Plain HTML** = Web Component pattern (widget-standalone.js)
2. **React/Next.js** = Direct component pattern (import WidgetApp)
3. **Never** use Web Components in React apps
4. **Always** load React before the widget
5. **Match** the pattern to your environment

---

**Questions?** Check `TESTING_GUIDE.md` for step-by-step testing instructions.
