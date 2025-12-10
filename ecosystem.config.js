const path = require('path');

/**
 * PM2 Ecosystem Configuration
 * Healthcare Conversation Platform
 *
 * Usage:
 *   Development: pm2 start ecosystem.config.js --env development
 *   Production:  pm2 start ecosystem.config.js --env production
 *
 * Commands:
 *   pm2 start ecosystem.config.js    # Start all apps
 *   pm2 stop all                     # Stop all apps
 *   pm2 restart all                  # Restart all apps
 *   pm2 reload all                   # Zero-downtime reload
 *   pm2 logs                         # View logs
 *   pm2 logs healthcare-backend      # View specific app logs
 *   pm2 monit                        # Monitor dashboard
 *   pm2 delete all                   # Remove all apps from PM2
 *   pm2 save                         # Save current process list
 *   pm2 startup                      # Generate startup script
 */

module.exports = {
  apps: [
    {
      // ============================================
      // Backend - NestJS API Server
      // ============================================
      name: 'healthcare-backend',
      script: 'dist/main.js',
      cwd: path.join(__dirname, 'packages', 'backend'),

      // Node.js configuration
      interpreter: 'node',
      node_args: '--max-old-space-size=1024',

      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(__dirname, 'logs', 'backend-error.log'),
      out_file: path.join(__dirname, 'logs', 'backend-out.log'),
      combine_logs: true,

      // Environment - Development (local)
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },

      // Environment - Production (server)
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
    },
  ],

  // ============================================
  // Deployment Configuration
  // ============================================
  deploy: {
    production: {
      // Server details
      user: 'root',
      host: '82.208.21.17',
      ref: 'origin/main',
      repo: 'git@github.com:arunanksharan/healthcare-conversation-platform.git',
      path: '/opt/healthcare-conversation-platform',

      // SSH options
      ssh_options: ['StrictHostKeyChecking=no'],

      // Pre-deploy (runs locally before deployment)
      'pre-deploy-local': 'echo "Starting deployment to production..."',

      // Post-deploy (runs on server after git pull)
      'post-deploy':
        'pnpm install --frozen-lockfile && pnpm build && pm2 reload ecosystem.config.js --env production && pm2 save',

      // Environment
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
