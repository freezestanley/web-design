const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_REGISTRY_PATH = path.resolve(__dirname, "..", "registry.json");

function normalizeRegistry(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.services)) {
    return { services: [] };
  }

  return {
    services: value.services
  };
}

function readRegistry(registryPath = DEFAULT_REGISTRY_PATH) {
  if (!fs.existsSync(registryPath)) {
    return { services: [] };
  }

  return normalizeRegistry(JSON.parse(fs.readFileSync(registryPath, "utf8")));
}

function writeRegistry(registry, registryPath = DEFAULT_REGISTRY_PATH) {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify(normalizeRegistry(registry), null, 2));
}

module.exports = {
  DEFAULT_REGISTRY_PATH,
  readRegistry,
  writeRegistry
};
