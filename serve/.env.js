const fs = require("node:fs");
const path = require("node:path");

const parentConfigPath = path.resolve(__dirname, "..", "config.js");
const parentConfig = JSON.parse(fs.readFileSync(parentConfigPath, "utf8"));

module.exports = {
  host: "127.0.0.1",
  port: 4173,
  projectsDir: parentConfig.PROJECTS_DIR,
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
