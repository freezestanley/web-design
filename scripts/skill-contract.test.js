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
