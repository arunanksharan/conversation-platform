# Backend Architecture Explanation

This document provides a comprehensive explanation of the Healthcare Conversation Platform backend, tracing all request paths, WebSocket flows, data transformations, and service interactions.

---

## Table of Contents

1. [Project Structure Overview](#1-project-structure-overview)
2. [Application Bootstrap](#2-application-bootstrap)
3. [Database Layer](#3-database-layer)
4. [Authentication Flow](#4-authentication-flow)
5. [HTTP API Routes](#5-http-api-routes)
6. [WebSocket Flows](#6-websocket-flows)
7. [Service Layer Details](#7-service-layer-details)
8. [External Integrations](#8-external-integrations)
9. [Complete Data Flow Diagrams](#9-complete-data-flow-diagrams)

---

## 1. Project Structure Overview

```
packages/backend/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module - imports all feature modules
│   ├── config/
│   │   └── types.ts               # TypeScript interfaces for configuration
│   ├── auth/
│   │   ├── auth.module.ts
│   │   └── auth.service.ts        # JWT token generation/validation
│   ├── health/
│   │   ├── health.module.ts
│   │   └── health.controller.ts   # Health check endpoints
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts      # Database connection service
│   └── modules/
│       ├── tenant/                # Multi-tenant management
│       ├── app-management/        # Application CRUD
│       ├── config-management/     # Versioned configuration
│       ├── prompt/                # Prompt profile management
│       ├── widget-session/        # Session initialization
│       ├── chat/                  # Chat WebSocket gateway
│       ├── voice/                 # Voice WebSocket gateway
│       └── extraction/            # Medical field extraction
└── prisma/
    └── schema.prisma              # Database schema
```

---

## 2. Application Bootstrap

### Entry Point: `main.ts`

**Function Execution Order:**

```
bootstrap()
  ├── NestFactory.create(AppModule)
  ├── app.get(ConfigService)
  ├── app.useGlobalPipes(ValidationPipe)      # Input validation
  ├── app.enableCors()                        # CORS configuration
  ├── app.setGlobalPrefix('api')              # All routes prefixed with /api
  ├── SwaggerModule.createDocument()          # API documentation
  ├── SwaggerModule.setup('api/v1/docs')      # Swagger UI
  └── app.listen(PORT)                        # Start server (default: 3001)
```

**Server Endpoints After Bootstrap:**
- HTTP API: `http://localhost:3001/api/*`
- WebSocket (Chat): `ws://localhost:3001/ws/chat`
- WebSocket (Voice): `ws://localhost:3001/ws/voice`
- Swagger Docs: `http://localhost:3001/api/v1/docs`

### Module Loading: `app.module.ts`

```
AppModule imports (in order):
  ├── ConfigModule.forRoot()         # Environment variables
  ├── ServeStaticModule.forRoot()    # Static file serving
  ├── PrismaModule                   # Database
  ├── HealthModule                   # Health checks
  ├── AuthModule                     # JWT authentication
  ├── WidgetSessionModule            # Session management
  ├── ChatModule                     # Chat WebSocket
  ├── VoiceModule                    # Voice WebSocket
  ├── TenantModule                   # Admin: tenants
  ├── AppManagementModule            # Admin: apps
  ├── ConfigManagementModule         # Admin: configurations
  └── PromptModule                   # Admin: prompts
```

---

## 3. Database Layer

### Prisma Service: `prisma.service.ts`

**Lifecycle Methods:**
```
constructor()
  ├── Validate DATABASE_URL
  ├── new Pool({ connectionString })     # PostgreSQL pool
  ├── new PrismaPg(pool)                 # Prisma adapter
  └── super({ adapter, log: [...] })     # Initialize PrismaClient

onModuleInit()
  └── $connect()                         # Connect to database

onModuleDestroy()
  └── $disconnect()                      # Graceful shutdown
```

### Database Models (schema.prisma)

```
                    ┌─────────────┐
                    │   Tenant    │
                    │─────────────│
                    │ id (UUID)   │
                    │ name        │
                    │ slug        │
                    └──────┬──────┘
                           │ 1:N
                    ┌──────▼──────┐
                    │     App     │
                    │─────────────│
                    │ id (UUID)   │
                    │ tenantId    │
                    │ name        │
                    │ slug        │
                    │ projectId   │ ◄── Public widget ID
                    │ apiKey      │ ◄── Secret server key
                    │ isActive    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │ 1:N              │ 1:N              │ 1:N
┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
│  AppConfig    │  │ PromptProfile │  │ WidgetSession │
│───────────────│  │───────────────│  │───────────────│
│ id (UUID)     │  │ id (UUID)     │  │ id (UUID)     │
│ appId         │  │ appId         │  │ appId         │
│ version       │  │ name          │  │ configVersion │
│ isActive      │  │ kind (enum)   │  │ externalUserId│
│ features (J)  │  │ content       │  │ status (enum) │
│ uiTheme (J)   │  │ variables (J) │  │ metadata (J)  │
│ llmConfig (J) │  │ isDefault     │  └───────┬───────┘
│ voiceConfig(J)│  └───────────────┘          │
└───────────────┘                              │
                              ┌────────────────┼────────────────┐
                              │ 1:N                             │ 1:N
                      ┌───────▼───────┐                 ┌───────▼───────┐
                      │  ChatMessage  │                 │ VoiceSession  │
                      │───────────────│                 │───────────────│
                      │ id (UUID)     │                 │ id (UUID)     │
                      │ sessionId     │                 │ widgetSessionId│
                      │ role (enum)   │                 │ rtcRoomId     │
                      │ content       │                 │ status (enum) │
                      │ metadata (J)  │                 │ stats (J)     │
                      └───────────────┘                 └───────────────┘

Legend: (J) = JSON field, (enum) = enumerated type
```

**Enums:**
- `PromptKind`: SYSTEM, PRE_MESSAGE, POST_MESSAGE, TOOL_DESCRIPTION
- `SessionStatus`: ACTIVE, ENDED, ERROR
- `ChatRole`: USER, ASSISTANT, SYSTEM
- `VoiceStatus`: ACTIVE, ENDED, ERROR

---

## 4. Authentication Flow

### AuthService: `auth.service.ts`

**Token Generation:**
```
generateSessionToken(sessionId, projectId)
  ├── Build payload: { sessionId, projectId, type: 'widget' }
  └── jwtService.sign(payload)
      └── Returns: JWT token with iat, exp
```

**Token Validation:**
```
validateSessionToken(token)
  ├── jwtService.verify(token)
  │   ├── Success: Returns SessionTokenPayload
  │   └── Failure: Throws UnauthorizedException
  └── Return payload: { sessionId, projectId, type, iat, exp }

validateTokenForSession(token, sessionId)
  ├── validateSessionToken(token)
  └── payload.sessionId === sessionId
      └── Returns: boolean

extractSessionId(token)
  ├── validateSessionToken(token)
  │   ├── Success: Returns sessionId
  │   └── Failure: Returns null
  └── Safe extraction without throwing
```

---

## 5. HTTP API Routes

### 5.1 Health Endpoints

**Controller:** `health.controller.ts`
**Base Path:** `/api/health`

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| GET | `/health` | `getHealth()` | Basic health + DB check |
| GET | `/health/ready` | `getReadiness()` | K8s readiness probe |
| GET | `/health/live` | `getLiveness()` | K8s liveness probe |

**Flow: GET /api/health**
```
HealthController.getHealth()
  ├── prisma.$queryRaw`SELECT 1`
  │   ├── Success: { status: 'ok', database: 'connected' }
  │   └── Failure: { status: 'error', database: 'disconnected' }
  └── Add timestamp, service name
```

---

### 5.2 Widget Session Initialization

**Controller:** `widget-session.controller.ts`
**Base Path:** `/api/v1/widget/session`

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/init` | `initSession()` | Initialize widget session |

**Flow: POST /api/v1/widget/session/init**

```
Request Body (InitSessionDto):
{
  projectId: string,           // Required: App identifier
  widgetInstanceId: string,    // Required: Unique widget instance
  externalUserId?: string,     // Optional: Host app user ID
  pageUrl?: string,            // Optional: Embedded page URL
  hostOrigin?: string,
  userAgent?: string,
  locale?: string,
  metadata?: {
    formSchema?: object,       // Optional: Medical extraction schema
    formType?: string,         // Optional: e.g., "sts", "euroscore"
    userId?: string
  }
}
```

**Execution Path:**
```
WidgetSessionController.initSession(dto)
  └── sessionService.initSession(dto)
        │
        ├── 1. prisma.app.findUnique({ projectId })
        │     └── Include: configs (active, latest version)
        │
        ├── 2. Validation
        │     ├── App exists?
        │     ├── App active?
        │     └── Config exists?
        │
        ├── 3. Parse config data
        │     ├── features: FeaturesConfig
        │     ├── uiTheme: UiThemeConfig
        │     └── voiceConfig: VoiceConfig
        │
        ├── 4. Build session metadata
        │     └── { formSchema, formType, userId }
        │
        ├── 5. prisma.widgetSession.create()
        │     └── Store: appId, configVersion, metadata, etc.
        │
        ├── 6. Build WebSocket URLs
        │     ├── chatWsUrl: ws://host/ws/chat?sessionId=...&token=...
        │     └── voiceWsUrl: ws://host/ws/voice?sessionId=...&token=...
        │
        ├── 7. authService.generateSessionToken(sessionId, projectId)
        │
        ├── 8. prisma.promptProfile.findFirst()
        │     └── Get welcome message (PRE_MESSAGE, isDefault)
        │
        └── 9. Build InitSessionResponseDto
              ├── sessionId
              ├── configVersion
              ├── features (+ extraction flag)
              ├── theme
              ├── chat: { wsUrl }
              ├── voice?: { enabled, signalingUrl, rtcConfig }
              └── uiHints: { welcomeMessage, widgetTitle, ... }
```

---

### 5.3 Admin: Tenant Management

**Controller:** `tenant.controller.ts`
**Base Path:** `/api/v1/tenants`

| Method | Endpoint | Handler | Service Method |
|--------|----------|---------|----------------|
| POST | `/` | `create()` | `tenantService.create()` |
| GET | `/` | `findAll()` | `tenantService.findAll()` |
| GET | `/:id` | `findOne()` | `tenantService.findOne()` |
| PATCH | `/:id` | `update()` | `tenantService.update()` |

**Flow: POST /api/v1/tenants**
```
TenantController.create(dto)
  └── tenantService.create(dto)
        ├── prisma.tenant.findUnique({ slug })
        │     └── Exists? Throw ConflictException
        └── prisma.tenant.create({ data: dto })
```

**Flow: GET /api/v1/tenants/:id**
```
TenantController.findOne(id)
  └── tenantService.findOne(id)
        └── prisma.tenant.findUnique({ id })
              └── Include: apps with session counts
```

---

### 5.4 Admin: App Management

**Controller:** `app-management.controller.ts`
**Base Path:** `/api/v1/apps`

| Method | Endpoint | Handler | Service Method |
|--------|----------|---------|----------------|
| POST | `/` | `create()` | `appService.create()` |
| GET | `/` | `findAll()` | `appService.findAll()` |
| GET | `/:id` | `findOne()` | `appService.findOne()` |
| PATCH | `/:id` | `update()` | `appService.update()` |

**Flow: POST /api/v1/apps**
```
AppManagementController.create(dto)
  └── appService.create(dto)
        ├── prisma.app.findFirst({ slug OR projectId })
        │     └── Exists? Throw ConflictException
        ├── generateApiKey()
        │     └── Returns: "sk_" + randomBytes(32).hex
        └── prisma.app.create({ ...dto, apiKey })
```

---

### 5.5 Admin: Config Management

**Controller:** `config-management.controller.ts`
**Base Path:** `/api/v1/apps/:appId/configs`

| Method | Endpoint | Handler | Service Method |
|--------|----------|---------|----------------|
| POST | `/` | `create()` | `configService.create()` |
| GET | `/` | `findAll()` | `configService.findAll()` |
| GET | `/active` | `findActive()` | `configService.findActive()` |

**Flow: POST /api/v1/apps/:appId/configs**
```
ConfigManagementController.create(appId, dto)
  └── configService.create(appId, dto)
        ├── prisma.appConfig.findFirst({ appId, orderBy: version desc })
        │     └── Get latest version number
        ├── newVersion = latestVersion + 1 (or 1 if first)
        ├── If dto.isActive:
        │     └── prisma.appConfig.updateMany({ isActive: false })
        └── prisma.appConfig.create({ appId, version, ...dto })
```

---

### 5.6 Admin: Prompt Management

**Controller:** `prompt.controller.ts`
**Base Path:** `/api/v1/apps/:appId/prompts`

| Method | Endpoint | Handler | Service Method |
|--------|----------|---------|----------------|
| POST | `/` | `create()` | `promptService.create()` |
| GET | `/` | `findAll()` | `promptService.findAll()` |

**Flow: POST /api/v1/apps/:appId/prompts**
```
PromptController.create(appId, dto)
  └── promptService.create(appId, dto)
        ├── If dto.isDefault:
        │     └── prisma.promptProfile.updateMany({
        │           appId, kind: dto.kind, isDefault: true
        │         }, { isDefault: false })
        └── prisma.promptProfile.create({ appId, ...dto })
```

---

## 6. WebSocket Flows

### 6.1 Chat WebSocket Gateway

**Gateway:** `chat.gateway.ts`
**Path:** `/ws/chat`
**Events:** `message`, `user_message`, `typing`, `end_session`

#### Connection Handshake

```
Client connects: ws://host/ws/chat?sessionId=xxx&token=yyy

ChatGateway.handleConnection(client: Socket)
  │
  ├── Extract from query: sessionId, token
  │
  ├── Validate parameters
  │     └── Missing? sendError('MISSING_AUTH') → disconnect
  │
  ├── sessionService.validateSessionToken(sessionId, token)
  │     └── Invalid? sendError('INVALID_TOKEN') → disconnect
  │
  ├── Store in socket: client.data.sessionId = sessionId
  │
  ├── client.join(`session:${sessionId}`)
  │
  ├── sessionService.updateLastSeen(sessionId)
  │
  └── sendMessage(client, {
        type: 'session_ack',
        sessionId,
        status: 'ok'
      })
```

#### Disconnection

```
ChatGateway.handleDisconnect(client: Socket)
  │
  ├── Get sessionId from client.data
  │
  └── sessionService.updateLastSeen(sessionId)
```

#### Event: user_message

```
Client sends: { type: 'user_message', content: 'Hello...' }

ChatGateway.handleUserMessage(client, data)
  │
  ├── Get sessionId from client.data
  │     └── Missing? sendError('NO_SESSION')
  │
  ├── chatService.saveMessage(sessionId, 'USER', content)
  │     └── prisma.chatMessage.create()
  │
  ├── sessionService.getSession(sessionId)
  │     └── Returns session with app, configs, promptProfiles, messages
  │
  ├── Generate messageId: `msg_${Date.now()}`
  │
  ├── chatService.generateStreamingResponse(session, content, onToken, onComplete)
  │     │
  │     ├── onToken callback (for each token):
  │     │     └── sendMessage({ type: 'token', messageId, delta: token })
  │     │
  │     └── onComplete callback:
  │           ├── chatService.saveMessage(sessionId, 'ASSISTANT', fullContent)
  │           └── sendMessage({ type: 'message', messageId, role: 'assistant', content })
  │
  └── If extraction enabled:
        └── runExtractionAsync(client, session, content)
              │
              ├── chatService.extractMedicalFields(session, content)
              │
              └── sendMessage({
                    type: 'extraction_update',
                    extractionId,
                    fields: [{ fieldName, value, confidence }],
                    extractionStatus,
                    overallConfidence
                  })
```

#### Event: typing

```
ChatGateway.handleTyping(client, data)
  │
  ├── Get sessionId from client.data
  │
  └── client.to(`session:${sessionId}`).emit('typing', { state: data.state })
```

#### Event: end_session

```
ChatGateway.handleEndSession(client)
  │
  ├── Get sessionId from client.data
  │
  ├── sessionService.endSession(sessionId)
  │     └── prisma.widgetSession.update({ status: 'ENDED', endedAt: now })
  │
  └── sendMessage({ type: 'status', status: 'session_ended' })
```

---

### 6.2 Voice WebSocket Gateway

**Gateway:** `voice.gateway.ts`
**Path:** `/ws/voice`
**Events:** `message`, `init`, `offer`, `answer`, `ice_candidate`, `end_voice_session`

#### Connection Handshake

```
Client connects: ws://host/ws/voice?sessionId=xxx&token=yyy

VoiceGateway.handleConnection(client: Socket)
  │
  ├── Extract from query: sessionId, token
  │
  ├── Validate parameters
  │     └── Missing? sendError('MISSING_AUTH') → disconnect
  │
  ├── sessionService.validateSessionToken(sessionId, token)
  │     └── Invalid? sendError('INVALID_TOKEN') → disconnect
  │
  └── Store in socket: client.data.sessionId = sessionId
```

#### Disconnection

```
VoiceGateway.handleDisconnect(client: Socket)
  │
  ├── Get voiceSessionId from client.data
  │
  └── voiceService.endVoiceSession(voiceSessionId)
        └── prisma.voiceSession.update({ status: 'ENDED' })
```

#### Event: init

```
VoiceGateway.handleInit(client, data)
  │
  ├── Get sessionId from client.data
  │     └── Missing? sendError('NO_SESSION')
  │
  ├── voiceService.createVoiceSession(sessionId)
  │     └── prisma.voiceSession.create({ widgetSessionId, status: 'ACTIVE' })
  │
  ├── Store: client.data.voiceSessionId = voiceSession.id
  │
  └── sendMessage({ type: 'voice_session_started', voiceSessionId })
```

#### Event: offer (WebRTC SDP Offer)

```
VoiceGateway.handleOffer(client, data)
  │
  ├── Get voiceSessionId from client.data
  │     └── Missing? sendError('NO_VOICE_SESSION')
  │
  ├── voiceService.handleOffer(voiceSessionId, data.sdp)
  │     │
  │     │ [Production: Forward to LiveKit/Daily media server]
  │     │
  │     └── Returns: answerSdp
  │
  └── sendMessage({ type: 'answer', sdp: answerSdp })
```

#### Event: answer (WebRTC SDP Answer)

```
VoiceGateway.handleAnswer(client, data)
  │
  ├── Get voiceSessionId from client.data
  │
  └── voiceService.handleAnswer(voiceSessionId, data.sdp)
        └── prisma.voiceSession.update({ signalingChannelId: 'negotiated' })
```

#### Event: ice_candidate

```
VoiceGateway.handleIceCandidate(client, data)
  │
  └── Log ICE candidate (relay to media server in production)
```

#### Event: end_voice_session

```
VoiceGateway.handleEndVoiceSession(client)
  │
  ├── Get voiceSessionId from client.data
  │
  ├── voiceService.endVoiceSession(voiceSessionId)
  │
  ├── sendMessage({ type: 'voice_session_ended', reason: 'USER_ENDED' })
  │
  └── client.data.voiceSessionId = null
```

---

## 7. Service Layer Details

### 7.1 ChatService: `chat.service.ts`

**Dependencies:**
- `PrismaService` - Database operations
- `ConfigService` - Environment variables
- `ExtractionService` - Medical field extraction
- `OpenAI` - LLM API client

**Methods:**

```
saveMessage(sessionId, role, content)
  └── prisma.chatMessage.create({ sessionId, role, content })

getChatHistory(sessionId)
  └── prisma.chatMessage.findMany({ sessionId, orderBy: createdAt asc })

generateStreamingResponse(session, userMessage, onToken, onComplete)
  │
  ├── Extract llmConfig from session.app.configs[0]
  │
  ├── getSystemPrompt(session)
  │     ├── Find SYSTEM prompt from promptProfiles
  │     └── Fallback: generic assistant prompt
  │
  ├── getChatHistory(session.id)
  │     └── Get last 10 messages for context
  │
  ├── Build OpenAI messages array:
  │     ├── { role: 'system', content: systemPrompt }
  │     ├── ...history (mapped roles)
  │     └── { role: 'user', content: userMessage }
  │
  ├── openai.chat.completions.create({
  │     model: llmConfig.model || 'gpt-4-turbo',
  │     messages,
  │     temperature: llmConfig.temperature || 0.7,
  │     max_tokens: llmConfig.maxTokens || 2000,
  │     stream: true
  │   })
  │
  ├── For each chunk in stream:
  │     ├── Extract delta content
  │     ├── Accumulate fullContent
  │     └── await onToken(delta)
  │
  └── await onComplete(fullContent)

extractMedicalFields(session, userMessage)
  │
  ├── Check session.metadata for formSchema, formType
  │     └── Missing? Return null
  │
  ├── getChatHistory(session.id)
  │
  ├── Build messages (last 10 + current)
  │
  ├── Get llmConfig
  │
  └── extractionService.extractFields(messages, formSchema, formType, llmConfig)

hasExtractionEnabled(session)
  └── Return: !!(session.metadata?.formSchema && session.metadata?.formType)
```

---

### 7.2 ExtractionService: `extraction.service.ts`

**Purpose:** Convert form schemas to OpenAI function tools and extract structured medical data.

**Methods:**

```
schemaToFunctionTool(formSchema, formType)
  │
  ├── For each field in formSchema.properties:
  │     ├── Map type (integer, number, string, boolean)
  │     ├── Build description (title + description + medicalTerms)
  │     ├── Add enum if present
  │     └── Add min/max if present
  │
  └── Return ChatCompletionTool:
        {
          type: 'function',
          function: {
            name: `extract_${formType}_fields`,
            description: 'Extract medical fields...',
            parameters: {
              type: 'object',
              properties: {
                extracted_fields: { ... },
                confidence_scores: { ... },
                extraction_notes: { ... }
              }
            }
          }
        }

extractFields(messages, formSchema, formType, llmConfig?)
  │
  ├── Generate extractionId
  │
  ├── schemaToFunctionTool(formSchema, formType)
  │
  ├── Build system prompt (extraction specialist)
  │
  ├── Build extractionMessages:
  │     ├── { role: 'system', content: systemPrompt }
  │     ├── ...messages
  │     └── { role: 'user', content: 'Extract all relevant fields...' }
  │
  ├── openai.chat.completions.create({
  │     model: llmConfig?.model || 'gpt-4-turbo',
  │     messages: extractionMessages,
  │     tools: [tool],
  │     tool_choice: { type: 'function', function: { name: tool.function.name } },
  │     temperature: 0.1  // Low for consistent extraction
  │   })
  │
  ├── Parse tool call arguments
  │
  ├── Build ExtractedField array:
  │     └── { fieldName, value, confidence }
  │
  ├── Calculate average confidence
  │
  └── Return ExtractionResult:
        { extractionId, fields, status, confidence, rawToolCall }

extractFromMessage(userMessage, previousExtractions, formSchema, formType)
  │
  ├── Build messages with previous extraction context
  │
  └── extractFields(messages, formSchema, formType)
```

---

### 7.3 WidgetSessionService: `widget-session.service.ts`

**Methods:**

```
initSession(dto)
  └── [See HTTP API Routes section 5.2]

getSession(sessionId)
  └── prisma.widgetSession.findUnique({
        id: sessionId,
        include: {
          app: { configs, promptProfiles },
          chatMessages: { orderBy: createdAt asc }
        }
      })

updateLastSeen(sessionId)
  └── prisma.widgetSession.update({
        id: sessionId,
        data: { lastSeenAt: new Date() }
      })

endSession(sessionId)
  └── prisma.widgetSession.update({
        id: sessionId,
        data: { status: 'ENDED', endedAt: new Date() }
      })

validateSessionToken(sessionId, token)
  └── authService.validateTokenForSession(token, sessionId)
```

---

### 7.4 VoiceService: `voice.service.ts`

**Methods:**

```
createVoiceSession(widgetSessionId)
  └── prisma.voiceSession.create({
        widgetSessionId,
        status: 'ACTIVE'
      })

handleOffer(voiceSessionId, offerSdp)
  │
  │ [Production: Integrate with LiveKit/Daily/Twilio]
  │ 1. Create room in media server
  │ 2. Generate participant token
  │ 3. Get answer SDP
  │
  └── Return: answerSdp (placeholder in current implementation)

handleAnswer(voiceSessionId, answerSdp)
  └── prisma.voiceSession.update({
        id: voiceSessionId,
        data: { signalingChannelId: 'negotiated' }
      })

endVoiceSession(voiceSessionId)
  └── prisma.voiceSession.update({
        id: voiceSessionId,
        data: { status: 'ENDED', endedAt: new Date() }
      })

getVoiceSessionStats(voiceSessionId)
  └── prisma.voiceSession.findUnique({
        id: voiceSessionId,
        select: { id, status, startedAt, endedAt, stats }
      })
```

---

## 8. External Integrations

### 8.1 OpenAI Integration

**Used by:** ChatService, ExtractionService

**Configuration:**
- API Key: `OPENAI_API_KEY` environment variable
- Default model: `gpt-4-turbo`
- Configurable per-app via `llmConfig` in AppConfig

**Chat Completion Flow:**
```
openai.chat.completions.create({
  model,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message1 },
    { role: 'assistant', content: response1 },
    ...
    { role: 'user', content: currentMessage }
  ],
  temperature,
  max_tokens,
  stream: true  // For real-time token streaming
})
```

**Function Calling (Extraction):**
```
openai.chat.completions.create({
  model,
  messages,
  tools: [extractionFunctionTool],
  tool_choice: { type: 'function', function: { name } },
  temperature: 0.1  // Low for deterministic extraction
})
```

### 8.2 WebRTC/Media Server (Placeholder)

**Current State:** Placeholder implementation
**Production Options:**
- LiveKit
- Daily.co
- Twilio
- Custom WebRTC server

**Integration Points in VoiceService:**
- `handleOffer()` - Forward to media server, get answer
- `handleAnswer()` - Update negotiation state
- ICE candidate relay

---

## 9. Complete Data Flow Diagrams

### 9.1 Widget Initialization Flow

```
┌─────────┐         ┌─────────────┐         ┌───────────┐         ┌──────────┐
│  Client │         │   Backend   │         │  Prisma   │         │ Database │
└────┬────┘         └──────┬──────┘         └─────┬─────┘         └────┬─────┘
     │                     │                      │                     │
     │ POST /api/v1/widget/session/init           │                     │
     │ { projectId, widgetInstanceId, ... }       │                     │
     │─────────────────────►                      │                     │
     │                     │                      │                     │
     │                     │ findUnique(projectId)│                     │
     │                     │──────────────────────►                     │
     │                     │                      │ SELECT * FROM apps  │
     │                     │                      │─────────────────────►
     │                     │                      │◄─────────────────────
     │                     │◄──────────────────────                     │
     │                     │                      │                     │
     │                     │ create(widgetSession)│                     │
     │                     │──────────────────────►                     │
     │                     │                      │ INSERT INTO sessions│
     │                     │                      │─────────────────────►
     │                     │                      │◄─────────────────────
     │                     │◄──────────────────────                     │
     │                     │                      │                     │
     │                     │ generateSessionToken │                     │
     │                     │ (JWT)                │                     │
     │                     │                      │                     │
     │ { sessionId, wsUrl, token, features, ... } │                     │
     │◄─────────────────────                      │                     │
     │                     │                      │                     │
```

### 9.2 Chat Message Flow

```
┌─────────┐         ┌─────────────┐         ┌────────┐         ┌──────────┐
│  Client │         │ChatGateway  │         │ChatSvc │         │  OpenAI  │
└────┬────┘         └──────┬──────┘         └───┬────┘         └────┬─────┘
     │                     │                    │                    │
     │ WS: user_message    │                    │                    │
     │ { content: "..." }  │                    │                    │
     │─────────────────────►                    │                    │
     │                     │                    │                    │
     │                     │ saveMessage(USER)  │                    │
     │                     │────────────────────►                    │
     │                     │                    │                    │
     │                     │ getSession()       │                    │
     │                     │────────────────────►                    │
     │                     │◄────────────────────                    │
     │                     │                    │                    │
     │                     │ generateStreamingResponse               │
     │                     │────────────────────►                    │
     │                     │                    │ chat.completions   │
     │                     │                    │ (stream: true)     │
     │                     │                    │────────────────────►
     │                     │                    │                    │
     │ WS: token { delta } │                    │◄─ token chunk 1 ───│
     │◄─────────────────────────────────────────│                    │
     │                     │                    │                    │
     │ WS: token { delta } │                    │◄─ token chunk 2 ───│
     │◄─────────────────────────────────────────│                    │
     │                     │                    │       ...          │
     │                     │                    │◄─ token chunk N ───│
     │◄─────────────────────────────────────────│                    │
     │                     │                    │                    │
     │                     │ saveMessage(ASSISTANT)                  │
     │                     │────────────────────►                    │
     │                     │                    │                    │
     │ WS: message { content: fullResponse }    │                    │
     │◄─────────────────────                    │                    │
     │                     │                    │                    │
```

### 9.3 Medical Extraction Flow (Parallel to Chat)

```
┌─────────┐         ┌─────────────┐         ┌───────────┐         ┌──────────┐
│  Client │         │ChatGateway  │         │ExtrSvc    │         │  OpenAI  │
└────┬────┘         └──────┬──────┘         └─────┬─────┘         └────┬─────┘
     │                     │                      │                     │
     │                     │ [After chat response]│                     │
     │                     │                      │                     │
     │                     │ extractMedicalFields │                     │
     │                     │──────────────────────►                     │
     │                     │                      │                     │
     │                     │                      │ schemaToFunctionTool│
     │                     │                      │ (build tool def)    │
     │                     │                      │                     │
     │                     │                      │ chat.completions   │
     │                     │                      │ (function calling)  │
     │                     │                      │─────────────────────►
     │                     │                      │                     │
     │                     │                      │ { tool_calls: [...] │
     │                     │                      │   extracted_fields, │
     │                     │                      │   confidence_scores │
     │                     │                      │ }                   │
     │                     │                      │◄─────────────────────
     │                     │                      │                     │
     │                     │ ExtractionResult     │                     │
     │                     │◄──────────────────────                     │
     │                     │                      │                     │
     │ WS: extraction_update                      │                     │
     │ { fields, confidence }                     │                     │
     │◄─────────────────────                      │                     │
     │                     │                      │                     │
```

### 9.4 Voice Session Flow

```
┌─────────┐         ┌─────────────┐         ┌─────────┐         ┌───────────┐
│  Client │         │VoiceGateway │         │VoiceSvc │         │MediaServer│
└────┬────┘         └──────┬──────┘         └────┬────┘         └─────┬─────┘
     │                     │                     │                     │
     │ WS: init            │                     │                     │
     │─────────────────────►                     │                     │
     │                     │ createVoiceSession  │                     │
     │                     │─────────────────────►                     │
     │                     │◄─────────────────────                     │
     │ WS: voice_session_started                 │                     │
     │◄─────────────────────                     │                     │
     │                     │                     │                     │
     │ WS: offer { sdp }   │                     │                     │
     │─────────────────────►                     │                     │
     │                     │ handleOffer(sdp)    │                     │
     │                     │─────────────────────►                     │
     │                     │                     │ [Create room]       │
     │                     │                     │─────────────────────►
     │                     │                     │◄─────────────────────
     │                     │◄─────────────────────                     │
     │ WS: answer { sdp }  │                     │                     │
     │◄─────────────────────                     │                     │
     │                     │                     │                     │
     │ WS: ice_candidate   │                     │                     │
     │─────────────────────►                     │                     │
     │                     │ [Relay to server]   │                     │
     │                     │                     │                     │
     │═══════ WebRTC Media Stream Established ═══════════════════════│
     │                     │                     │                     │
     │ WS: end_voice_session                     │                     │
     │─────────────────────►                     │                     │
     │                     │ endVoiceSession     │                     │
     │                     │─────────────────────►                     │
     │ WS: voice_session_ended                   │                     │
     │◄─────────────────────                     │                     │
     │                     │                     │                     │
```

---

## Summary

The backend is built on NestJS with a modular architecture:

1. **Entry Point:** `bootstrap()` in `main.ts` initializes the app with validation, CORS, Swagger
2. **Database:** Prisma with PostgreSQL, multi-tenant model (Tenant → App → Session)
3. **Authentication:** JWT tokens for widget sessions, validated on WebSocket connect
4. **HTTP APIs:** RESTful endpoints for admin (CRUD) and widget (session init)
5. **WebSockets:** Socket.io gateways for real-time chat and voice signaling
6. **AI Integration:** OpenAI for chat completions (streaming) and function calling (extraction)
7. **Medical Extraction:** Converts JSON Schema to OpenAI tools, extracts structured data with confidence scores

**Key Execution Patterns:**
- Session initialization returns WebSocket URLs with embedded JWT tokens
- Chat messages are streamed token-by-token for real-time UX
- Extraction runs in parallel (non-blocking) after chat response
- Voice uses WebRTC signaling (placeholder for actual media server integration)
