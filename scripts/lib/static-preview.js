const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

function getContentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

async function startStaticPreview(distDir) {
  const server = http.createServer((request, response) => {
    const requestPath = request.url === "/" ? "/index.html" : request.url;
    const filePath = path.join(distDir, requestPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.statusCode = 404;
      response.end("Not Found");
      return;
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", getContentType(filePath));
    response.end(fs.readFileSync(filePath));
  });

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, resolve);
    });
    const address = server.address();
    const host = typeof address === "object" && address.address && address.address !== "::" ? address.address : "127.0.0.1";

    return {
      mode: "http",
      host,
      port: address.port,
      url: `http://${host}:${address.port}`,
      close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    };
  } catch (error) {
    server.close();
    const indexPath = path.join(distDir, "index.html");
    return {
      mode: "file",
      host: "",
      port: null,
      url: `file://${indexPath}`,
      close: async () => {},
      error
    };
  }
}

module.exports = {
  startStaticPreview
};
