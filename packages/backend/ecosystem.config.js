/**
 * PM2 Ecosystem Configuration for Healthcare Conversation Platform Backend
 *
 * This config manages:
 * - NestJS Backend (WebSocket + API) on port 3001
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop all
 *   pm2 restart all
 *   pm2 logs
 */

module.exports = {
  apps: [
    {
      name: 'conversation-platform-backend',
      script: 'pnpm',
      args: 'run start:dev',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
    },
  ],
};
