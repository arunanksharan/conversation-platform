import { useState } from 'react';
import './App.css';
import { DirectWidget } from './components/DirectWidget';
import { ModalWidget } from './components/ModalWidget';
import { CustomIntegration } from './components/CustomIntegration';

type Tab = 'direct' | 'modal' | 'custom';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('direct');

  return (
    <div className="app">
      <header className="header">
        <h1>Kuzushi Widget - React Integration</h1>
        <p>Complete examples of integrating the AI assistant into React applications</p>
      </header>

      <div className="container">
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => setActiveTab('direct')}
          >
            ⚛️ Direct React Component
          </button>
          <button
            className={`nav-tab ${activeTab === 'modal' ? 'active' : ''}`}
            onClick={() => setActiveTab('modal')}
          >
            💬 Modal Widget
          </button>
          <button
            className={`nav-tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            ⚙️ Advanced Integration
          </button>
        </nav>

        <div className="tab-content">
          {activeTab === 'direct' && <DirectWidget />}
          {activeTab === 'modal' && <ModalWidget />}
          {activeTab === 'custom' && <CustomIntegration />}
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
      </div>
    </div>
  );
}

export default App;
