# 🧪 Testing Guide - Kuzushi Widget Platform

This guide will walk you through testing all the integration examples for the Kuzushi embeddable widget.

---

## Prerequisites

Before testing the widget, ensure you have completed these steps:

### 1. ✅ Backend is Running
```bash
cd packages/backend
pnpm run start:dev
```

**Verify it's running:**
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok",...}
```

### 2. ✅ Database is Migrated and Seeded
```bash
cd packages/backend

# Create migration
pnpm run db:migrate

# Seed the database
pnpm run db:seed
```

**Verify database has data:**
```bash
curl http://localhost:3001/api/v1/tenants
# Should return array with 2 tenants
```

### 3. ✅ All Packages are Built
```bash
# From project root
pnpm build
```

**This builds:**
- ✅ Backend (`@kuzushi/backend`)
- ✅ Widget (`@kuzushi/widget`)
- ✅ Widget Loader (`@kuzushi/widget-loader`)
- ✅ React Integration Example
- ✅ Next.js Integration Example

---

## 📦 Available Examples

We have 3 working integration examples:

| Example | Type | Location | Best For |
|---------|------|----------|----------|
| **Host Site** | HTML/JavaScript | `examples/host-site/` | Simple websites, no framework |
| **React Integration** | React SPA | `examples/react-integration/` | React applications |
| **Next.js Integration** | Next.js (SSR) | `examples/nextjs-integration/` | Next.js applications |

---

## 🌐 Test 1: Host Site Example (Pure HTML)

This is the simplest integration - just HTML and JavaScript.

### Run the Example

```bash
cd examples/host-site
pnpm run dev
```

**What it does:** Starts a local development server (Vite)

### Open in Browser

```
http://localhost:5173
```

### What to Test

1. **Widget Loads:** You should see the widget embedded on the right side
2. **Connection Status:** Should show "Connected" (green indicator)
3. **Send a Message:** Type "Hello" and press Enter
4. **Receive Response:** Should get a response from the AI assistant
5. **Try Voice (Optional):** Click the microphone icon if voice is enabled

### How It Works

Open `index.html` to see the integration:

```html
<!-- 1. Load React and ReactDOM (required dependencies) -->
<script crossorigin src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>

<!-- 2. Load the widget loader script -->
<script src="/widget-loader.js"></script>

<!-- 3. Add the custom element -->
<kuzushi-widget
    project-id="demo-support-widget"
    api-base-url="http://localhost:3001/api"
></kuzushi-widget>
```

**Important:** The widget requires React and ReactDOM to be loaded first. The widget-loader script then:
1. Fetches session config from backend
2. Registers the `<kuzushi-widget>` custom element
3. Handles all initialization automatically

---

## ⚛️ Test 2: React Integration Example

This example shows how to integrate the widget in React applications with 3 different patterns.

### Run the Example

```bash
cd examples/react-integration
pnpm run dev
```

### Open in Browser

```
http://localhost:5174
```

### What to Test

#### **Tab 1: Embedded Widget**
- Widget is embedded directly in the page
- Uses the custom element `<kuzushi-widget>`
- Shadow DOM isolation (widget styles don't affect your app)

**Try:**
- Send messages
- Verify it doesn't affect surrounding styles
- Check that widget is isolated in its own shadow DOM

#### **Tab 2: Modal Widget**
- Widget appears as a floating button
- Click to open/close the modal
- Positioned fixed on bottom-right

**Try:**
- Click "Open Chat" button
- Send a message
- Click "Close Chat" to hide
- Button should persist across tab changes

#### **Tab 3: Advanced Integration**
- Shows how to access the widget programmatically
- Custom trigger buttons
- Direct React component integration

**Try:**
- Click "Send Custom Message" to programmatically send a message
- Click "Get Session Info" to retrieve session data
- Observe how you can control the widget from your React code

### Key Files to Review

1. **`src/hooks/useKuzushiWidget.ts`** - Hook to load the widget script
2. **`src/components/EmbeddedWidget.tsx`** - Simple embedded pattern
3. **`src/components/ModalWidget.tsx`** - Floating modal pattern
4. **`src/components/CustomIntegration.tsx`** - Advanced programmatic control
5. **`public/index.html`** - Script tag that loads the widget loader

### How It Works

```tsx
import { useKuzushiWidget } from './hooks/useKuzushiWidget';

