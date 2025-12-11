/**
 * PM2 Ecosystem Configuration
 * Healthcare Conversation Platform - Backend
 *
 * ============================================
 * PRODUCTION DEPLOYMENT
 * ============================================
 *
 * Step 1: Build the application
 *   pnpm build
 *
 * Step 2: Start with PM2
 *   pm2 start ecosystem.config.js
 *
 * Step 3: Save for auto-restart on reboot
 *   pm2 save
 *   pm2 startup
 *
 * ============================================
 * COMMON COMMANDS
 * ============================================
 *
 *   pm2 status                    # Check status
 *   pm2 logs healthcare-backend   # View logs
 *   pm2 restart healthcare-backend
 *   pm2 stop healthcare-backend
 *   pm2 delete healthcare-backend
 *   pm2 monit                     # Monitor dashboard
 *
 * ============================================
 * LOCAL DEVELOPMENT
 * ============================================
 *
 * Don't use PM2 for local development. Just run:
 *   pnpm start:dev
 *
 * This gives you hot-reload without PM2 overhead.
 */

module.exports = {
  apps: [
    {
      name: 'conversation-backend',

      // Run the compiled JavaScript build
      script: 'dist/main.js',
      interpreter: 'node',
      node_args: '--max-old-space-size=1024',

      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      max_memory_restart: '500M',
      watch: false,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      combine_logs: true,

      // Production environment
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
    },
  ],
};
