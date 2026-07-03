const fs = require("node:fs");
const path = require("node:path");

function loadJsonConfig(configPath) {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function loadJsConfig(configPath) {
  delete require.cache[require.resolve(configPath)];
  return require(configPath);
}

function loadServeConfig(options = {}) {
  const cwd = path.resolve(options.cwd || __dirname);
  const explicitConfigPath = options.configPath || process.env.GATEWAY_CONFIG;
  const envJsPath = path.join(cwd, ".env.js");
  const jsonConfigPath = path.join(cwd, "config.example.json");

  let resolvedConfigPath;
  if (explicitConfigPath) {
    resolvedConfigPath = path.resolve(cwd, explicitConfigPath);
  } else if (fs.existsSync(envJsPath)) {
    resolvedConfigPath = envJsPath;
  } else {
    resolvedConfigPath = jsonConfigPath;
  }

  const config =
    path.extname(resolvedConfigPath) === ".js"
      ? loadJsConfig(resolvedConfigPath)
      : loadJsonConfig(resolvedConfigPath);

  return {
    ...config,
    __configPath: resolvedConfigPath
  };
}

module.exports = {
  loadServeConfig
};
