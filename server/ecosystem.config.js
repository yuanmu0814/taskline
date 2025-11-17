// PM2 配置文件
// 使用: pm2 start ecosystem.config.js

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'taskline-server',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3004,
        HOST: process.env.HOST || '0.0.0.0',
        API_PREFIX: process.env.API_PREFIX || '/api',
        CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
