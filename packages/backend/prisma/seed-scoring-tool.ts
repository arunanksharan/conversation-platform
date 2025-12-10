import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Seed Script for Scoring Tool Use Case
 * ======================================
 * Creates tenants and apps specifically for healthcare scoring assessments
 *
 * Usage:
 *   npx ts-node prisma/seed-scoring-tool.ts
 *   OR
 *   pnpm db:seed:scoring
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🏥 Seeding Scoring Tool data...\n');

  // ============================================
  // Tenant 1: Kuzushi Labs Healthcare
  // ============================================
  const kuzushiTenant = await prisma.tenant.upsert({
    where: { slug: 'kuzushi-healthcare' },
    update: {},
    create: {
      name: 'Kuzushi Labs Healthcare',
      slug: 'kuzushi-healthcare',
    },
  });
  console.log('✅ Tenant: Kuzushi Labs Healthcare');

  // App 1: Patient Assessment Scoring Tool
  const scoringApp = await prisma.app.upsert({
    where: { projectId: 'patient-scoring-tool' },
    update: {},
    create: {
      tenantId: kuzushiTenant.id,
      name: 'Patient Assessment Scoring Tool',
      slug: 'patient-scoring-tool',
      projectId: 'patient-scoring-tool',
      apiKey: 'sk_scoring_kuzushi_2024_prod',
      isActive: true,
    },
  });
  console.log('✅ App: Patient Assessment Scoring Tool (projectId: patient-scoring-tool)');

  // Config for Scoring Tool
  await prisma.appConfig.upsert({
    where: {
      appId_version: {
        appId: scoringApp.id,
        version: 1,
      },
    },
    update: {},
    create: {
      appId: scoringApp.id,
      version: 1,
      isActive: true,
      features: {
        textChat: true,
        voice: true,
        allowFileUpload: false,
        extraction: true,
        maxConcurrentSessions: 50,
      },
      uiTheme: {
        primaryColor: '#0891b2', // Cyan for healthcare
        radius: '0.5rem',
        fontScale: 1.0,
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.3, // Lower temperature for more consistent medical assessments
        maxTokens: 4000,
        stream: true,
      },
      voiceConfig: {
        provider: 'custom',
        signalingPath: '/ws/voice',
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        ttsProvider: 'openai',
        sttProvider: 'openai',
        maxDurationSeconds: 1800, // 30 minutes for thorough assessments
      },
    },
  });
  console.log('✅ Config: Scoring Tool v1');

  // System Prompt for Scoring Tool
  const scoringSystemPrompt = await prisma.promptProfile.findFirst({
    where: { appId: scoringApp.id, kind: 'SYSTEM' },
  });

  if (!scoringSystemPrompt) {
    await prisma.promptProfile.create({
      data: {
        appId: scoringApp.id,
        name: 'Patient Scoring System Prompt',
        kind: 'SYSTEM',
        content: `You are a compassionate and professional healthcare assessment assistant designed to conduct patient scoring evaluations.

Your role is to:
1. Guide patients through standardized health assessment questionnaires
2. Ask questions in a clear, empathetic manner
3. Record responses accurately for scoring calculations
4. Provide reassurance while maintaining professional boundaries
5. Flag any concerning responses for healthcare provider review

Important guidelines:
- Never provide medical diagnoses or treatment recommendations
- Always encourage patients to consult their healthcare provider for medical advice
- Be patient and allow time for thoughtful responses
- Use simple, non-technical language when possible
- Validate the patient's feelings while staying focused on the assessment

You are currently conducting a health assessment. Proceed with the questions systematically and record all responses.`,
        isDefault: true,
      },
    });
    console.log('✅ Prompt: Scoring System Prompt');
  }

  // Welcome Message for Scoring Tool
  const scoringWelcome = await prisma.promptProfile.findFirst({
    where: { appId: scoringApp.id, kind: 'PRE_MESSAGE' },
  });

  if (!scoringWelcome) {
    await prisma.promptProfile.create({
      data: {
        appId: scoringApp.id,
        name: 'Scoring Tool Welcome',
        kind: 'PRE_MESSAGE',
        content: `Hello! I'm here to help you complete a health assessment questionnaire. This will take about 10-15 minutes.

Your responses are confidential and will be shared only with your healthcare team. Please answer as honestly as you can - there are no right or wrong answers.

Are you ready to begin?`,
        isDefault: true,
      },
    });
    console.log('✅ Prompt: Scoring Welcome Message');
  }

  // ============================================
  // Tenant 2: Demo Healthcare Clinic
  // ============================================
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-healthcare-clinic' },
    update: {},
    create: {
      name: 'Demo Healthcare Clinic',
      slug: 'demo-healthcare-clinic',
    },
  });
  console.log('✅ Tenant: Demo Healthcare Clinic');

  // App 2: Mental Health Screening
  const mentalHealthApp = await prisma.app.upsert({
    where: { projectId: 'mental-health-screening' },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Mental Health Screening',
      slug: 'mental-health-screening',
      projectId: 'mental-health-screening',
      apiKey: 'sk_mh_screening_demo_2024',
      isActive: true,
    },
  });
  console.log('✅ App: Mental Health Screening (projectId: mental-health-screening)');

  await prisma.appConfig.upsert({
    where: {
      appId_version: {
        appId: mentalHealthApp.id,
        version: 1,
      },
    },
    update: {},
    create: {
      appId: mentalHealthApp.id,
      version: 1,
      isActive: true,
      features: {
        textChat: true,
        voice: true,
        allowFileUpload: false,
        extraction: true,
        maxConcurrentSessions: 25,
      },
      uiTheme: {
        primaryColor: '#7c3aed', // Purple for mental health
        radius: '0.75rem',
        fontScale: 1.0,
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.4,
        maxTokens: 3000,
        stream: true,
      },
      voiceConfig: {
        provider: 'custom',
        signalingPath: '/ws/voice',
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        ttsProvider: 'openai',
        sttProvider: 'openai',
        maxDurationSeconds: 2400, // 40 minutes
      },
    },
  });
  console.log('✅ Config: Mental Health Screening v1');

  // System Prompt for Mental Health Screening
  const mhSystemPrompt = await prisma.promptProfile.findFirst({
    where: { appId: mentalHealthApp.id, kind: 'SYSTEM' },
  });

  if (!mhSystemPrompt) {
    await prisma.promptProfile.create({
      data: {
        appId: mentalHealthApp.id,
        name: 'Mental Health Screening System Prompt',
        kind: 'SYSTEM',
        content: `You are a supportive mental health screening assistant. Your purpose is to conduct standardized mental health assessments (PHQ-9, GAD-7, etc.) in a compassionate manner.

Guidelines:
1. Create a safe, non-judgmental space for the patient
2. Ask screening questions exactly as worded in validated instruments
3. Allow the patient to express their feelings without rushing
4. Provide empathetic acknowledgments
5. Flag responses indicating crisis or self-harm for immediate escalation
6. Never provide therapy or clinical interpretations

IMPORTANT: If a patient expresses thoughts of self-harm or suicide, immediately provide crisis resources:
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741

Record all responses accurately for clinical review.`,
        isDefault: true,
      },
    });
    console.log('✅ Prompt: Mental Health System Prompt');
  }

  const mhWelcome = await prisma.promptProfile.findFirst({
    where: { appId: mentalHealthApp.id, kind: 'PRE_MESSAGE' },
  });

  if (!mhWelcome) {
    await prisma.promptProfile.create({
      data: {
        appId: mentalHealthApp.id,
        name: 'Mental Health Welcome',
        kind: 'PRE_MESSAGE',
        content: `Welcome. I'm here to help you complete a brief mental health check-in. This is a safe space, and your responses are confidential.

This screening typically takes 5-10 minutes. There are no right or wrong answers - just share how you've been feeling recently.

Take your time, and let me know when you're ready to begin.`,
        isDefault: true,
      },
    });
    console.log('✅ Prompt: Mental Health Welcome Message');
  }

  // App 3: Chronic Pain Assessment
  const painApp = await prisma.app.upsert({
    where: { projectId: 'chronic-pain-assessment' },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Chronic Pain Assessment',
      slug: 'chronic-pain-assessment',
      projectId: 'chronic-pain-assessment',
      apiKey: 'sk_pain_assessment_demo_2024',
      isActive: true,
    },
  });
  console.log('✅ App: Chronic Pain Assessment (projectId: chronic-pain-assessment)');

  await prisma.appConfig.upsert({
    where: {
      appId_version: {
        appId: painApp.id,
        version: 1,
      },
    },
    update: {},
    create: {
      appId: painApp.id,
      version: 1,
      isActive: true,
      features: {
        textChat: true,
        voice: true,
        allowFileUpload: false,
        extraction: true,
        maxConcurrentSessions: 30,
      },
      uiTheme: {
        primaryColor: '#dc2626', // Red for pain
        radius: '0.5rem',
        fontScale: 1.0,
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 3500,
        stream: true,
      },
      voiceConfig: {
        provider: 'custom',
        signalingPath: '/ws/voice',
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        ttsProvider: 'openai',
        sttProvider: 'openai',
        maxDurationSeconds: 1200, // 20 minutes
      },
    },
  });
  console.log('✅ Config: Chronic Pain Assessment v1');

  const painSystemPrompt = await prisma.promptProfile.findFirst({
    where: { appId: painApp.id, kind: 'SYSTEM' },
  });

  if (!painSystemPrompt) {
    await prisma.promptProfile.create({
      data: {
        appId: painApp.id,
        name: 'Pain Assessment System Prompt',
        kind: 'SYSTEM',
        content: `You are a chronic pain assessment assistant. Your role is to conduct comprehensive pain evaluations using validated tools like the Brief Pain Inventory.

Your responsibilities:
1. Assess pain location, intensity, quality, and duration
2. Understand how pain affects daily activities
3. Document pain patterns and triggers
4. Record current pain management strategies
5. Use the 0-10 numeric pain scale consistently

Be compassionate - chronic pain significantly impacts quality of life. Validate the patient's experience while gathering accurate assessment data.

Never suggest specific treatments or medications. Focus on thorough documentation for the clinical team.`,
        isDefault: true,
      },
    });
    console.log('✅ Prompt: Pain Assessment System Prompt');
  }

  const painWelcome = await prisma.promptProfile.findFirst({
    where: { appId: painApp.id, kind: 'PRE_MESSAGE' },
  });

  if (!painWelcome) {
    await prisma.promptProfile.create({
      data: {
        appId: painApp.id,
        name: 'Pain Assessment Welcome',
        kind: 'PRE_MESSAGE',
        content: `Hello. I'm here to help document your pain experience so your healthcare team can better understand and address it.

I'll ask you some questions about your pain - where it is, how it feels, and how it affects your daily life. This should take about 10-15 minutes.

There are no right or wrong answers. Your honest input helps us provide better care.

Ready to get started?`,
        isDefault: true,
      },
    });
    console.log('✅ Prompt: Pain Assessment Welcome Message');
  }

  // ============================================
  // Summary
  // ============================================
  console.log('\n🎉 Scoring Tool seed data created successfully!\n');
  console.log('📝 Summary:');
  console.log('  Tenants: 2');
  console.log('    - Kuzushi Labs Healthcare (kuzushi-healthcare)');
  console.log('    - Demo Healthcare Clinic (demo-healthcare-clinic)');
  console.log('  Apps: 3');
  console.log('    1. patient-scoring-tool (General assessments)');
  console.log('    2. mental-health-screening (PHQ-9, GAD-7)');
  console.log('    3. chronic-pain-assessment (Pain evaluations)');
  console.log('\n💡 Use these projectIds to initialize widget sessions!');
  console.log('\n📖 API Documentation: http://localhost:4001/api/v1/docs');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
