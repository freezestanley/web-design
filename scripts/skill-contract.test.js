const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

test("main skill declares authority boundaries and routes to flow references", () => {
  const content = read("SKILL.md");

  assert.match(content, /运行时真相/);
  assert.match(content, /Agent 真相/);
  assert.match(content, /测试角色/);
  assert.match(content, /references\/architecture\/authority-map\.md/);
  assert.match(content, /references\/flow\/entry-modes\.md/);
  assert.match(content, /references\/flow\/gates\.md/);
  assert.match(content, /references\/flow\/context-handoff\.md/);
});

test("main skill preserves core orchestration constraints", () => {
  const content = read("SKILL.md");

  assert.match(content, /禁止绕过 `publish\.js` 直接发布/);
  assert.match(content, /默认保留 `src\/app\/router\.jsx`/);
  assert.match(content, /src\/shared\/auth/);
  assert.match(content, /src\/shared\/http\/axios-instance\.js/);
  assert.match(content, /明确要求公开页面 \/ public page/);
  assert.match(content, /纯文本预览地址/);
});

test("entry modes define lightweight routing instead of full SOP by default", () => {
  const content = read("references/flow/entry-modes.md");

  assert.match(content, /`new build`/);
  assert.match(content, /`revise existing`/);
  assert.match(content, /`audit only`/);
  assert.match(content, /`publish only`/);
  assert.match(content, /不要把所有任务都按完整重型 SOP 执行/);
});

test("gate reference captures confirmation and publish boundaries", () => {
  const content = read("references/flow/gates.md");

  assert.match(content, /G2 -> G3/);
  assert.match(content, /product-sync/);
  assert.match(content, /G4 -> G5/);
  assert.match(content, /G8 -> G9/);
  assert.match(content, /只能执行 `publish\.js`/);
  assert.match(content, /reopen-dev/);
});

test("design stage skill routes to canonical design references", () => {
  const content = read("skills/web-design-design/SKILL.md");

  assert.match(content, /references\/design_workflow\.md/);
  assert.match(content, /references\/design_v2\/design\.md/);
  assert.match(content, /references\/image\.md/);
  assert.match(content, /references\/design_v2\/example\/index\.md/);
  assert.match(content, /references\/design_v2\/example\/hero4\.md/);
  assert.match(content, /references\/design_v2\/design-taste-frontend\.md/);
  assert.match(content, /references\/design_v2\/gpt-taste\.md/);
  assert.match(content, /不要把发布、预览、发布标记协议混进本阶段/);
});

test("main skill routes build and release stages to dedicated skills", () => {
  const content = read("SKILL.md");

  assert.match(content, /skills\/web-design-build\/SKILL\.md/);
  assert.match(content, /references\/build\/task-planning\.md/);
  assert.match(content, /references\/build\/component-boundaries\.md/);
  assert.match(content, /skills\/web-design-release\/SKILL\.md/);
  assert.match(content, /references\/release\/preview-flow\.md/);
  assert.match(content, /references\/release\/publish-flow\.md/);
});

test("build stage skill protects planning and scaffold boundaries", () => {
  const content = read("skills/web-design-build/SKILL.md");

  assert.match(content, /先把开发计划落到磁盘文件中/);
  assert.match(content, /一次只推进一个明确子任务/);
  assert.match(content, /src\/app\/router\.jsx/);
  assert.match(content, /src\/shared\/auth/);
  assert.match(content, /src\/shared\/http\/axios-instance\.js/);
  assert.match(content, /明确要求公开页面 \/ public page/);
});

test("release stage skill enforces preview before publish and marker-only publish", () => {
  const content = read("skills/web-design-release/SKILL.md");

  assert.match(content, /references\/release\/preview-flow\.md/);
  assert.match(content, /references\/release\/publish-flow\.md/);
  assert.match(content, /单次任务只允许 1 次截图/);
  assert.match(content, /share-preview\.js export/);
  assert.match(content, /用户必须明确表示/);
  assert.match(content, /发布标记必须单独一轮原样输出/);
});

test("image guidance requires local src/assets imports and bans raw asset paths", () => {
  const content = read("references/image.md");

  assert.match(content, /src\/assets/);
  assert.match(content, /import heroImage from/);
  assert.doesNotMatch(content, /允许.*src="\.\/assets\//);
  assert.match(content, /禁止这样做/);
});

test("design workflow points implementer and auditor to canonical v2 references", () => {
  const content = read("references/design_workflow.md");

  assert.match(content, /references\/design_v2\/design\.md/);
  assert.match(content, /references\/design_v2\/example\/index\.md/);
  assert.match(content, /references\/design_v2\/example\/hero4\.md/);
  assert.match(content, /references\/design_v2\/design-taste-frontend\.md/);
  assert.match(content, /references\/design_v2\/gpt-taste\.md/);
  assert.match(content, /形成 `design\.md` 后/);
});
