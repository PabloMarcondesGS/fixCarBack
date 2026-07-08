module.exports = {
  apps: [
    {
      name: 'fixcar-backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        JWT_SECRET: 'sua-chave-secreta-segura-aqui'
      }
    }
  ]
};
