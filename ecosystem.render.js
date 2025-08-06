module.exports = {
  apps: [
    {
      name: 'cultural-arbitrage-api',
      script: './apps/api/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      error_file: '/dev/stderr',
      out_file: '/dev/stdout',
      log_file: '/dev/stdout',
      combine_logs: true,
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'cultural-arbitrage-web',
      script: './apps/web/.next/standalone/apps/web/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      error_file: '/dev/stderr',
      out_file: '/dev/stdout',
      log_file: '/dev/stdout',
      combine_logs: true,
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      // Web service depends on API being ready
      wait_ready: true,
      listen_timeout: 10000,
    }
  ],
  
  // Deploy configuration for PM2
  deploy: {
    production: {
      user: 'nodejs',
      host: 'localhost',
      ref: 'origin/main',
      repo: '.',
      path: '/app',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.render.js --env production'
    }
  }
};