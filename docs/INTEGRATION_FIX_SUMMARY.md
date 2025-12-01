# Integration Fix Summary - November 24, 2025

## 🔍 Root Cause

The React integration example was using the **wrong pattern**:
- It was loading `widget-loader.js` via script tag
- `widget-loader.js` expects `window.React` and `window.ReactDOM` (globals)
- In Vite React apps, React is **imported as ES modules**, NOT exposed globally
- Result: `widget-loader.js` fails with "React is not defined"

---

## ✅ Fixes Applied

### 1. **HTML Example (host-site)**
**Status:** ✅ Fixed and Working

**Changes:**
- Added JSX runtime polyfill (`examples/host-site/index.html:204-214`)
- Uses `widget-standalone.js` (includes everything)
- React loaded from CDN as UMD globals

**Testing:**
```bash
cd examples/host-site
pnpm run dev  # Port 8080
# Visit: http://localhost:8080
```

---

### 2. **React Example (react-integration)**
**Status:** ✅ Fixed, Needs Restart

**Changes:**
- Added `@kuzushi/widget` dependency (`package.json:14`)
- Created `DirectWidget` component that imports WidgetApp directly
- Updated `App.tsx` to use DirectWidget instead of Web Component approach
- **NO more widget-loader.js, NO more custom elements**

**You Need To Do:**
```bash
# Stop the React dev server if running (Ctrl+C)

# Install dependencies (already done above)
cd examples/react-integration
pnpm install  # Already installed

# Restart the dev server
pnpm run dev  # Port 5174
```

**What Changed:**
```tsx
// ❌ OLD WAY (Web Component - doesn't work in React)
import { useKuzushiWidget } from './hooks/useKuzushiWidget';
const isLoaded = useKuzushiWidget(); // Loads widget-loader.js
<kuzushi-widget project-id="..." />

// ✅ NEW WAY (Direct React Component - correct!)
import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';
<WidgetApp projectId="demo-support-widget" apiBaseUrl="http://localhost:3001/api" />
```

---

### 3. **Documentation Created**
- ✅ `WIDGET_INTEGRATION_PATTERNS.md` - Complete integration guide
- ✅ `INTEGRATION_FIX_SUMMARY.md` - This file
- ✅ `BUILD_FIXES.md` - Build issue documentation
- ✅ `WIDGET_LOADER_FIX.md` - Loader issue documentation
- ✅ `TESTING_GUIDE.md` - Updated with correct patterns

---

## 🎯 The Correct Patterns

### **Pattern 1: Plain HTML/JavaScript**
**When:** No bundler, static HTML, WordPress, etc.

```html
<!-- Load React from CDN -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- JSX runtime polyfill -->
<script>
    if (typeof React !== 'undefined' && !React.jsx) {
        React.jsx = React.createElement;
        React.jsxs = React.createElement;
    }
    window['react/jsx-runtime'] = React;
</script>

<!-- Load standalone widget -->
<script src="http://localhost:3001/static/widget-standalone.js"></script>

<!-- Use custom element -->
<kuzushi-widget
    project-id="demo-support-widget"
    api-base-url="http://localhost:3001/api"
></kuzushi-widget>
```

---

### **Pattern 2: React Applications**
**When:** Vite, Create React App, any React bundler

```tsx
// Import widget as React component
import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

function MyComponent() {
  return (
    <WidgetApp
      projectId="demo-support-widget"
      apiBaseUrl="http://localhost:3001/api"
    />
  );
}
```

**Key Points:**
- ✅ Import widget directly
- ✅ Use as React component
- ✅ No Web Components
- ✅ No widget-loader.js
- ✅ Best performance

---

### **Pattern 3: Next.js Applications**
**When:** Next.js (App Router or Pages Router)

```tsx
// Mark as client component
'use client';

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

---

## 📊 Files Modified

### **React Integration Example**
1. `examples/react-integration/package.json` - Added @kuzushi/widget dependency
2. `examples/react-integration/src/App.tsx` - Updated to use DirectWidget
3. `examples/react-integration/src/components/DirectWidget.tsx` - NEW: Correct integration

### **HTML Example**
1. `examples/host-site/index.html` - Added JSX runtime polyfill
2. `examples/host-site/package.json` - Updated to copy widget-standalone.js

### **Build Configuration**
1. `packages/widget/vite.config.ts` - Added UMD build + process.env fix
2. `packages/widget-loader/vite.config.ts` - Added process.env fix
3. `packages/widget-loader/vite.standalone.config.ts` - NEW: Standalone build
4. `packages/widget-loader/src/standalone.ts` - NEW: Standalone source
5. `packages/widget-loader/package.json` - Build both versions
6. `packages/backend/package.json` - Copy standalone on build
7. `packages/backend/src/app.module.ts` - Serve static files

---

## 🚀 Testing Steps

### **Step 1: Test HTML Example**
```bash
cd examples/host-site
pnpm run dev
# Visit: http://localhost:8080
# Should work! Widget loads and renders.
```

**Expected:**
- ✅ No console errors
- ✅ Widget appears in "Try It Out" section
- ✅ Can send messages
- ✅ AI responds

---

### **Step 2: Test React Example**
```bash
cd examples/react-integration
pnpm run dev
# Visit: http://localhost:5174
```

**Expected:**
- ✅ No "React is not defined" error
- ✅ DirectWidget component loads
- ✅ Widget renders without Web Component
- ✅ Full React integration

---

### **Step 3: Test Next.js Example**
```bash
cd examples/nextjs-integration
pnpm run dev
# Visit: http://localhost:3000
```

**Expected:**
- ✅ Widget loads on client side
- ✅ No SSR issues
- ✅ Full Next.js compatibility

---

## ⚠️ Why This Was Confusing

**The Problem:**
- We had TWO different architectures:
  1. **Web Component approach** (for HTML)
  2. **Direct component approach** (for React/Next.js)

- The React example was using the wrong one (#1 instead of #2)
- widget-loader.js is ONLY for plain HTML, NOT for React apps

**The Solution:**
- Clarified patterns in documentation
- Fixed React example to use correct approach
- Made it clear: React apps should import the widget directly

---

## 📚 Key Documentation

1. **`WIDGET_INTEGRATION_PATTERNS.md`**
   - Complete guide to all integration patterns
   - When to use each approach
   - Common mistakes to avoid

2. **`TESTING_GUIDE.md`**
   - Step-by-step testing instructions
   - All 3 examples explained
   - Troubleshooting guide

3. **`BUILD_FIXES.md`**
   - Build system fixes
   - Dependency issues resolved
   - Technical details

---

## ✅ Current Status

| Example | Status | Notes |
|---------|--------|-------|
| **host-site** (HTML) | ✅ Working | Hard refresh may be needed |
| **react-integration** | ✅ Fixed | Restart dev server |
| **nextjs-integration** | ✅ Should Work | Uses same pattern as React |

---

## 🎉 Summary

**What We Fixed:**
1. ✅ HTML example now works with proper JSX runtime polyfill
2. ✅ React example fixed to use direct component import
3. ✅ Documentation clarifies correct patterns
4. ✅ Build system produces both formats (standalone + modules)

**What You Need To Do:**
1. Hard refresh HTML example: `localhost:8080` (Cmd+Shift+R)
2. Restart React example: Stop (Ctrl+C), then `pnpm run dev`
3. Test both examples work correctly

**Expected Result:**
Both examples should work without "React is not defined" errors!

---

**Date:** November 24, 2025
**Issue:** Web Component pattern used in React app (wrong architecture)
**Fix:** Changed to direct React component import (correct architecture)
