# Kuzushi Widget - Example Host Site

This is a demonstration of how to embed the Kuzushi AI assistant widget into any website.

## Quick Start

1. **Start the backend**:
   ```bash
   cd ../../packages/backend
   pnpm install
   pnpm run db:migrate
   pnpm run db:seed
   pnpm run start:dev
   ```

2. **Build the widget packages**:
   ```bash
   # From root directory
   pnpm install
   pnpm build
   ```

3. **Serve this example site**:
   ```bash
   pnpm install
   pnpm dev
   ```

4. **Open in browser**:
   - Navigate to `http://localhost:8080`
   - The widget should load and connect to the backend

## How It Works

The widget is embedded using a single custom element:

```html
<script src="/widget-loader.js"></script>
<kuzushi-widget
  project-id="demo-support-widget"
  api-base-url="http://localhost:3001/api"
></kuzushi-widget>
```

### Attributes

- `project-id`: The project ID from your backend configuration
- `api-base-url`: URL of your Kuzushi backend API

### What Happens

1. **Loader Script**: Defines the `<kuzushi-widget>` custom element
2. **Session Init**: Calls `/v1/widget/session/init` to get configuration
3. **Shadow DOM**: Creates isolated Shadow DOM for styling
4. **Dynamic Import**: Loads the React widget bundle
5. **WebSocket**: Connects to chat and voice signaling endpoints
6. **LLM Integration**: Messages are processed by OpenAI GPT-4

## Customization

The widget's appearance and behavior is controlled entirely by the backend configuration. To customize:

1. Update the `AppConfig` for your app
2. Modify the `PromptProfile` for different AI personalities
3. Change theme colors in `uiTheme` configuration

No frontend code changes needed!

## Multi-Tenancy

Try creating a second app with a different `project-id` and you'll see how the same widget code can serve multiple tenants with different configurations.

## Production Deployment

For production:

1. Change `api-base-url` to your production backend
2. Host `widget-loader.js` on a CDN
3. Ensure CORS is configured properly
4. Use HTTPS for secure WebSocket connections

