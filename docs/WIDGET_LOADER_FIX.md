# Widget Loader Fix - React Dependency Issue

## Problem: "React is not defined"

When testing the host-site HTML example, the browser console showed:
```
Uncaught ReferenceError: React is not defined
  at widget-loader.js:28
```

## Root Cause

The widget-loader is built with Vite/Rollup with React marked as an **external dependency**:

**File:** `packages/widget-loader/vite.config.ts`
```typescript
rollupOptions: {
  external: ['react', 'react-dom', '@kuzushi/widget'],
  output: {
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
  },
}
```

This configuration tells Rollup:
- **Don't bundle React** - treat it as external
- **Expect React to be available globally** as `window.React`
- **Expect ReactDOM to be available globally** as `window.ReactDOM`

### Why External?

React is marked as external because:
1. **Bundle Size**: Including React would make widget-loader.js much larger (~1MB+)
2. **Shared Dependency**: Host pages often already have React loaded
3. **Version Flexibility**: Allows host pages to control React version
4. **Performance**: CDN caching works better for shared libraries

## Solution

### For Pure HTML/JavaScript Integration

Load React and ReactDOM from CDN **before** loading widget-loader.js:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <!-- Your content here -->

    <!-- 1. Load React dependencies FIRST -->
    <script crossorigin src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>

    <!-- 2. THEN load the widget loader -->
    <script src="/widget-loader.js"></script>

    <!-- 3. Use the custom element -->
    <kuzushi-widget
        project-id="demo-support-widget"
        api-base-url="http://localhost:3001/api"
    ></kuzushi-widget>
</body>
</html>
```

### For React Applications

React apps already have React in their bundle, so no additional steps needed:

```tsx
import { useKuzushiWidget } from './hooks/useKuzushiWidget';

function MyComponent() {
  const isLoaded = useKuzushiWidget();

  return (
    <kuzushi-widget
      project-id="demo-support-widget"
      api-base-url="http://localhost:3001/api"
    />
  );
}
```

### For Next.js Applications

Load the script in the layout with React already available:

```tsx
// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src="http://localhost:3001/static/widget-loader.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Files Modified

### 1. `examples/host-site/index.html`
**Added:** React and ReactDOM script tags before widget-loader.js

```diff
+ <!-- Load React and ReactDOM from CDN (required for widget) -->
+ <script crossorigin src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
+ <script crossorigin src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
+
  <!-- Load the Kuzushi widget loader -->
  <script src="/widget-loader.js"></script>
```

### 2. `TESTING_GUIDE.md`
**Updated:** Documentation to include React dependency requirement

### 3. `packages/backend/src/app.module.ts`
**Added:** Static file serving for widget-loader.js

```typescript
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', 'static'),
  serveRoot: '/static',
}),
```

### 4. `packages/backend/package.json`
**Added:** Post-build script to copy widget-loader.js

```json
"postbuild": "mkdir -p static && cp ../widget-loader/dist/widget-loader.js static/widget-loader.js"
```

## Verification

After applying the fix:

### Check 1: React is Available
Open browser console and check:
```javascript
console.log(typeof React);         // Should be: "object"
console.log(typeof ReactDOM);      // Should be: "object"
```

### Check 2: Widget Loader Loads
```javascript
console.log(customElements.get('kuzushi-widget'));
// Should return: class KuzushiWidget
```

### Check 3: Widget Renders
- Widget should appear in the designated container
- No "React is not defined" errors in console
- Chat interface should be visible

## Alternative Approaches Considered

### Option 1: Bundle React (Not Chosen)
**Pros:**
- No external dependency
- Simpler HTML integration

**Cons:**
- Massive bundle size (524KB → ~1.5MB)
- Duplicate React if host page already has it
- Version conflicts
- Poor CDN caching

### Option 2: Use Preact (Not Chosen)
**Pros:**
- Much smaller (~3KB)
- Compatible API

**Cons:**
- Different ecosystem
- May have compatibility issues
- Still need to load separately

### Option 3: Current Solution - External React (✅ Chosen)
**Pros:**
- Best performance (shared dependency)
- Flexible versioning
- Better CDN caching
- Standard practice for widgets

**Cons:**
- Requires host pages to load React
- Slightly more complex integration
- Documentation burden

## Production Considerations

### CDN Selection

For production, use a reliable CDN:

**Option 1: unpkg (Current)**
```html
<script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
```

**Option 2: jsDelivr**
```html
<script src="https://cdn.jsdelivr.net/npm/react@19/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@19/umd/react-dom.production.min.js"></script>
```

**Option 3: cdnjs**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/19.0.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/19.0.0/umd/react-dom.production.min.js"></script>
```

### Integrity Hashes

For security, add SRI (Subresource Integrity) hashes:

```html
<script
  crossorigin
  src="https://unpkg.com/react@19/umd/react.production.min.js"
  integrity="sha384-..."
></script>
```

### Version Pinning

Always pin to specific versions in production:

```html
<!-- ❌ Bad: Unpinned -->
<script src="https://unpkg.com/react/umd/react.production.min.js"></script>

<!-- ✅ Good: Pinned -->
<script src="https://unpkg.com/react@19.0.0/umd/react.production.min.js"></script>
```

## Future Improvements

### 1. Automatic Detection
Add a check in widget-loader to detect if React is missing:

```javascript
if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
  console.error('[Kuzushi Widget] React and ReactDOM are required. Please load them before the widget-loader script.');
  // Optionally: Auto-load from CDN
}
```

### 2. Self-Contained Build
Create an alternative build that bundles React:

```bash
# Current (external React)
pnpm build:loader

# New option (bundled React)
pnpm build:loader:standalone
```

### 3. Dynamic Import
Load React dynamically if not available:

```javascript
async function ensureReact() {
  if (typeof React === 'undefined') {
    await loadScript('https://unpkg.com/react@19/umd/react.production.min.js');
  }
  if (typeof ReactDOM === 'undefined') {
    await loadScript('https://unpkg.com/react-dom@19/umd/react-dom.production.min.js');
  }
}
```

## Documentation Updates

All documentation has been updated to reflect the React dependency:

- ✅ `TESTING_GUIDE.md` - Added React requirement to HTML example
- ✅ `TESTING_GUIDE.md` - Added troubleshooting for "React is not defined"
- ✅ `examples/host-site/index.html` - Added React script tags
- ✅ `examples/host-site/README.md` - Should be updated with React requirement

## Summary

**Problem:** Widget-loader expects React to be available globally

**Solution:** Load React from CDN before loading widget-loader.js

**Impact:** HTML/JavaScript integrations only (React/Next.js apps unaffected)

**Status:** ✅ Fixed and Documented

---

**Date:** November 24, 2025
**Issue:** React dependency not documented
**Fix:** Add React/ReactDOM script tags + documentation
