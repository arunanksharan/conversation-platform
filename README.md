# 🚀 Kuzushi Widget Platform

A **world-class, production-ready, multi-tenant embeddable AI assistant widget platform** supporting both text chat (WebSocket) and real-time voice (WebRTC), with all intelligence, prompts, and configuration managed from the backend.

## ✨ Features

### Frontend Widget
- ✅ **Universal Embeddable Widget** - Built with r2wc (React to Web Component)
- ✅ **Shadow DOM Isolation** - Complete style and script isolation from host page
- ✅ **React 19.0+ + TypeScript** - Modern, type-safe codebase (enforced peer dependency)
- ✅ **Tailwind CSS v4** - Beautiful, themeable UI with container queries
- ✅ **React Aria Components** - Shadow DOM-safe, accessible primitives (better than Radix for widgets)
- ✅ **shadcn-inspired Design** - Badge, Avatar, Separator, Card, Button, Input components
- ✅ **Real-time Chat** - WebSocket-based messaging with streaming support
- ✅ **Voice Assistant** - WebRTC voice calling with signaling
- ✅ **Backend-Driven UI** - All text, colors, and branding controlled via UI hints
- ✅ **Multi-tenant Ready** - Same widget code serves different tenants

### Backend
- ✅ **Multi-tenant Architecture** - Tenant → App → Config → PromptProfile → Sessions
- ✅ **JWT Authentication** - Secure session tokens with expiration and signature verification
- ✅ **NestJS + TypeScript** - Enterprise-grade Node.js framework
- ✅ **PostgreSQL + Prisma** - Type-safe database with migrations
- ✅ **OpenAI Integration** - GPT-4 powered conversations with streaming
- ✅ **WebSocket Gateways** - Real-time chat and voice signaling with JWT validation
- ✅ **Externalized Prompts** - Backend-managed SYSTEM and PRE_MESSAGE (welcome) prompts
- ✅ **UI Hints System** - Per-app customization of widget text, colors, and branding
- ✅ **Versioned Configurations** - Config changes without widget redeployment
- ✅ **Admin APIs** - Full CRUD for tenants, apps, configs, and prompts

## 📦 Project Structure

```
kuzushi-widget-platform/
├── packages/
│   ├── widget/             # Unified widget (React 19 + UI components)
│   ├── widget-loader/      # r2wc loader + Shadow DOM
│   └── backend/            # NestJS multi-tenant backend
├── examples/
│   └── host-site/          # Demo HTML page with widget
├── package.json            # Root workspace config
├── pnpm-workspace.yaml     # pnpm workspaces
├── turbo.json              # Turborepo config
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 8.15
- PostgreSQL >= 14
- OpenAI API key

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb kuzushi

# Set up environment variables
cd packages/backend
cp .env.example .env
# Edit .env and add:
#   - DATABASE_URL
#   - OPENAI_API_KEY
#   - JWT_SECRET (generate with: openssl rand -base64 32)
#   - JWT_EXPIRES_IN (default: 1h)
```

### 3. Run Database Migrations and Seed

```bash
cd packages/backend
pnpm db:migrate
pnpm db:seed
```

This creates:
- 2 demo tenants (ACME Corporation, TechStart.io)
- 2 demo apps with project IDs:
  - `demo-support-widget` (ACME Corp support)
  - `techstart-sales-assistant` (TechStart.io sales)
- System prompts for each app
- Welcome messages (PRE_MESSAGE prompts) for each app

### 4. Build All Packages

```bash
# From root directory
pnpm build
```

### 5. Start the Backend

```bash
cd packages/backend
pnpm start:dev
```

Backend will be running at `http://localhost:3001`

### 6. Start the Example Host Site

```bash
cd examples/host-site
pnpm install
pnpm dev
```

Open `http://localhost:8080` in your browser 🎉

## 🎨 How to Embed the Widget

### Basic Embedding

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to My Site</h1>

    <!-- Add the widget -->
    <kuzushi-widget
        project-id="your-project-id"
        api-base-url="https://your-backend.com/api"
    ></kuzushi-widget>

    <!-- Load the widget loader script -->
    <script src="https://cdn.example.com/widget-loader.js"></script>
</body>
</html>
```

## 🏗️ Tech Stack

### Frontend
- **React 19.0+** - UI framework (enforced peer dependency)
- **TypeScript** - Type safety
- **r2wc** - React to Web Component converter
- **Tailwind CSS v4** - Styling with container queries and Shadow DOM support
- **React Aria Components** - Shadow DOM-safe accessible primitives
- **class-variance-authority (CVA)** - Component variant management
- **Zustand** - State management
- **Vite + Rollup** - Build tool and bundler

### Backend
- **NestJS** - Enterprise Node.js framework
- **JWT (jsonwebtoken)** - Secure authentication
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Database
- **Socket.IO** - WebSocket implementation
- **OpenAI** - LLM integration with streaming
- **TypeScript** - Type safety

## 📚 Documentation

- **[FINAL_IMPLEMENTATION_SUMMARY.md](./FINAL_IMPLEMENTATION_SUMMARY.md)** - Comprehensive implementation details
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Widget integration guide

## 📝 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for the future of conversational AI**
