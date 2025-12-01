import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="page">
      <header className="header">
        <h1>Kuzushi Widget - Next.js Integration</h1>
        <p>Complete examples for integrating the AI assistant into Next.js applications</p>
      </header>

      <div className="container">
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
            Choose an Integration Pattern
          </h2>
          <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
            Explore different ways to integrate the Kuzushi widget into your Next.js app.
            Each example demonstrates best practices for the Next.js App Router.
          </p>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <Link href="/embedded" className="nav-link" style={{ display: 'block' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>📦 Client-Side Embedded</h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Simple client component integration - the easiest way to get started
              </p>
            </Link>

            <Link href="/modal" className="nav-link" style={{ display: 'block' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>💬 Modal Widget</h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                On-demand widget in a modal dialog with state management
              </p>
            </Link>

            <Link href="/ssr" className="nav-link" style={{ display: 'block' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>🚀 SSR Integration</h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Server-side rendering with proper hydration handling
              </p>
            </Link>
          </div>

          <div className="info-box" style={{ marginTop: '2rem' }}>
            <h3>Before you start:</h3>
            <ul>
              <li>
                <strong>Backend must be running:</strong>{' '}
                <code>cd packages/backend && pnpm run start:dev</code>
              </li>
              <li>
                <strong>Database must be seeded:</strong>{' '}
                <code>pnpm run db:migrate && pnpm run db:seed</code>
              </li>
              <li>
                <strong>Widget must be built:</strong>{' '}
                <code>pnpm build</code> (from repo root)
              </li>
              <li>
                <strong>Backend should be at:</strong>{' '}
                <code>http://localhost:3001</code>
              </li>
            </ul>
          </div>

          <div className="code-block" style={{ marginTop: '2rem' }}>
            <pre>{`# Quick start
cd examples/nextjs-integration
pnpm install
pnpm dev

# Open http://localhost:3002`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
