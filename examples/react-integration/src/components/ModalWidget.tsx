import { useState } from 'react';
import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

/**
 * Example 2: Widget in a Modal
 *
 * Shows how to conditionally render the widget in a modal/overlay.
 * This is useful for chat popups or on-demand assistance.
 */
export function ModalWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <div>
      <div className="example-header">
        <span className="badge">Pattern 2</span>
        <h2>Widget in Modal/Overlay</h2>
        <p>
          Show the widget on-demand in a modal dialog. Perfect for chat popups
          or contextual help that doesn't take up screen space until needed.
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

      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <button className="button-primary" onClick={openModal}>
          Open AI Assistant
        </button>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>
          Click to open the widget in a modal dialog
        </p>
      </div>

      {isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>AI Assistant</h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <WidgetApp
                projectId="demo-support-widget"
                apiBaseUrl="http://localhost:3001/api"
              />
            </div>
          </div>
        </div>
      )}

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
        <pre>{`import { WidgetApp } from '@kuzushi/widget';
import '@kuzushi/widget/styles.css';

const [isOpen, setIsOpen] = useState(false);

return (
  <>
    <button onClick={() => setIsOpen(true)}>
      Open Assistant
    </button>

    {isOpen && (
      <div className="modal">
        <WidgetApp
          projectId="demo-support-widget"
          apiBaseUrl="http://localhost:3001/api"
        />
      </div>
    )}
  </>
);`}</pre>
      </div>
    </div>
  );
}
