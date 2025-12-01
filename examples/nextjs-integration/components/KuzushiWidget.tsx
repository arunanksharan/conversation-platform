'use client';

import { useEffect, useState } from 'react';

interface KuzushiWidgetProps {
  projectId?: string;
  apiBaseUrl?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Client Component wrapper for Kuzushi Widget
 *
 * This component handles:
 * - Loading the widget loader script
 * - Showing loading state
 * - Proper cleanup on unmount
 */
export function KuzushiWidget({
  projectId = process.env.NEXT_PUBLIC_WIDGET_PROJECT_ID || 'demo-support-widget',
  apiBaseUrl = process.env.NEXT_PUBLIC_WIDGET_API_URL || 'http://localhost:3001/api',
  style,
  className,
}: KuzushiWidgetProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector(
      'script[src*="widget-loader.js"]'
    );

    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    // Load the widget loader script
    const script = document.createElement('script');
    script.src = `${apiBaseUrl.replace('/api', '')}/static/widget-loader.js`;
    script.async = true;

    script.onload = () => {
      console.log('[KuzushiWidget] Widget loader script loaded');
      setIsLoaded(true);
    };

    script.onerror = () => {
      console.error('[KuzushiWidget] Failed to load widget loader script');
      setError('Failed to load widget. Please check your backend is running.');
    };

    document.body.appendChild(script);

    return () => {
      // Note: We don't remove the script on unmount because it may be used
      // by multiple instances of the widget across different pages
    };
  }, [apiBaseUrl]);

  if (error) {
    return (
      <div className="loading-state">
        <p style={{ color: '#dc2626' }}>❌ {error}</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!isLoaded && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading widget...</p>
        </div>
      )}
      <kuzushi-widget
        project-id={projectId}
        api-base-url={apiBaseUrl}
        style={{
          ...style,
          display: isLoaded ? 'block' : 'none',
          width: '100%',
          height: '100%',
        }}
        className={className}
      />
    </div>
  );
}
