# Healthcare Conversation Platform - Architecture

## Data Flow Verification

### Complete Request Flow (User Message → Extraction → UI Update)

```
1. USER TYPES MESSAGE
   ↓
2. React Component calls sendMessage()
   ↓
3. useConversation hook → API Client
   ↓
4. HTTP POST /api/conversations/:id/messages
   {
     role: "user",
     content: "Patient is 72 years old...",
     userId: "...",
     triggerExtraction: true
   }
   ↓
5. NestJS ConversationController.sendMessage()
   ↓
6. ConversationService.sendMessage()
   ├─→ MessagesService.create() → Save to MongoDB
   └─→ ExtractionService.extract() → Call OpenAI GPT-4
       ↓
7. ExtractionResult {
     extracted: {
       age: { value: 72, confidence: 1.0, ... },
       sex: { value: "female", confidence: 0.9, ... }
     },
     missingFields: ["creatinine_clearance", ...],
     clarifyingQuestions: ["What is the creatinine clearance?"]
   }
   ↓
8. SessionsService.bulkUpdateExtractedData()
   ↓
9. WebSocket broadcast via ConversationGateway
   socket.emit('extraction_update', {...})
   ↓
10. Frontend useWebSocket receives event
   ↓
11. Zustand store.bulkUpdateExtractedData()
   ↓
12. React components re-render with new data
   ├─→ MessageList shows new message
   ├─→ ExtractionPanel shows updated fields
   └─→ ProgressBar updates percentage
```

## Type Alignment Matrix

| Data Structure | Backend Type | Frontend Type | Status |
|----------------|--------------|---------------|--------|
| Message | Message (Mongoose) | Message (types/index.ts) | ✅ Aligned |
| Session | Session (Mongoose) | Session (types/index.ts) | ✅ Aligned |
| Extraction Result | ExtractionResult (extraction.service) | ExtractionResult (types/index.ts) | ✅ Aligned |
| WebSocket Events | ConversationGateway | useWebSocket | ✅ Aligned |

## API Contract Verification

### POST /api/conversations
**Request:**
```typescript
{
  userId: string;
  formType: 'euroscore' | 'sts' | 'custom';
  formSchema: Record<string, any>;
  title?: string;
  mode?: 'text' | 'voice' | 'mixed';
  locale?: string;
}
```

**Response:**
```typescript
{
  sessionId: string;
  session: Session;
}
```

**Frontend:** ✅ Matches in `api/client.ts`

### POST /api/conversations/:id/messages
**Request:**
```typescript
{
  role: 'user' | 'assistant';
  content: string;
  userId?: string;
  triggerExtraction?: boolean;
}
```

**Response:**
```typescript
{
  message: Message;
  extractionTriggered: boolean;
  extraction?: ExtractionResult;
}
```

**Frontend:** ✅ Matches in `api/client.ts`

## WebSocket Events Contract

### Backend Emits:
1. `new_message` → `{ message: Message }`
2. `extraction_update` → `{ extracted, missingFields, clarifyingQuestions }`
3. `field_extracted` → `{ field, value, confidence }`
4. `clarification_needed` → `{ question }`
5. `progress_update` → `{ extractedFieldsCount, completionPercentage }`

### Frontend Listens:
✅ All events handled in `useWebSocket.ts`

## Component Data Flow

```
ConversationWidget
  ├─ useConversation() ─────┐
  │   ├─ API Client         │
  │   ├─ WebSocket          │
  │   └─ Zustand Store      │
  │                          │
  ├─ ChatHeader              │
  │   └─ session.title ──────┤
  │                          │
  ├─ MessageList             │
  │   └─ messages[] ─────────┤
  │       └─ Message         │
  │           └─ role, content, createdAt
  │                          │
  ├─ ExtractionPanel         │
  │   ├─ extractedData ──────┤
  │   ├─ extractionConfidence│
  │   ├─ missingFields       │
  │   └─ completionPercentage│
  │                          │
  └─ ChatInput               │
      └─ sendMessage() ──────┘
```

## State Management Flow

```
Zustand Store (Single Source of Truth)
  ├─ session: Session | null
  ├─ messages: Message[]
  ├─ extractedData: Record<string, any>
  ├─ extractionConfidence: Record<string, number>
  ├─ missingFields: string[]
  ├─ completionPercentage: number
  ├─ isConnected: boolean
  ├─ isLoading: boolean
  └─ error: string | null

Updated by:
  1. API responses (direct updates)
  2. WebSocket events (real-time updates)
  3. User actions (optimistic updates)

Consumed by:
  - useConversation hook (business logic)
  - React components (UI rendering)
```

## Error Handling Strategy

```
API Error → API Client throws
            ↓
useConversation catches
            ↓
store.setError(message)
            ↓
Components show <ErrorState />
            ↓
User can retry or clear
```

## Loading States

```
1. Initial Load: isLoading=true, messages=[]
2. Sending Message: isTyping=true
3. Extracting: isLoading=true, show extraction spinner
4. WebSocket Connecting: isConnected=false, show "Connecting..."
```

---

✅ **All integration points verified and aligned**
✅ **Types match across all layers**
✅ **API contracts defined and implemented**
✅ **Data flow documented**
✅ **Ready to build visual components**
