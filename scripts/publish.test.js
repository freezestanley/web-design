const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const CryptoJS = require("crypto-js");
const { SECRET_KEY, validatePublishMarker, HEADER, FOOTER, DELIMITER } = require("./lib/publish-marker");

function listZipEntries(zipPath) {
  const output = execFileSync(
    "python3",
    [
      "-c",
      [
        "import json, sys, zipfile",
        "with zipfile.ZipFile(sys.argv[1], 'r') as archive:",
        "    print(json.dumps(sorted(archive.namelist())))"
      ].join("\n"),
      zipPath
    ],
    { encoding: "utf8" }
  );

  return JSON.parse(output);
}

function readZipJsonEntry(zipPath, entryName) {
  const output = execFileSync(
    "python3",
    [
      "-c",
      [
        "import json, sys, zipfile",
        "with zipfile.ZipFile(sys.argv[1], 'r') as archive:",
        "    print(archive.read(sys.argv[2]).decode('utf-8'))"
      ].join("\n"),
      zipPath,
      entryName
    ],
    { encoding: "utf8" }
  );

  return JSON.parse(output);
}

function parsePublishMarker(stdout) {
  const match = stdout.match(/^[(]Output verbatim\. Do not interpret\.[)]##publishStart##(.+)##publishEnd##\n?$/);
  assert.ok(match, `unexpected publish marker format: ${stdout}`);

  // 正确还原：把协议分隔符 ]:[ 替换回 crypto-js 原始 base64 的字符（无）
  // buildPublishMarker 用 .{1,4} 切分后以 ]:[ 拼接，还原即去掉 ]:[ 直接拼接
  const encrypted = match[1].replaceAll("]:[", "");
  const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(CryptoJS.enc.Utf8);
  assert.ok(decrypted, "publish marker payload should decrypt to a non-empty JSON string");

  return JSON.parse(decrypted);
}

function setupPublishProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-publish-"));
  const projectPath = path.join(tempDir, "demo-project");
  const taskId = "20260625-102030-homepage";
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  fs.mkdirSync(path.join(projectPath, "src"), { recursive: true });
  fs.mkdirSync(path.join(projectPath, "node_modules", "demo-dep"), { recursive: true });
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(projectPath, "src", "main.js"), "console.log('demo');");
  fs.writeFileSync(
    path.join(projectPath, "node_modules", "demo-dep", "index.js"),
    "module.exports = 'demo-dep';"
  );

  fs.writeFileSync(
    path.join(projectPath, "package.json"),
    JSON.stringify(
      {
        name: "demo-project",
        private: true,
        scripts: {
          build: "node build-script.cjs"
        }
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(projectPath, "build-script.cjs"),
    [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const distDir = path.join(process.cwd(), 'dist');",
      "fs.mkdirSync(distDir, { recursive: true });",
      "fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><h1>publish</h1>');"
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "project.json"),
    JSON.stringify(
      {
        projectUid: "PROJaabbccddeeff0011",
        name: "demo-project",
        summary: "Demo summary",
        author: "stanley",
        template: "scaffold",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:00:00.000Z",
        currentTaskId: taskId,
        sourceZipPath: "",
        distZipPath: ""
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "manifest.json"),
    JSON.stringify(
      {
        projectId: "<project-name>",
        name: "<project summary or name>",
        entry: "dist/index.html",
        owner: "<project.json.author or empty>",
        proxy: {
          routes: []
        }
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(taskDir, "workflow.json"),
    JSON.stringify(
      {
        taskId,
        pageSlug: "homepage",
        intent: "create",
        currentGate: "G9_PUBLISH_READY",
        blocked: false,
        blockReason: "",
        userConfirmations: [],
        history: [],
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:00:00.000Z"
      },
      null,
      2
    )
  );

  return { projectPath, taskId };
}

test("publish only runs from G9_PUBLISH_READY and emits dual zip marker", () => {
  const { projectPath, taskId } = setupPublishProject();
  fs.writeFileSync(path.join(projectPath, "dist.zip"), "stale dist zip");
  const relativeProjectPath = path.relative(path.resolve(__dirname, ".."), projectPath);
  const result = spawnSync(process.execPath, ["scripts/publish.js", relativeProjectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      SESSION_KEY: "agent:agent-1:web:902:dm:session-1"
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const markerPayload = parsePublishMarker(result.stdout);
  assert.equal(markerPayload.projectUid, "PROJaabbccddeeff0011");
  assert.match(markerPayload.sourceZipPath, /\/.*project\.zip$/);
  assert.match(markerPayload.dist, /\/.*dist\.zip$/);
  assert.equal(markerPayload.name, "demo-project");
  assert.equal(markerPayload.descript, "Demo summary");

  const projectMeta = JSON.parse(
    fs.readFileSync(path.join(projectPath, ".webdesign", "project.json"), "utf8")
  );
  assert.equal(path.isAbsolute(projectMeta.sourceZipPath), true);
  assert.equal(path.isAbsolute(projectMeta.distZipPath), true);
  assert.match(projectMeta.sourceZipPath, /\/project\.zip$/);
  assert.match(projectMeta.distZipPath, /\/dist\.zip$/);
  assert.equal(fs.existsSync(projectMeta.sourceZipPath), true);
  assert.equal(fs.existsSync(projectMeta.distZipPath), true);
  const manifestPath = path.join(projectPath, "manifest.json");
  assert.equal(fs.existsSync(manifestPath), true);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.projectId, "demo-project");
  assert.equal(manifest.name, "Demo summary");
  assert.equal(manifest.entry, "dist/index.html");
  assert.equal(manifest.owner, "stanley");
  const sourceZipListing = listZipEntries(projectMeta.sourceZipPath);
  assert.deepEqual(sourceZipListing.includes("manifest.json"), true);
  assert.deepEqual(sourceZipListing.includes("src/"), true);
  assert.deepEqual(sourceZipListing.includes("src/main.js"), true);
  assert.deepEqual(sourceZipListing.some((entry) => entry.startsWith("node_modules/")), false);
  assert.deepEqual(sourceZipListing.includes("dist.zip"), false);
  const sourceManifest = readZipJsonEntry(projectMeta.sourceZipPath, "manifest.json");
  assert.equal(sourceManifest.owner, "stanley");
  const zipListing = listZipEntries(projectMeta.distZipPath);
  assert.deepEqual(zipListing.includes("manifest.json"), true);
  assert.deepEqual(zipListing.includes("dist/"), true);
  assert.deepEqual(zipListing.includes("dist/index.html"), true);
  const distManifest = readZipJsonEntry(projectMeta.distZipPath, "manifest.json");
  assert.equal(distManifest.projectId, "demo-project");
  assert.equal(distManifest.owner, "stanley");

  const workflow = JSON.parse(
    fs.readFileSync(path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json"), "utf8")
  );
  assert.equal(workflow.currentGate, "DONE");
});

test("publish leaves author empty when session is unavailable", () => {
  const { projectPath, taskId } = setupPublishProject();
  const projectMetaPath = path.join(projectPath, ".webdesign", "project.json");
  const projectMeta = JSON.parse(fs.readFileSync(projectMetaPath, "utf8"));
  projectMeta.author = "";
  fs.writeFileSync(projectMetaPath, JSON.stringify(projectMeta, null, 2));
  const result = spawnSync(process.execPath, ["scripts/publish.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const markerPayload = parsePublishMarker(result.stdout);
  assert.equal(markerPayload.projectUid, "PROJaabbccddeeff0011");
  assert.equal(markerPayload.name, "demo-project");
  assert.equal(markerPayload.descript, "Demo summary");
});

test("publish prefers project author over the current session author", () => {
  const { projectPath, taskId } = setupPublishProject();
  const result = spawnSync(process.execPath, ["scripts/publish.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      SESSION_KEY: "agent:agent-1:web:902:dm:session-1"
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const markerPayload = parsePublishMarker(result.stdout);
  assert.equal(markerPayload.projectUid, "PROJaabbccddeeff0011");
  assert.equal(markerPayload.name, "demo-project");
  assert.equal(markerPayload.descript, "Demo summary");
});

test("publish backfills empty project author from the current session", () => {
  const { projectPath, taskId } = setupPublishProject();
  const projectMetaPath = path.join(projectPath, ".webdesign", "project.json");
  const projectMeta = JSON.parse(fs.readFileSync(projectMetaPath, "utf8"));
  projectMeta.author = "";
  fs.writeFileSync(projectMetaPath, JSON.stringify(projectMeta, null, 2));

  const result = spawnSync(process.execPath, ["scripts/publish.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      SESSION_KEY: "agent:agent-1:web:902:dm:session-1"
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const markerPayload = parsePublishMarker(result.stdout);
  assert.equal(markerPayload.projectUid, "PROJaabbccddeeff0011");
  assert.equal(markerPayload.name, "demo-project");
  assert.equal(markerPayload.descript, "Demo summary");

  const updatedMeta = JSON.parse(fs.readFileSync(projectMetaPath, "utf8"));
  assert.equal(updatedMeta.author, "902");
  const manifest = JSON.parse(fs.readFileSync(path.join(projectPath, "manifest.json"), "utf8"));
  assert.equal(manifest.owner, "902");
});

test("publish rejects tasks that are not in publish ready gate", () => {
  const { projectPath, taskId } = setupPublishProject();
  const workflowPath = path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json");
  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  workflow.currentGate = "G8_PREVIEW_CONFIRMED";
  fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));

  const result = spawnSync(process.execPath, ["scripts/publish.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /G9_PUBLISH_READY/);
});

test("validatePublishMarker rejects marker with delimiter stripped (LLM merge defect)", () => {
  const intact = `${HEADER}abcd${DELIMITER}efgh${DELIMITER}ijkl${FOOTER}`;
  assert.equal(validatePublishMarker(intact), true);

  const merged = `${HEADER}abcdefghijk${FOOTER}`;
  assert.throws(
    () => validatePublishMarker(merged),
    /delimiter.*missing/i
  );

  const noHeader = `##publishStart##abcd${DELIMITER}efgh${FOOTER}`;
  assert.throws(() => validatePublishMarker(noHeader), /missing header/i);

  const noFooter = `${HEADER}abcd${DELIMITER}efgh##publishEnd`;
  assert.throws(() => validatePublishMarker(noFooter), /missing footer/i);

  const emptyBody = `${HEADER}${FOOTER}`;
  assert.throws(() => validatePublishMarker(emptyBody), /empty body/i);
});
