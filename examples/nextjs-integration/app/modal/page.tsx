import Link from 'next/link';
import { ModalWidget } from '@/components/ModalWidget';

/**
 * Example 2: Modal Widget
 *
 * Shows how to conditionally render the widget in a modal/overlay.
 * This is useful for chat popups or on-demand assistance.
 */
export default function ModalPage() {
  return (
    <div className="page">
      <header className="header">
        <h1>Modal Widget</h1>
        <p>On-demand widget in a modal dialog</p>
      </header>

      <div className="container">
        <nav className="nav-links">
          <Link href="/">🏠 Home</Link>
          <Link href="/embedded">📦 Embedded</Link>
          <Link href="/modal" className="active">
            💬 Modal
          </Link>
          <Link href="/ssr">🚀 SSR</Link>
        </nav>

        <div className="card">
          <div className="example-header">
            <span className="badge">Pattern 2</span>
            <h2>Widget in Modal/Overlay</h2>
            <p>
              Show the widget on-demand in a modal dialog. Perfect for chat
              popups or contextual help that doesn&apos;t take up screen space until
              needed.
            </p>
          </div>

          <div className="info-box">
            <h3>Use cases:</h3>
            <ul>
              <li>Chat button that opens a popup assistant</li>
              <li>Contextual help triggered by user action</li>
              <li>Multi-step flows where chat is one step</li>
              <li>Mobile-friendly responsive designs</li>
            </ul>
          </div>

          <ModalWidget />

          <div className="info-box">
            <h3>Implementation notes:</h3>
            <ul>
              <li>Widget only renders when modal is open (conditional rendering)</li>
              <li>Session persists if you close and reopen (same session ID)</li>
              <li>Click outside modal to close</li>
              <li>Responsive design works on mobile and desktop</li>
            </ul>
          </div>

          <div className="code-block">
            <pre>{`// components/ModalWidget.tsx
'use client';

import { useState } from 'react';
import { KuzushiWidget } from './KuzushiWidget';

export function ModalWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Assistant
      </button>

      {isOpen && (
        <div className="modal">
          <div className="modal-content">
            <button onClick={() => setIsOpen(false)}>×</button>
            <KuzushiWidget
              projectId="demo-support-widget"
              apiBaseUrl="http://localhost:3001/api"
            />
          </div>
        </div>
      )}
    </>
  );
}

// app/modal/page.tsx
import { ModalWidget } from '@/components/ModalWidget';

export default function Page() {
  return <ModalWidget />;
}`}</pre>
          </div>

          <div className="info-box">
            <h3>Pro tips:</h3>
            <ul>
              <li>Modal component must be a Client Component (&apos;use client&apos;)</li>
              <li>Use portal or modal library for better accessibility</li>
              <li>Consider adding keyboard shortcuts (Esc to close)</li>
              <li>Add focus trap for better UX</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
