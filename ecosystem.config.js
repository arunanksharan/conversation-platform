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
 *   pm2 logs                         # View logs
 *   pm2 monit                        # Monitor dashboard
 *   pm2 delete all                   # Remove all apps from PM2
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

      // Interpreter (use node for NestJS)
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=1024',

      // Process management
      instances: 1, // Use 'max' for cluster mode (multiple CPUs)
      exec_mode: 'fork', // Use 'cluster' for load balancing
      autorestart: true,
      watch: false, // Set to true for dev auto-reload (not recommended for production)
      max_memory_restart: '500M',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(__dirname, 'logs', 'backend-error.log'),
      out_file: path.join(__dirname, 'logs', 'backend-out.log'),
      merge_logs: true,
      log_type: 'json',

      // Environment - Development
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },

      // Environment - Production
      env_production: {
        NODE_ENV: 'production',
        PORT: 4002,
      },

      // Load .env file from backend directory
      // Note: NestJS ConfigModule loads .env automatically, but this ensures PM2 has access too
      env_file: path.join(__dirname, 'packages', 'backend', '.env'),
    },

    // ============================================
    // Add more apps here as needed
    // ============================================
    // Example: If you add a Python voice service later
    // {
    //   name: 'healthcare-voice',
    //   script: 'python',
    //   args: '-m uvicorn main:app --host 0.0.0.0 --port 5001',
    //   cwd: path.join(__dirname, 'packages', 'voice-service'),
    //   interpreter: '/usr/bin/python3',
    //   env_production: {
    //     NODE_ENV: 'production',
    //   },
    // },
  ],

  // ============================================
  // Deployment Configuration (optional)
  // ============================================
  deploy: {
    production: {
      user: 'root',
      host: '156.67.105.97',
      ref: 'origin/main',
      repo: 'git@github.com:arunanksharan/conversation-platform.git',
      path: '/root/healthcare/conversation-platform',
      ssh_options: ['StrictHostKeyChecking=no'],
      'pre-deploy-local': '',
      'post-deploy':
        'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
