import Link from 'next/link';
import { KuzushiWidget } from '@/components/KuzushiWidget';

/**
 * Example 1: Client-Side Embedded Widget
 *
 * This is the simplest integration for Next.js App Router.
 * The widget is rendered as a client component.
 */
export default function EmbeddedPage() {
  return (
    <div className="page">
      <header className="header">
        <h1>Client-Side Embedded Widget</h1>
        <p>Simple integration using a client component</p>
      </header>

      <div className="container">
        <nav className="nav-links">
          <Link href="/">🏠 Home</Link>
          <Link href="/embedded" className="active">
            📦 Embedded
          </Link>
          <Link href="/modal">💬 Modal</Link>
          <Link href="/ssr">🚀 SSR</Link>
        </nav>

        <div className="card">
          <div className="example-header">
            <span className="badge">Pattern 1</span>
            <h2>Simple Embedded Widget</h2>
            <p>
              The widget is embedded directly using a client component wrapper.
              This is the most straightforward integration for Next.js.
            </p>
          </div>

          <div className="info-box">
            <h3>How it works:</h3>
            <ul>
              <li>Client component loads the widget loader script</li>
              <li>Widget automatically initializes and connects</li>
              <li>Works with Next.js App Router out of the box</li>
              <li>All styling is isolated via Shadow DOM</li>
            </ul>
          </div>

          <div className="widget-container">
            <KuzushiWidget
              projectId="demo-support-widget"
              apiBaseUrl="http://localhost:3001/api"
            />
          </div>

          <div className="code-block" style={{ marginTop: '1.5rem' }}>
            <pre>{`// components/KuzushiWidget.tsx
'use client';

import { useEffect, useState } from 'react';

export function KuzushiWidget({ projectId, apiBaseUrl }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = \`\${apiBaseUrl}/static/widget-loader.js\`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);
  }, [apiBaseUrl]);

  return (
    <kuzushi-widget
      project-id={projectId}
      api-base-url={apiBaseUrl}
    />
  );
}

// app/page.tsx
import { KuzushiWidget } from '@/components/KuzushiWidget';

export default function Page() {
  return (
    <KuzushiWidget
      projectId="demo-support-widget"
      apiBaseUrl="http://localhost:3001/api"
    />
  );
}`}</pre>
          </div>

          <div className="info-box">
            <h3>Key points:</h3>
            <ul>
              <li>
                <code>&apos;use client&apos;</code> directive is required for the wrapper
                component
              </li>
              <li>Parent page can be a Server Component or Client Component</li>
              <li>Widget state persists during client-side navigation</li>
              <li>No hydration issues with this approach</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
