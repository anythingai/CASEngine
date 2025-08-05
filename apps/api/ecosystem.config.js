module.exports = {
  apps: [
    {
      name: 'cultural-arbitrage-api',
      script: 'dist/index.js',
      cwd: '/app',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 8000,
        LOG_LEVEL: 'info',
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8000,
        LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: process.env.PORT || 8000,
        LOG_LEVEL: 'info',
      },

      // Monitoring and logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      pid_file: './pids/app.pid',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory and CPU monitoring
      max_memory_restart: '1G',
      node_args: [
        '--max-old-space-size=1024',
        '--optimize-for-size'
      ],
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Auto-restart configuration
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', 'pids'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      shutdown_with_message: true,
      
      // Advanced PM2 features
      merge_logs: true,
      combine_logs: true,
      force: true,
      
      // Error handling
      autorestart: true,
      max_restarts: 15,
      restart_delay: 4000,
      
      // Performance monitoring
      pmx: true,
      source_map_support: false,
      
      // Custom metrics
      custom_metrics: {
        'HTTP requests/min': {
          measurement: 'mean',
          unit: '/min'
        },
        'Memory Usage': {
          measurement: 'mean',
          unit: 'MB'
        },
        'Active connections': {
          measurement: 'mean',
          unit: 'connections'
        }
      },
      
      // Deployment configuration
      post_update: ['npm run build'],
      
      // Log rotation
      log_type: 'json',
      merge_logs: true,
      
      // Development overrides
      ...(process.env.NODE_ENV === 'development' && {
        watch: true,
        ignore_watch: ['node_modules', '*.log', 'logs'],
        watch_options: {
          followSymlinks: false,
          usePolling: false,
        },
      }),
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/cultural-arbitrage.git',
      path: '/var/www/cultural-arbitrage/api',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/cultural-arbitrage.git',
      path: '/var/www/cultural-arbitrage-staging/api',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};