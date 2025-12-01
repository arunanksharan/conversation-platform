import 'dotenv/config'; // Load environment variables from .env file
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined. Please check your .env file.');
}

const pool = new Pool({ connectionString });

// Create Prisma adapter for PostgreSQL
const adapter = new PrismaPg(pool);

// Initialize PrismaClient with adapter (required for Prisma 7)
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create a demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'ACME Corporation',
      slug: 'acme-corp',
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // 2. Create a demo app
  const app = await prisma.app.upsert({
    where: { projectId: 'demo-support-widget' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Support Widget',
      slug: 'support-widget',
      projectId: 'demo-support-widget',
      apiKey: 'sk_demo_1234567890abcdef',
      isActive: true,
    },
  });

  console.log('✅ Created app:', app.name, '(projectId:', app.projectId, ')');

  // 3. Create app configuration
  const config = await prisma.appConfig.upsert({
    where: {
      appId_version: {
        appId: app.id,
        version: 1,
      },
    },
    update: {},
    create: {
      appId: app.id,
      version: 1,
      isActive: true,
      features: {
        textChat: true,
        voice: true,
        allowFileUpload: false,
        maxConcurrentSessions: 5,
      },
      uiTheme: {
        primaryColor: '#2563eb',
        radius: '0.5rem',
        fontScale: 1.0,
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 2000,
        stream: true,
      },
      voiceConfig: {
        provider: 'custom',
        signalingPath: '/ws/voice',
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
        ],
        ttsProvider: 'openai',
        sttProvider: 'openai',
        maxDurationSeconds: 900,
      },
    },
  });

  console.log('✅ Created app config version:', config.version);

  // 4. Create system prompt (check if exists first to allow re-running seed)
  let systemPrompt = await prisma.promptProfile.findFirst({
    where: {
      appId: app.id,
      name: 'Default System Prompt',
      kind: 'SYSTEM',
    },
  });

  if (!systemPrompt) {
    systemPrompt = await prisma.promptProfile.create({
      data: {
        appId: app.id,
        name: 'Default System Prompt',
        kind: 'SYSTEM',
        content: `You are a helpful AI assistant for ACME Corporation's customer support.

Your role is to:
- Answer customer questions politely and professionally
- Provide accurate information about our products and services
- Escalate complex issues to human agents when necessary
- Be concise but thorough in your responses

Always maintain a friendly and helpful tone.`,
        isDefault: true,
      },
    });
    console.log('✅ Created system prompt:', systemPrompt.name);
  } else {
    console.log('✅ System prompt already exists:', systemPrompt.name);
  }

  // 4b. Create welcome prompt for ACME app (check if exists first)
  let welcomePrompt = await prisma.promptProfile.findFirst({
    where: {
      appId: app.id,
      name: 'Welcome Message',
      kind: 'PRE_MESSAGE',
    },
  });

  if (!welcomePrompt) {
    welcomePrompt = await prisma.promptProfile.create({
      data: {
        appId: app.id,
        name: 'Welcome Message',
        kind: 'PRE_MESSAGE',
        content: `👋 Welcome to ACME Support! I'm your AI assistant, ready to help you with any questions about our products, services, or your account. How can I assist you today?`,
        isDefault: true,
      },
    });
    console.log('✅ Created welcome prompt:', welcomePrompt.name);
  } else {
    console.log('✅ Welcome prompt already exists:', welcomePrompt.name);
  }

  // 5. Create another tenant and app for multi-tenant demonstration
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'techstart-io' },
    update: {},
    create: {
      name: 'TechStart.io',
      slug: 'techstart-io',
    },
  });

  const app2 = await prisma.app.upsert({
    where: { projectId: 'techstart-sales-assistant' },
    update: {},
    create: {
      tenantId: tenant2.id,
      name: 'Sales Assistant',
      slug: 'sales-assistant',
      projectId: 'techstart-sales-assistant',
      apiKey: 'sk_techstart_0987654321fedcba',
      isActive: true,
    },
  });

  await prisma.appConfig.upsert({
    where: {
      appId_version: {
        appId: app2.id,
        version: 1,
      },
    },
    update: {},
    create: {
      appId: app2.id,
      version: 1,
      isActive: true,
      features: {
        textChat: true,
        voice: false, // Sales app without voice
        allowFileUpload: false,
        maxConcurrentSessions: 10,
      },
      uiTheme: {
        primaryColor: '#10b981', // Green theme
        radius: '0.75rem',
        fontScale: 1.0,
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        temperature: 0.8,
        maxTokens: 1500,
        stream: true,
      },
      voiceConfig: {
        provider: 'custom',
        signalingPath: '/ws/voice',
        iceServers: [],
      },
    },
  });

  // Create prompts for TechStart app (check if exists first)
  const techStartSystemPrompt = await prisma.promptProfile.findFirst({
    where: {
      appId: app2.id,
      name: 'Sales Assistant System Prompt',
      kind: 'SYSTEM',
    },
  });

  if (!techStartSystemPrompt) {
    await prisma.promptProfile.create({
      data: {
        appId: app2.id,
        name: 'Sales Assistant System Prompt',
        kind: 'SYSTEM',
        content: `You are a friendly sales assistant for TechStart.io, a cutting-edge SaaS platform.

Your goals:
- Understand customer needs and pain points
- Explain how TechStart.io can solve their problems
- Provide clear pricing and feature information
- Schedule demos when appropriate
- Be enthusiastic but not pushy

Always focus on providing value to the customer.`,
        isDefault: true,
      },
    });
  }

  const techStartWelcomePrompt = await prisma.promptProfile.findFirst({
    where: {
      appId: app2.id,
      name: 'Sales Welcome Message',
      kind: 'PRE_MESSAGE',
    },
  });

  if (!techStartWelcomePrompt) {
    await prisma.promptProfile.create({
      data: {
        appId: app2.id,
        name: 'Sales Welcome Message',
        kind: 'PRE_MESSAGE',
        content: `🚀 Hi there! I'm the TechStart.io Sales Assistant. I'd love to help you discover how our platform can transform your business. What brings you here today?`,
        isDefault: true,
      },
    });
  }

  console.log('✅ Created second tenant and app for multi-tenancy demo');

  console.log('\n🎉 Seed data created successfully!');
  console.log('\n📝 Summary:');
  console.log('  Tenants: 2');
  console.log('  Apps: 2');
  console.log('  - Demo Project ID: demo-support-widget');
  console.log('  - TechStart Project ID: techstart-sales-assistant');
  console.log('\n💡 You can now embed the widget using these projectIds!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
