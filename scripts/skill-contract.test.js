const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("skill contract limits screenshot usage per task", () => {
  const skillPath = path.resolve(__dirname, "..", "SKILL.md");
  const content = fs.readFileSync(skillPath, "utf8");

  assert.match(content, /单次任务最多截图\s*2\s*次/);
  assert.match(content, /优先在静态审计阶段使用截图/);
});

test("skill contract requires publish marker in a standalone turn", () => {
  const skillPath = path.resolve(__dirname, "..", "SKILL.md");
  const content = fs.readFileSync(skillPath, "utf8");

  assert.match(content, /发布标记.*独立轮次/);
  assert.match(content, /发布标记.*单独发送/);
});

test("skill contract requires plain-text manual preview fallback copy", () => {
  const skillPath = path.resolve(__dirname, "..", "SKILL.md");
  const content = fs.readFileSync(skillPath, "utf8");

  assert.match(content, /页面拒绝链接/);
  assert.match(content, /请用浏览器打开 127\.0\.0\.1:4173 预览页面。/);
  assert.match(content, /浏览地址必须以纯文本形式输出/);
  assert.doesNotMatch(content, /预览地址必须.*Markdown 链接[^]*允许/);
});

test("skill contract requires vitectrl-managed dev preview retention", () => {
  const skillPath = path.resolve(__dirname, "..", "SKILL.md");
  const content = fs.readFileSync(skillPath, "utf8");

  assert.match(content, /node scripts\/vitectrl\/dev-preview\.js start <project-path>/);
  assert.match(content, /最多只保留最近 5 个 managed dev preview/);
  assert.match(content, /自动关闭旧服务/);
});

test("skill contract defines project author as the preferred publish source", () => {
  const skillPath = path.resolve(__dirname, "..", "SKILL.md");
  const content = fs.readFileSync(skillPath, "utf8");

  assert.match(content, /project\.json\.author/);
  assert.match(content, /优先使用.*project\.json\.author/);
  assert.match(content, /为空.*当前对话.*session/i);
});
