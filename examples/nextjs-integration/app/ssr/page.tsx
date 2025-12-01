import Link from 'next/link';
import { KuzushiWidget } from '@/components/KuzushiWidget';

/**
 * Example 3: SSR Integration
 *
 * This page demonstrates how to integrate the widget with Server-Side Rendering.
 * The page itself is a Server Component, but the widget is a Client Component.
 */

// This is a Server Component (default in App Router)
export default async function SSRPage() {
  // Simulate fetching data from your backend
  // In a real app, you might fetch user data, session info, etc.
  const serverData = {
    timestamp: new Date().toISOString(),
    projectId: 'demo-support-widget',
    apiBaseUrl: 'http://localhost:3001/api',
  };

  return (
    <div className="page">
      <header className="header">
        <h1>SSR Integration</h1>
        <p>Server-side rendering with proper hydration</p>
      </header>

      <div className="container">
        <nav className="nav-links">
          <Link href="/">🏠 Home</Link>
          <Link href="/embedded">📦 Embedded</Link>
          <Link href="/modal">💬 Modal</Link>
          <Link href="/ssr" className="active">
            🚀 SSR
          </Link>
        </nav>

        <div className="card">
          <div className="example-header">
            <span className="badge">Pattern 3</span>
            <h2>Server-Side Rendering Integration</h2>
            <p>
              This page is a Server Component that renders the widget client
              component. Server-side data can be passed to the widget.
            </p>
          </div>

          <div className="info-box">
            <h3>Server Component Benefits:</h3>
            <ul>
              <li>Fetch data on the server (API keys stay secure)</li>
              <li>Reduce client-side JavaScript bundle</li>
              <li>Improved SEO and initial page load</li>
              <li>Direct database access if needed</li>
            </ul>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                background: '#f3f4f6',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
              }}
            >
              <h3 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
                Server-Side Data:
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                This data was fetched on the server:
              </p>
              <pre
                style={{
                  background: '#1f2937',
                  color: '#f3f4f6',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(serverData, null, 2)}
              </pre>
            </div>
          </div>

          <div className="widget-container">
            <KuzushiWidget
              projectId={serverData.projectId}
              apiBaseUrl={serverData.apiBaseUrl}
            />
          </div>

          <div className="code-block" style={{ marginTop: '1.5rem' }}>
            <pre>{`// app/ssr/page.tsx (Server Component)
import { KuzushiWidget } from '@/components/KuzushiWidget';

export default async function SSRPage() {
  // Fetch data on the server
  const data = await fetch('https://api.example.com/config');
  const config = await data.json();

  // Or query database directly
  // const user = await db.user.findUnique({ where: { id: userId } });

  return (
    <div>
      <h1>Server-rendered page</h1>

      {/* Client Component with server data */}
      <KuzushiWidget
        projectId={config.projectId}
        apiBaseUrl={config.apiBaseUrl}
      />
    </div>
  );
}

// components/KuzushiWidget.tsx (Client Component)
'use client';

export function KuzushiWidget({ projectId, apiBaseUrl }) {
  // ... client-side logic
  return <kuzushi-widget project-id={projectId} />;
}`}</pre>
          </div>

          <div className="info-box">
            <h3>Key concepts:</h3>
            <ul>
              <li>
                <strong>Server Component:</strong> This page (default in App Router)
              </li>
              <li>
                <strong>Client Component:</strong> KuzushiWidget (has &apos;use client&apos;)
              </li>
              <li>
                <strong>Data flow:</strong> Server → Client Component props
              </li>
              <li>
                <strong>Hydration:</strong> Client component hydrates after initial SSR
              </li>
            </ul>
          </div>

          <div className="info-box">
            <h3>Best practices:</h3>
            <ul>
              <li>Keep widget wrapper as Client Component</li>
              <li>Parent pages can be Server Components for data fetching</li>
              <li>Pass configuration via props from server to client</li>
              <li>Avoid fetching sensitive data on client side</li>
              <li>Use environment variables for API URLs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
