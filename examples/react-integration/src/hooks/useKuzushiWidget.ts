import { useEffect, useState } from 'react';

// Global state to track script loading across all component instances
// This ensures the script loads only once, regardless of how many components use the hook
let scriptLoading = false; // True while script is being loaded
let scriptLoaded = false;  // True once script has loaded successfully
const loadCallbacks: Array<() => void> = []; // Queue of callbacks waiting for script to load

// Get API base URL from environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_WIDGET_API_URL || 'http://localhost:3001/api';

/**
 * Hook to load the Kuzushi widget loader script
 *
 * This hook implements a singleton pattern to ensure the widget loader script
 * is loaded exactly once, even when multiple components mount simultaneously.
 *
 * **Key Features:**
 * - Loads script only once across all component instances
 * - Handles race conditions when multiple components mount at the same time
 * - Provides loading state to all consumers
 * - Safe cleanup that doesn't remove the shared script
 *
 * **Usage:**
 * ```tsx
 * function MyComponent() {
 *   const isLoaded = useKuzushiWidget();
 *
 *   return (
 *     <div>
 *       {!isLoaded && <div>Loading...</div>}
 *       <kuzushi-widget project-id="demo" />
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {boolean} True when the widget script has loaded and is ready to use
 */
export function useKuzushiWidget(): boolean {
  // Local state for this component instance
  const [isLoaded, setIsLoaded] = useState(scriptLoaded);

  useEffect(() => {
    // CASE 1: Script already loaded (from a previous component)
    // Just update this component's state and return
    if (scriptLoaded) {
      setIsLoaded(true);
      return;
    }

    // CASE 2: Script is currently being loaded by another component
    // Add this component to the callback queue and wait
    if (scriptLoading) {
      const callback = () => setIsLoaded(true);
      loadCallbacks.push(callback);

      // Cleanup: Remove this component's callback if it unmounts before script loads
      return () => {
        const index = loadCallbacks.indexOf(callback);
        if (index > -1) {
          loadCallbacks.splice(index, 1);
        }
      };
    }

    // CASE 3: Check if script already exists in DOM
    // This handles cases like hot module reload or navigating between pages
    const existingScript = document.querySelector(
      'script[src*="widget-loader.js"]'
    );

    if (existingScript) {
      scriptLoaded = true;
      setIsLoaded(true);
      return;
    }

    // CASE 4: No script exists - this component will load it
    // Set flag to prevent other components from also loading it
    scriptLoading = true;

    // Create and configure the script element
    const script = document.createElement('script');
    const scriptUrl = API_BASE_URL.replace('/api', '');
    script.src = `${scriptUrl}/static/widget-loader.js`;
    script.async = true; // Non-blocking load

    // Handle successful load
    script.onload = () => {
      console.log('[useKuzushiWidget] Widget loader script loaded successfully');

      // Update global flags
      scriptLoaded = true;
      scriptLoading = false;

      // Update this component's state
      setIsLoaded(true);

      // Notify all components that were waiting
      loadCallbacks.forEach((callback) => callback());
      loadCallbacks.length = 0; // Clear the queue
    };

    // Handle load failure
    script.onerror = (error) => {
      console.error('[useKuzushiWidget] Failed to load widget loader script:', error);

      // Reset loading flag so another component can retry
      scriptLoading = false;

      // Still notify callbacks (they can check if scriptLoaded is true)
      loadCallbacks.forEach((callback) => callback());
      loadCallbacks.length = 0;
    };

    // Add script to DOM to start loading
    document.body.appendChild(script);

    // Cleanup function
    // NOTE: We do NOT remove the script tag because:
    // 1. Other components may be using it
    // 2. It's a shared resource that should persist
    // 3. The browser handles script caching automatically
    return () => {
      // Only cleanup: remove this component's callback if it was added
      // This prevents memory leaks if component unmounts while script is loading
      const callback = () => setIsLoaded(true);
      const index = loadCallbacks.indexOf(callback);
      if (index > -1) {
        loadCallbacks.splice(index, 1);
      }
    };
  }, []); // Empty deps - only run on mount

  return isLoaded;
}
