const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { startStaticPreview } = require("./lib/static-preview");

test("static preview serves dist and returns url metadata", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-static-preview-"));
  const distDir = path.join(tempDir, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><h1>hello</h1>");

  const preview = await startStaticPreview(distDir);
  if (preview.mode === "http") {
    const response = await fetch(preview.url);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /hello/);
    assert.equal(typeof preview.port, "number");
  } else {
    assert.match(preview.url, /^file:\/\//);
    assert.equal(fs.existsSync(path.join(distDir, "index.html")), true);
  }

  await preview.close();
});
