const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");
const config = loadConfig();

function listProjects({ projectsDir = config.PROJECTS_DIR } = {}) {
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  return fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(projectsDir, entry.name))
    .filter((projectPath) => fs.existsSync(path.join(projectPath, config.WEBDESIGN_DIR, "project.json")))
    .map((projectPath) => {
      const metadata = JSON.parse(
        fs.readFileSync(path.join(projectPath, config.WEBDESIGN_DIR, "project.json"), "utf8")
      );
      return {
        name: metadata.name,
        summary: metadata.summary,
        updatedAt: metadata.updatedAt,
        projectPath
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

module.exports = {
  listProjects
};
