/**
 * Basic Integration Example
 * Demonstrates simple usage of the ConversationWidget
 */

import React, { useState } from 'react';
import { ConversationWidget } from '@healthcare-conversation/ui';
import type { ThemeConfig } from '@healthcare-conversation/ui';
import euroscoreSchema from '../../shared/schemas/euroscore.schema.json';
import stsSchema from '../../shared/schemas/sts.schema.json';
import './App.css';

type FormType = 'euroscore' | 'sts';

export default function App() {
  const [formType, setFormType] = useState<FormType>('euroscore');
  const [extractedData, setExtractedData] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);

  const formSchema = formType === 'euroscore' ? euroscoreSchema : stsSchema;

  const handleFieldExtracted = (field: string, value: any, confidence: number) => {
    console.log(`Field extracted: ${field} = ${value} (${Math.round(confidence * 100)}%)`);
    setExtractedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExtractionComplete = (data: Record<string, any>) => {
    console.log('Extraction complete!', data);
    setIsComplete(true);
    setExtractedData(data);
  };

  const handleSessionEnd = () => {
    console.log('Session ended');
    setExtractedData({});
    setIsComplete(false);
  };

  const customTheme: ThemeConfig = {
    primary: '#0066cc',
    secondary: '#6c5ce7',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#ea580c',
    fontFamily: 'Inter, -apple-system, sans-serif',
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    borderRadius: '0.75rem',
    spacing: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    },
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Healthcare Conversation Platform</h1>
        <p>AI-powered patient data extraction</p>
      </header>

      <div className="app-controls">
        <div className="form-selector">
          <label>Select Form Type:</label>
          <select
            value={formType}
            onChange={(e) => setFormType(e.target.value as FormType)}
          >
            <option value="euroscore">EuroSCORE II</option>
            <option value="sts">STS Risk Calculator</option>
          </select>
        </div>

        {isComplete && (
          <div className="completion-badge">
            ✓ Extraction Complete
          </div>
        )}
      </div>

      <main className="app-main">
        <div className="widget-container">
          <ConversationWidget
            apiUrl="http://localhost:3001"
            wsUrl="ws://localhost:3001"
            formSchema={formSchema}
            formType={formType}
            userId="demo-user-123"
            theme={customTheme}
            branding={{
              name: `${formType === 'euroscore' ? 'EuroSCORE II' : 'STS'} Risk Assessment`,
              logoUrl: '/logo.png',
            }}
            features={{
              showExtractionPanel: true,
              showTimestamps: true,
              showConfidence: true,
              enableVoice: false,
              showConnectionStatus: true,
            }}
            onFieldExtracted={handleFieldExtracted}
            onExtractionComplete={handleExtractionComplete}
            onSessionEnd={handleSessionEnd}
            onError={(error) => {
              console.error('Widget error:', error);
              alert(`Error: ${error.message}`);
            }}
          />
        </div>

        <aside className="extracted-data-panel">
          <h2>Extracted Data (Live)</h2>
          <div className="data-display">
            {Object.keys(extractedData).length === 0 ? (
              <p className="empty-state">No data extracted yet</p>
            ) : (
              <pre>{JSON.stringify(extractedData, null, 2)}</pre>
            )}
          </div>
        </aside>
      </main>

      <footer className="app-footer">
        <p>
          Built with{' '}
          <a
            href="https://github.com/your-org/healthcare-conversation-platform"
            target="_blank"
            rel="noopener noreferrer"
          >
            Healthcare Conversation Platform
          </a>
        </p>
      </footer>
    </div>
  );
}
