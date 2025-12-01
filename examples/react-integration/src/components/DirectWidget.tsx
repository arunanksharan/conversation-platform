import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

/**
 * Direct React Component Integration
 *
 * This uses the widget directly as a React component,
 * without the Web Component wrapper.
 */
export function DirectWidget() {
  return (
    <div>
      <div className="example-header">
        <span className="badge">Pattern 1 (Recommended)</span>
        <h2>Direct React Component</h2>
        <p>
          The widget is imported directly as a React component.
          This is the recommended approach for React applications.
        </p>
      </div>

      <div className="info-box">
        <h3>How it works:</h3>
        <ul>
          <li>Import WidgetApp directly from @kuzushi/widget</li>
          <li>No Web Component wrapper needed</li>
          <li>Full React integration and type safety</li>
          <li>Best performance (no shadow DOM overhead)</li>
        </ul>
      </div>

      <div className="widget-container">
        <div className="widget-wrapper">
          <WidgetApp
            projectId="demo-support-widget"
            apiBaseUrl="http://localhost:3001/api"
          />
        </div>
      </div>

      <div className="info-box" style={{ marginTop: '1rem' }}>
        <h3>Try it:</h3>
        <p>Type a message like "Hello" or "What can you help me with?"</p>
      </div>
    </div>
  );
}
