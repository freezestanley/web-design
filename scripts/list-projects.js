#!/usr/bin/env node

const path = require("node:path");
const { listProjects } = require("./lib/project-index");

const projectsDir = process.env.WEB_DESIGN_PROJECTS_DIR
  ? path.resolve(process.env.WEB_DESIGN_PROJECTS_DIR)
  : undefined;

process.stdout.write(`${JSON.stringify(listProjects({ projectsDir }), null, 2)}\n`);
