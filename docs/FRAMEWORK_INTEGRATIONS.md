# Kuzushi Widget Framework Integrations

Complete integration guides and working examples for popular JavaScript frameworks.

---

## 📚 Available Integrations

### ⚛️ React Integration

**Complete guide for React (Vite/CRA) applications**

- **Guide:** [REACT_INTEGRATION_GUIDE.md](./REACT_INTEGRATION_GUIDE.md)
- **Example:** [examples/react-integration/](./examples/react-integration/)
- **Quick Start:** `cd examples/react-integration && pnpm install && pnpm dev`
- **Port:** http://localhost:3000

**What's included:**
- ✅ Simple embedded widget pattern
- ✅ Modal/popup widget pattern
- ✅ Advanced custom integration with events
- ✅ TypeScript support
- ✅ State management examples (Context, Redux)
- ✅ Testing strategies
- ✅ Production deployment guide

---

### ▲ Next.js Integration

**Complete guide for Next.js 14+ App Router applications**

- **Guide:** [NEXTJS_INTEGRATION_GUIDE.md](./NEXTJS_INTEGRATION_GUIDE.md)
- **Example:** [examples/nextjs-integration/](./examples/nextjs-integration/)
- **Quick Start:** `cd examples/nextjs-integration && pnpm install && pnpm dev`
- **Port:** http://localhost:3002

**What's included:**
- ✅ Server Component + Client Component pattern
- ✅ Modal widget with state management
- ✅ SSR integration with data fetching
- ✅ TypeScript support
- ✅ Performance optimization techniques
- ✅ Deployment guides (Vercel, Docker, AWS)

---

### 🌐 Plain HTML Integration

**Simple integration for any website**

