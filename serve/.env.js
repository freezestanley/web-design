const fs = require("node:fs");
const path = require("node:path");

const parentConfigPath = path.resolve(__dirname, "..", "config.js");
const parentConfig = JSON.parse(fs.readFileSync(parentConfigPath, "utf8"));

module.exports = {
  host: "127.0.0.1",
  port: 4173,
  projectsDir: parentConfig.PROJECTS_DIR,
  previewAuth: {
    enabled: true,
    cookieName: "ATLANTIS_SESSION_ID",
    clientSessionCookieName: "session_id",
    clientUnsafeSessionCookieName: "unsafeSessionId",
    defaultServiceName: "za-open-bot",
    useMockSso: false,
    ssoHost: "",
    apigAppCode: "1330946eac6340c4ba11f68243a7e02c48949cb06bd14feca342dadeb3cba4dd",
    devPreviewRegistryPath: path.resolve(__dirname, "..", "scripts", "vitectrl", "registry.json")
  },
  menu: {
    title: "Shared Control",
    selectA: {
      id: "env",
      label: "Environment"
    },
    selectB: {
      id: "region",
      label: "Region"
    },
    submitLabel: "Submit"
  },
  pluginMock: {
    selectAOptions: [
      { label: "Mock Test", value: "mock-test" },
      { label: "Mock Prod", value: "mock-prod" }
    ],
    selectBOptions: [
      { label: "Mock CN", value: "mock-cn" },
      { label: "Mock US", value: "mock-us" }
    ],
    submitResponse: {
      message: "mock submit success"
    }
  }
};
