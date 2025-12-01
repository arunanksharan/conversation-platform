import { useKuzushiWidget } from '../hooks/useKuzushiWidget';

/**
 * Example 1: Simple Embedded Widget
 *
 * This is the most straightforward integration - just use the custom element
 * directly in your JSX. The widget loader handles everything automatically.
 */
export function EmbeddedWidget() {
  const isLoaded = useKuzushiWidget();

  return (
    <div>
      <div className="example-header">
        <span className="badge">Pattern 1</span>
        <h2>Simple Embedded Widget</h2>
        <p>
          The widget is embedded directly using the custom element. This is the
          simplest integration pattern - just add the element to your JSX.
        </p>
      </div>

      <div className="info-box">
        <h3>How it works:</h3>
        <ul>
          <li>Load the widget-loader script from your backend</li>
          <li>Use the <code>&lt;kuzushi-widget&gt;</code> custom element</li>
          <li>Widget automatically initializes and connects</li>
          <li>All styling is isolated via Shadow DOM</li>
        </ul>
      </div>

      <div className="widget-container">
        <div className="widget-wrapper">
          {!isLoaded && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading widget...</p>
            </div>
          )}
          <kuzushi-widget
            project-id="demo-support-widget"
            api-base-url="http://localhost:3001/api"
            style={{ width: '100%', height: '100%', display: isLoaded ? 'block' : 'none' }}
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
