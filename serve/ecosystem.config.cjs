const path = require("node:path");

const LOG_DIR = path.join(__dirname, "logs");

module.exports = {
  apps: [
    {
      name: "web-design-serve-gateway",
      cwd: __dirname,
      script: "server.js",
      exec_mode: "fork",
      watch: false,
      time: true,
      autorestart: true,
      max_restarts: 10,
      error_file: path.join(LOG_DIR, "pm2-error.log"),
      out_file: path.join(LOG_DIR, "pm2-out.log")
    }
  ]
};
