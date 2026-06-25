const test = require("node:test");
const assert = require("node:assert/strict");

const { runCdpCheck } = require("./lib/cdp-check");

test("cdp checker rejects missing url", async () => {
  await assert.rejects(() => runCdpCheck({}), /url/i);
});

test("cdp checker summarizes console errors into pass fail result", async () => {
  const result = await runCdpCheck({
    url: "http://127.0.0.1:4173",
    consoleMessages: [
      { type: "info", text: "ready" },
      { type: "error", text: "boom" }
    ]
  });

  assert.equal(result.passed, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.summary, /1 console error/i);
});
