# Basic Integration Example

This example demonstrates the simplest way to integrate the Healthcare Conversation Platform widget into a React application.

## Features Demonstrated

- ✅ Basic widget integration
- ✅ Custom theme configuration
- ✅ Form type switching (EuroSCORE II / STS)
- ✅ Event handling (field extraction, completion)
- ✅ Real-time data display
- ✅ Custom branding

## Running the Example

1. **Install dependencies** (from monorepo root):
   ```bash
   pnpm install
   ```

2. **Start the backend services**:
   ```bash
   # Terminal 1: Start conversation backend
   cd packages/conversation-core
   npm run dev

   # Terminal 2: Start voice service (optional)
   cd packages/voice-pipeline
   python -m uvicorn app.main:app --reload
   ```

3. **Start the example app**:
   ```bash
   cd examples/basic-integration
   npm run dev
   ```

4. **Open browser**: Navigate to http://localhost:3000

## Code Overview

### Main Integration

```tsx
import { ConversationWidget } from '@healthcare-conversation/ui';

<ConversationWidget
  apiUrl="http://localhost:3001"
  wsUrl="ws://localhost:3001"
  formSchema={euroscoreSchema}
  formType="euroscore"
  userId="demo-user-123"
  onFieldExtracted={(field, value, confidence) => {
    console.log(`Extracted ${field}: ${value}`);
  }}
  onExtractionComplete={(data) => {
    console.log('All data extracted:', data);
  }}
/>
```

### Custom Theme

```tsx
const customTheme: ThemeConfig = {
  primary: '#0066cc',
  secondary: '#6c5ce7',
  fontFamily: 'Inter, sans-serif',
  borderRadius: '0.75rem',
  // ... more customization
};

<ConversationWidget theme={customTheme} {...props} />
```

### Event Handling

```tsx
const [extractedData, setExtractedData] = useState({});

const handleFieldExtracted = (field, value, confidence) => {
  setExtractedData(prev => ({ ...prev, [field]: value }));
};

const handleExtractionComplete = (data) => {
  console.log('Extraction complete!', data);
  // Navigate to results page, submit form, etc.
};
```

## Configuration

The widget is configured with:

- **API URL**: Backend conversation service endpoint
- **WebSocket URL**: Real-time updates endpoint
- **Form Schema**: JSON Schema defining the extraction fields
- **Form Type**: `euroscore` or `sts`
- **User ID**: Identifier for the current user/session

## Next Steps

- Explore the advanced examples for more complex integrations
- Read the [full documentation](../../packages/conversation-ui/README.md)
- Customize the theme and branding for your application
- Integrate with your existing forms and workflows
