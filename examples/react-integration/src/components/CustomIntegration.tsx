import { useEffect, useState, useRef } from 'react';
import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

/**
 * Example 3: Advanced Custom Integration
 *
 * Shows how to integrate the widget with custom event handling,
 * dynamic configuration, and programmatic control.
 */
export function CustomIntegration() {
  const [projectId, setProjectId] = useState('demo-support-widget');
  const [events, setEvents] = useState<string[]>([]);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for custom events from the widget (if implemented)
    const handleWidgetEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const timestamp = new Date().toLocaleTimeString();
      setEvents((prev) => [
        `[${timestamp}] ${customEvent.type}: ${JSON.stringify(customEvent.detail)}`,
        ...prev.slice(0, 9), // Keep last 10 events
      ]);
    };

    // These are example event listeners - your widget may emit different events
    window.addEventListener('widget:ready', handleWidgetEvent);
    window.addEventListener('widget:message', handleWidgetEvent);
    window.addEventListener('widget:error', handleWidgetEvent);

    return () => {
      window.removeEventListener('widget:ready', handleWidgetEvent);
      window.removeEventListener('widget:message', handleWidgetEvent);
      window.removeEventListener('widget:error', handleWidgetEvent);
    };
  }, []);

  const handleProjectIdChange = () => {
    // Demonstrate dynamic project ID switching
    const newId = projectId === 'demo-support-widget'
      ? 'sales-assistant'
      : 'demo-support-widget';
    setProjectId(newId);
    setEvents((prev) => [
      `[${new Date().toLocaleTimeString()}] Project ID changed to: ${newId}`,
      ...prev
    ]);
  };

  return (
    <div>
      <div className="example-header">
        <span className="badge">Pattern 3</span>
        <h2>Advanced Custom Integration</h2>
        <p>
          Demonstrates advanced features like event handling, dynamic configuration,
          and programmatic control of the widget.
        </p>
      </div>

      <div className="grid">
        <div>
          <div className="info-box">
            <h3>Features demonstrated:</h3>
            <ul>
              <li>Dynamic project ID switching</li>
              <li>Event listener integration</li>
              <li>Ref-based widget access</li>
              <li>Real-time event logging</li>
            </ul>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Controls:</h3>
            <button
              className="button-primary"
              onClick={handleProjectIdChange}
              style={{ marginRight: '0.5rem' }}
            >
              Switch Project ID
            </button>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Current: <code>{projectId}</code>
            </p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Event Log:</h3>
            <div
              style={{
                background: '#1f2937',
                color: '#f3f4f6',
                padding: '1rem',
                borderRadius: '0.5rem',
                height: '200px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
              }}
            >
              {events.length === 0 ? (
                <div style={{ color: '#9ca3af' }}>
                  Waiting for widget events...
                </div>
              ) : (
                events.map((event, i) => (
                  <div key={i} style={{ marginBottom: '0.25rem' }}>
                    {event}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="widget-container" style={{ height: '500px' }}>
            <div className="widget-wrapper" ref={widgetRef}>
              <WidgetApp
                projectId={projectId}
                apiBaseUrl="http://localhost:3001/api"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="code-block" style={{ marginTop: '2rem' }}>
        <pre>{`import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

// Dynamic configuration
const [projectId, setProjectId] = useState('demo-support-widget');
const widgetRef = useRef<HTMLDivElement>(null);

// Listen for widget events
useEffect(() => {
  const handleEvent = (e: CustomEvent) => {
    console.log('Widget event:', e.detail);
  };

  window.addEventListener('widget:message', handleEvent);
  return () => window.removeEventListener('widget:message', handleEvent);
}, []);

// Render with dynamic props
<div ref={widgetRef}>
  <WidgetApp
    projectId={projectId}
    apiBaseUrl="http://localhost:3001/api"
  />
</div>`}</pre>
      </div>

      <div className="info-box" style={{ marginTop: '1rem' }}>
        <h3>Pro tips:</h3>
        <ul>
          <li>Use refs to access the widget element directly if needed</li>
          <li>Listen for custom events to integrate with your app state</li>
          <li>Project ID can be switched dynamically (creates new session)</li>
          <li>All configuration is backend-driven via project settings</li>
        </ul>
      </div>
    </div>
  );
}
