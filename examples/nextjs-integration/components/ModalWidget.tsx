'use client';

import { useState } from 'react';
import { KuzushiWidget } from './KuzushiWidget';

/**
 * Modal Widget Component
 *
 * Shows the Kuzushi widget in a modal dialog with proper state management.
 */
export function ModalWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>AI Assistant</h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <KuzushiWidget
                projectId="demo-support-widget"
                apiBaseUrl="http://localhost:3001/api"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
