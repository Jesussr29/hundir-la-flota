module.exports = {
  apps: [
    {
      name: 'hundir-la-flota',
      script: 'server.js',
      instances: 1, // 1 instancia recomendada para mantener el estado de salas en memoria y SQLite
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3005,
        HOST: '0.0.0.0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3005,
        HOST: '127.0.0.1'
      }
    }
  ]
};
