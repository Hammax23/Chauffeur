module.exports = {
  apps: [
    {
      name: "sarj-worldwide",
      script: "npm",
      args: "start",
      cwd: "/var/www/sarjworldwide/apps/web",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