function MyComponent() {
  const isLoaded = useKuzushiWidget();

  return (
    <div>
      {!isLoaded && <p>Loading widget...</p>}
      <kuzushi-widget
        project-id="demo-support-widget"
        api-base-url="http://localhost:3001/api"
      />
    </div>
  );
}
```

---

## 🔷 Test 3: Next.js Integration Example

This example shows how to integrate in Next.js with SSR support.

### Run the Example

```bash
cd examples/nextjs-integration
pnpm run dev
```

### Open in Browser

```
http://localhost:3000
```

### What to Test

#### **Page 1: Embedded Widget (`/embedded`)**
- Widget embedded in the page layout
- Works with Next.js client components

**Try:**
- Navigate to different pages
- Widget should maintain state during navigation
- Send messages and verify responses

#### **Page 2: Modal Widget (`/modal`)**
- Floating chat button
- Opens/closes modal on click
- Position persists across page navigation

**Try:**
- Open the chat modal
- Navigate to other pages
- Modal should close but button persists

#### **Page 3: SSR Page (`/ssr`)**
- Server-side rendered page
- Widget loads client-side after hydration
- Shows proper SSR integration

**Try:**
- View page source (right-click → View Page Source)
- Notice the widget is not in the SSR HTML (loaded client-side)
- Widget loads after page hydration

### Key Files to Review

1. **`src/components/KuzushiWidget.tsx`** - Client component wrapper
2. **`src/hooks/useKuzushiWidget.ts`** - Next.js compatible hook
3. **`app/layout.tsx`** - Root layout with script tag
4. **`app/embedded/page.tsx`** - Embedded widget page
5. **`app/modal/page.tsx`** - Modal widget page

### How It Works

**Client Component:**
```tsx
'use client';

import { useKuzushiWidget } from '@/hooks/useKuzushiWidget';

export function KuzushiWidget() {
  const isLoaded = useKuzushiWidget();

  return (
    <kuzushi-widget
      project-id="demo-support-widget"
      api-base-url="http://localhost:3001/api"
    />
  );
}
```

**Layout (Script Tag):**
```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="/widget-loader.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 🎯 Testing Checklist

Use this checklist to ensure everything works:

### Basic Functionality
- [ ] Widget loads without errors
- [ ] Connection status shows "Connected"
- [ ] Can send text messages
- [ ] AI responds to messages
- [ ] Messages appear in the chat history
- [ ] Timestamps are visible
- [ ] Avatar/user icons display correctly

### Advanced Features (If Enabled)
- [ ] Voice button appears (if voice is enabled)
- [ ] Voice connection works
- [ ] Voice transcription displays
- [ ] AI voice response plays

