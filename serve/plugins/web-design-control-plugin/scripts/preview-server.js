#!/usr/bin/env node

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const { buildPlugin } = require("./build-plugin");
const { createLogger } = require("../../../logger");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  response.end(body);
}

function sendFile(response, filePath) {
  response.writeHead(200, {
    "content-type": getContentType(filePath)
  });
  fs.createReadStream(filePath).pipe(response);
}

async function startPreviewServer(options = {}) {
  const rootDir = path.resolve(options.rootDir || path.join(__dirname, ".."));
  const host = options.host || "127.0.0.1";
  const port = Number(options.port || process.env.PREVIEW_PORT || 4174);
  const logger =
    options.logger ||
    createLogger({
      rootDir: path.resolve(rootDir, "..", "..", ".."),
      level: process.env.LOG_LEVEL,
      service: "web-design-control-preview"
    });

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
    const startedAt = Date.now();

    response.on("finish", () => {
      logger.info(
        "preview.request.completed",
        {
          method: request.method,
          path: requestUrl.pathname,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt
        },
        { category: "access" }
      );
    });

    try {
      if (requestUrl.pathname === "/") {
        response.writeHead(302, { location: "/preview/" });
        response.end();
        return;
      }

      if (requestUrl.pathname === "/preview-api/options/select-a") {
        return sendJson(response, 200, [
          { label: "Test", value: "test" },
          { label: "Prod", value: "prod" }
        ]);
      }

      if (requestUrl.pathname === "/preview-api/options/select-b") {
        return sendJson(response, 200, [
          { label: "CN", value: "cn" },
          { label: "US", value: "us" }
        ]);
      }

      if (requestUrl.pathname === "/preview-api/submit" && request.method === "POST") {
        const chunks = [];
        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8") || "{}";
          sendJson(response, 200, {
            accepted: true,
            received: JSON.parse(body)
          });
        });
        return;
      }

      if (requestUrl.pathname.startsWith("/__plugin-dist/")) {
        buildPlugin({ rootDir });
        const filePath = path.join(rootDir, "dist", requestUrl.pathname.replace("/__plugin-dist/", ""));
        if (fs.existsSync(filePath)) {
          return sendFile(response, filePath);
        }
        return sendJson(response, 404, { error: "dist_asset_not_found" });
      }

      if (requestUrl.pathname.startsWith("/preview/")) {
        const relativePath = requestUrl.pathname === "/preview/" ? "index.html" : requestUrl.pathname.replace("/preview/", "");
        const filePath = path.join(rootDir, "preview", relativePath);
        if (fs.existsSync(filePath)) {
          return sendFile(response, filePath);
        }
      }

      sendJson(response, 404, { error: "not_found" });
    } catch (error) {
      logger.error("preview.request.failed", {
        method: request.method,
        path: requestUrl.pathname,
        error
      });
      sendJson(response, 500, { error: "preview_server_error", message: error.message });
    }
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  logger.info("preview.started", {
    host,
    port,
    rootDir
  });
  return {
    url: `http://${host}:${port}/preview/`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => {
          if (error) {
            return reject(error);
          }
          logger.info("preview.stopped", {
            host,
            port
          });
          return resolve();
        })
      )
  };
}

if (require.main === module) {
  startPreviewServer()
    .then((preview) => {
      process.stdout.write(`${preview.url}\n`);
      const shutdown = async () => {
        await preview.close();
        process.exit(0);
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    })
    .catch((error) => {
      process.stderr.write(`${error.stack || error.message}\n`);
      process.exit(1);
    });
}

module.exports = {
  startPreviewServer
};