- **Guide:** [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Example:** [examples/host-site/](./examples/host-site/)
- **Quick Start:** `cd examples/host-site && pnpm install && pnpm dev`
- **Port:** http://localhost:8080

**What's included:**
- ✅ Single custom element integration
- ✅ No build step required
- ✅ Works with any static site
- ✅ Shadow DOM style isolation

---

## 🚀 Quick Start

### Prerequisites

Before running any examples:

1. **Start the backend:**
   ```bash
   cd packages/backend
   pnpm install
   pnpm run db:migrate
   pnpm run db:seed
   pnpm run start:dev
   ```

2. **Build widget packages:**
   ```bash
   cd ../..  # Back to repo root
   pnpm build
   ```

3. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok"}
   ```

---

## 📖 Integration Guides

### React Integration

[**→ Full React Integration Guide**](./REACT_INTEGRATION_GUIDE.md)

**Key Topics:**
- Basic integration
- Integration patterns (embedded, modal, floating)
- State management (Context API, Redux)
- Event handling
- TypeScript support
- Testing
- Production deployment

### Next.js Integration

[**→ Full Next.js Integration Guide**](./NEXTJS_INTEGRATION_GUIDE.md)

**Key Topics:**
- Server vs Client Components
- App Router patterns
- SSR integration
- Dynamic imports
- Environment variables
- Performance optimization
- Production deployment (Vercel, Docker, AWS)

### General Integration

[**→ General Integration Guide**](./INTEGRATION_GUIDE.md)

**Key Topics:**
- Backend setup
- Database configuration
- Widget building
- HTML integration
- Customization
- Multi-tenant setup
- Troubleshooting

---

## 🎯 Choose Your Integration

### For React Applications

Use the **React integration** if you're building with:
- Create React App
- Vite + React
- React with custom bundler
- Single Page Applications (SPA)

**Start here:** [examples/react-integration/](./examples/react-integration/)

### For Next.js Applications

Use the **Next.js integration** if you're building with:
- Next.js 13+ (App Router)
- Server-Side Rendering (SSR)
- Static Site Generation (SSG)
- Full-stack Next.js apps

**Start here:** [examples/nextjs-integration/](./examples/nextjs-integration/)

### For Static Websites

Use the **HTML integration** if you're building:
- Static HTML websites
- WordPress sites
- Landing pages
- Marketing sites
- Any site without a JavaScript framework

**Start here:** [examples/host-site/](./examples/host-site/)

---

## 🔧 Common Configuration

### Environment Variables

All frameworks support environment-based configuration:

**React (Vite):**
```env
# .env.local
VITE_WIDGET_PROJECT_ID=demo-support-widget
VITE_WIDGET_API_URL=http://localhost:3001/api
```

**Next.js:**
```env
# .env.local
NEXT_PUBLIC_WIDGET_PROJECT_ID=demo-support-widget
NEXT_PUBLIC_WIDGET_API_URL=http://localhost:3001/api
```

**HTML:**
```html
<script>
  window.WIDGET_CONFIG = {
    projectId: 'demo-support-widget',
    apiBaseUrl: 'http://localhost:3001/api'
  };
</script>
```

### TypeScript Support

All examples include full TypeScript support:

```typescript
// global.d.ts or vite-env.d.ts
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

---

## 📦 Example Projects

### React Example Structure

```
examples/react-integration/
├── src/
│   ├── components/
│   │   ├── EmbeddedWidget.tsx      # Simple embedding
│   │   ├── ModalWidget.tsx          # Modal pattern
│   │   └── CustomIntegration.tsx   # Advanced
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── package.json
├── vite.config.ts
└── README.md
```

### Next.js Example Structure

```
examples/nextjs-integration/
├── app/
│   ├── embedded/
│   │   └── page.tsx                # Embedded pattern
│   ├── modal/
│   │   └── page.tsx                # Modal pattern
│   ├── ssr/
│   │   └── page.tsx                # SSR pattern
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── KuzushiWidget.tsx           # Main widget component
│   └── ModalWidget.tsx             # Modal implementation
├── package.json
├── next.config.js
└── README.md
```

---

## 🎨 Integration Patterns

### Pattern 1: Embedded Widget

Widget is always visible in your layout:

```tsx
function App() {
  return (
    <div className="app">
      <main>{/* Your content */}</main>
      <aside className="widget">
        <KuzushiWidget projectId="demo-support-widget" />
      </aside>
    </div>
  );
}
```

**Use cases:**
- Help/support pages
- Dashboard assistants
- Always-available chat

### Pattern 2: Modal Widget

Widget appears on-demand:

```tsx
function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Get Help</button>
      {isOpen && (
        <Modal onClose={() => setIsOpen(false)}>
          <KuzushiWidget projectId="demo-support-widget" />
        </Modal>
      )}
    </>
  );
}
```

**Use cases:**
- Chat popups
- Contextual help
- Mobile-friendly interfaces

### Pattern 3: Floating Chat Button

Common chat bubble UX:

```tsx
function FloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="floating-chat">
      {!isExpanded ? (
        <button onClick={() => setIsExpanded(true)}>💬</button>
      ) : (
        <div className="chat-window">
          <KuzushiWidget projectId="demo-support-widget" />
        </div>
      )}
    </div>
  );
}
```

**Use cases:**
- Global assistant access
- E-commerce support
- SaaS help systems

---

## 🔍 Troubleshooting

### Widget Not Loading

**Check:**
1. Backend is running: `curl http://localhost:3001/health`
2. CORS is configured correctly in backend `.env`
3. Project ID exists in database
4. Browser console for errors

**Common fixes:**
- Update CORS_ORIGINS in backend `.env`
- Verify widget script URL is correct
- Check network tab for failed requests

### Hydration Errors (Next.js)

**Problem:** "Text content does not match server-rendered HTML"

**Fix:** Ensure widget wrapper has `'use client'` directive

```tsx
'use client';  // ⬅️ Required!

export function KuzushiWidget() {
  // ...
}
```

### TypeScript Errors

**Problem:** Type errors with custom element

**Fix:** Ensure type definitions are included:

```json
// tsconfig.json
{
  "include": ["global.d.ts", "src/**/*"]
}
```

---

## 📊 Comparison Matrix

| Feature | React | Next.js | HTML |
|---------|-------|---------|------|
| **Setup Complexity** | Medium | Medium | Low |
| **Build Required** | Yes | Yes | No |
| **TypeScript** | ✅ Full | ✅ Full | ⚠️ Optional |
| **SSR Support** | ❌ No | ✅ Yes | N/A |
| **Bundle Size** | Small | Small | None |
| **State Management** | ✅ Easy | ✅ Easy | ⚠️ Manual |
| **Best For** | SPAs | Full-stack | Static sites |

---

## 🚢 Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Backend URL points to production
- [ ] CORS configured for production domain
- [ ] Widget script URL uses HTTPS
- [ ] Project ID is production project
- [ ] Database has production configuration
- [ ] SSL/TLS certificates configured
- [ ] Error tracking integrated
- [ ] Analytics configured
- [ ] Performance tested

---

## 📚 Additional Resources

### Documentation
- [Main Integration Guide](./INTEGRATION_GUIDE.md)
- [Backend Documentation](./packages/backend/README.md)
- [Architecture Overview](./ARCHITECTURE.md)

### Examples
- [React Example](./examples/react-integration/)
- [Next.js Example](./examples/nextjs-integration/)
- [HTML Example](./examples/host-site/)

### Tools
- [React Documentation](https://react.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vite Documentation](https://vitejs.dev)

---

## 💬 Support

Need help with integration?

1. **Check the guides:**
   - [React Integration Guide](./REACT_INTEGRATION_GUIDE.md)
   - [Next.js Integration Guide](./NEXTJS_INTEGRATION_GUIDE.md)
   - [General Integration Guide](./INTEGRATION_GUIDE.md)

2. **Run the examples:**
   - `cd examples/react-integration && pnpm dev`
   - `cd examples/nextjs-integration && pnpm dev`

3. **Common issues:**
   - See [Troubleshooting](#troubleshooting) above
   - Check example READMEs for specific issues

4. **Still stuck?**
   - Open an issue with reproduction steps
   - Include browser console errors
   - Provide backend logs

---

## 🎉 Quick Links

- **React Integration:** [Guide](./REACT_INTEGRATION_GUIDE.md) | [Example](./examples/react-integration/)
- **Next.js Integration:** [Guide](./NEXTJS_INTEGRATION_GUIDE.md) | [Example](./examples/nextjs-integration/)
- **HTML Integration:** [Guide](./INTEGRATION_GUIDE.md) | [Example](./examples/host-site/)
- **Backend Setup:** [Guide](./INTEGRATION_GUIDE.md#backend-setup)

---

**Ready to integrate?** Choose your framework above and follow the guide! 🚀