### Integration Testing
- [ ] Widget works in pure HTML
- [ ] Widget works in React SPA
- [ ] Widget works in Next.js
- [ ] Shadow DOM isolation works (styles don't leak)
- [ ] Multiple widgets can coexist on same page
- [ ] Widget survives page navigation (SPA)

### Error Handling
- [ ] Shows error if backend is down
- [ ] Shows error if invalid project ID
- [ ] Reconnects automatically on network issues
- [ ] Displays user-friendly error messages

---

## 🐛 Troubleshooting

### Widget doesn't load

**Check backend is running:**
```bash
curl http://localhost:3001/api/health
```

**Check console for errors:**
- Open browser DevTools (F12)
- Look for errors in Console tab
- Common errors:
  - `React is not defined` → React/ReactDOM not loaded (HTML example only)
  - `Failed to fetch session config` → Backend not running
  - `Project not found` → Wrong project-id
  - `CORS error` → Backend CORS misconfigured
  - `404 widget-loader.js` → Backend static files not configured

**For HTML/JavaScript integration:**
Make sure React and ReactDOM are loaded BEFORE widget-loader.js:
```html
<!-- MUST come first -->
<script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>

<!-- Then load widget -->
<script src="/widget-loader.js"></script>
```

### Widget shows "Disconnected"

**Check WebSocket connection:**
```bash
curl http://localhost:3001/api/health
```

**Verify project ID:**
- Must match a project in the database
- Default: `demo-support-widget`

**Check browser console:**
- Look for WebSocket connection errors
- Verify `ws://localhost:3001` is accessible

### Messages don't send

**Check backend logs:**
```bash
# In packages/backend terminal
# Look for WebSocket connection logs
```

**Verify session is initialized:**
- Widget should show "Connected" status
- If "Initializing..." persists, check backend logs

### Styles look broken

**Check Shadow DOM:**
- Widget should use Shadow DOM (isolated styles)
- Inspect element → Should see `#shadow-root`

**Check widget-loader.js is loaded:**
```javascript
// In browser console
console.log(customElements.get('kuzushi-widget'));
// Should return: class KuzushiWidget
```

---

## 📊 API Endpoints Reference

While testing, you may want to call these endpoints:

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Get All Tenants
```bash
curl http://localhost:3001/api/v1/tenants
```

### Get All Apps
```bash
curl http://localhost:3001/api/v1/apps
```

### Initialize Session
```bash
curl -X POST http://localhost:3001/api/v1/widget/session/init \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "demo-support-widget",
    "widgetInstanceId": "test-instance-123",
    "hostOrigin": "http://localhost:5173"
  }'
```

### Swagger API Docs
```
http://localhost:3001/api/v1/docs
```

---

## 🎨 Customization Testing

### Test Different Project IDs

The database has 2 demo apps:

1. **ACME Corporation** (Support Widget)
   - Project ID: `demo-support-widget`
   - Theme: Blue
   - Features: Text + Voice

2. **TechStart.io** (Sales Assistant)
   - Project ID: `techstart-sales-assistant`
   - Theme: Green
   - Features: Text only

**Try changing the project-id:**
```html
<kuzushi-widget
  project-id="techstart-sales-assistant"
  api-base-url="http://localhost:3001/api"
></kuzushi-widget>
```

You should see different theming and welcome messages!

---

## 📝 Next Steps

After successful testing:

1. **Create Your Own App:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/apps \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "<your-tenant-id>",
       "name": "My Custom Widget",
       "slug": "my-widget",
       "projectId": "my-unique-project-id"
     }'
   ```

2. **Customize Prompts:**
   - Visit Swagger docs: `http://localhost:3001/api/v1/docs`
   - Use the Prompts endpoints to customize AI behavior

3. **Configure Theme:**
   - Use Config Management endpoints
   - Update `uiTheme` in the app configuration

4. **Deploy to Production:**
   - See `PRODUCTION_DEPLOYMENT.md` for deployment guide
   - Configure environment variables
   - Set up proper CORS
   - Use production database

---

## ✅ Success Criteria

You're ready to deploy when:

- [x] All 3 examples work without errors
- [x] Backend is stable and handles connections
- [x] Database is properly seeded
- [x] Builds complete successfully (`pnpm build`)
- [x] No console errors in browser
- [x] WebSocket connections are stable
- [x] AI responses are working
- [x] Custom theming works for different projects

---

**Need Help?**
- Check the Swagger API docs: `http://localhost:3001/api/v1/docs`
- Review `API_ROUTES.md` for all available endpoints
- Check backend logs for detailed error messages
- Review `ARCHITECTURE.md` for system overview

**Happy Testing!** 🚀
