async function runCdpCheck({ url, consoleMessages = [] } = {}) {
  if (!url) {
    throw new Error("url is required for cdp check");
  }

  const errors = consoleMessages.filter((message) => message.type === "error");

  return {
    url,
    passed: errors.length === 0,
    errors,
    summary: errors.length === 0 ? "0 console errors" : `${errors.length} console error(s)`
  };
}

module.exports = {
  runCdpCheck
};
