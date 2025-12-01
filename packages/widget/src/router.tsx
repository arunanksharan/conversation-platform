import { createMemoryHistory, createRouter, createRootRoute, createRoute, Outlet, useRouteContext } from '@tanstack/react-router';
import { ChatLayout } from './components/ChatLayout';
import { SettingsView } from './views/SettingsView';
import { HistoryView } from './views/HistoryView';
import type { WidgetConfig } from './types';

// Root route component
function RootComponent() {
  return (
    <div className="h-full w-full flex flex-col">
      {/* Outlet renders the matched child route */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

// Create root route
const rootRoute = createRootRoute({
  component: RootComponent,
});

// Chat route (/)
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function ChatRoute() {
    const { config } = useRouteContext({ from: '/' });
    return <ChatLayout config={config} />;
  },
});

// Settings route (/settings)
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: function SettingsRoute() {
    const { config } = useRouteContext({ from: '/settings' });
    return <SettingsView config={config} />;
  },
});

// History route (/history)
const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: function HistoryRoute() {
    const { config } = useRouteContext({ from: '/history' });
    return <HistoryView config={config} />;
  },
});

// Create route tree
const routeTree = rootRoute.addChildren([
  chatRoute,
  settingsRoute,
  historyRoute,
]);

/**
 * Create memory-based router for Shadow DOM widget
 *
 * Memory router doesn't use URL bar (perfect for embedded widgets)
 * Navigation happens via router.navigate() programmatically
 */
export function createWidgetRouter(config: WidgetConfig) {
  // Create memory history (no URL changes)
  const memoryHistory = createMemoryHistory({
    initialEntries: ['/'], // Start at chat view
  });

  // Create router with memory history
  const router = createRouter({
    routeTree,
    history: memoryHistory,
    context: {
      config, // Pass config to all routes via context
    },
    defaultPreload: 'intent', // Preload on hover
  });

  return router;
}

// Export route paths for navigation
export const ROUTES = {
  CHAT: '/',
  SETTINGS: '/settings',
  HISTORY: '/history',
} as const;
