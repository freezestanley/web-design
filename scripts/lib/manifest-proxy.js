#!/usr/bin/env node

"use strict";

/**
 * manifest-proxy.js
 *
 * 从接口文档文本中提取 proxy routes，写入 .webdesign/manifest.json 模板。
 *
 * 提取规则：
 *   1. 从每行接口路径中剥离 /api 前缀后，取第一段路径作为 prefix
 *      例：/api/app-center/projects → prefix = /app-center
 *          /app-center/projects    → prefix = /app-center（无 /api 前缀也兼容）
 *   2. 若文档块内含 `upstreamOrigin: https://host`，则按块内 origin 生成 route
 *   3. 若文档未内联 upstreamOrigin，则回退到 CLI 传入的默认 upstreamOrigin
 *   4. 同一 upstreamOrigin 下的同 prefix 去重
 *   5. 按前缀长度倒序排列（精确路由优先），与 manifest.js 的 sortRoutesByPrefixLength 保持一致
 *
 * CLI 用法：
 *   node scripts/lib/manifest-proxy.js <project-path> [upstream-origin] [--api-doc <path>]
 *
 *   --api-doc  接口文档文件路径（不传则从 stdin 读取）
 *
 * 编程接口：
 *   extractPrefixesFromText(text)                 → string[]  提取去重后的 prefix 列表
 *   extractRoutesFromText(text, defaultUpstream)  → Route[]   从文档直接构造 route
 *   buildProxyRoutes(prefixes, upstream)          → Route[]   构造 route 对象数组
 *   writeProxyRoutes(projectPath, routes)         → void      写入 manifest 模板
 */

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { loadConfig } = require("./load-config");
const { validateManifest, getManifestTemplatePath } = require("./manifest");

const config = loadConfig();

// ─── 常量 ────────────────────────────────────────────────────────────────────

const UPSTREAM_RE = /^https?:\/\/[^/]+$/;
const INLINE_UPSTREAM_RE = /upstreamOrigin[：:]\s*(https?:\/\/[^/\s]+)/i;

// 匹配一行中出现的 URL 路径段，支持：
//   GET /api/app-center/projects
//   POST /user-center/login
//   /api/order/list?page=1
// 不匹配纯注释行（以 # 开头）
const PATH_LINE_RE = /(?:^|\s)(\/[a-zA-Z0-9_\-/]+)/g;

// ─── 核心逻辑 ────────────────────────────────────────────────────────────────

/**
 * 从路径字符串中提取代理前缀。
 *
 * 剥 /api 逻辑：
 *   /api/app-center/... → /app-center
 *   /api/v1/user/...    → /v1/user 的第一段 → /v1
 *   /app-center/...     → /app-center（无 /api 前缀）
 *   /api                → 跳过（剥掉后为空）
 *
 * @param {string} urlPath
 * @returns {string|null}
 */
function extractPrefix(urlPath) {
  if (!urlPath || !urlPath.startsWith("/")) return null;

  let segments = urlPath.replace(/\?.*$/, "").split("/").filter(Boolean);

  // 剥 /api 前缀
  if (segments[0] === "api") {
    segments = segments.slice(1);
  }

  if (segments.length === 0) return null;

  // 取第一段作为 prefix
  return `/${segments[0]}`;
}

/**
 * 从接口文档文本中提取去重后的 prefix 列表（按字母排序）。
 *
 * @param {string} text
 * @returns {string[]}
 */
function extractPrefixesFromText(text) {
  const seen = new Set();

  for (const line of text.split("\n")) {
    // 跳过纯注释行
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;

    let match;
    // 重置 lastIndex（全局正则需要）
    PATH_LINE_RE.lastIndex = 0;
    while ((match = PATH_LINE_RE.exec(line)) !== null) {
      const prefix = extractPrefix(match[1]);
      if (prefix) seen.add(prefix);
    }
  }

  return [...seen].sort();
}

function sortRoutes(routes) {
  return [...routes].sort((a, b) => b.prefix.length - a.prefix.length);
}

function extractUpstreamOriginFromBlock(block) {
  const match = block.match(INLINE_UPSTREAM_RE);
  if (!match) return null;
  if (!UPSTREAM_RE.test(match[1])) {
    throw new Error(
      `upstreamOrigin 格式错误，期望如 https://example.com，实际得到：${match[1]}`
    );
  }
  return match[1];
}

function addRoute(routeMap, prefix, upstreamOrigin) {
  const existing = routeMap.get(prefix);
  if (existing && existing !== upstreamOrigin) {
    throw new Error(
      `prefix "${prefix}" 关联了多个 upstreamOrigin：${existing} / ${upstreamOrigin}`
    );
  }
  routeMap.set(prefix, upstreamOrigin);
}

/**
 * 从文档文本中直接提取 proxy route。
 *
 * 优先读取文档块内的 `upstreamOrigin:`：
 *   - 适用于 product.md 中多模块、多上游的场景
 *   - 每个空行分隔的 block 独立提取 prefix + upstreamOrigin
 *
 * 若文档内不存在任何 inline upstreamOrigin，则退回到默认 upstreamOrigin。
 *
 * @param {string} text
 * @param {string|undefined} defaultUpstreamOrigin
 * @returns {Array<{prefix: string, upstreamOrigin: string}>}
 */
function extractRoutesFromText(text, defaultUpstreamOrigin) {
  const blocks = text.split(/\n\s*\n/);
  const routeMap = new Map();
  let hasInlineUpstream = false;

  for (const block of blocks) {
    const upstreamOrigin = extractUpstreamOriginFromBlock(block);
    if (!upstreamOrigin) continue;

    hasInlineUpstream = true;
    for (const prefix of extractPrefixesFromText(block)) {
      addRoute(routeMap, prefix, upstreamOrigin);
    }
  }

  if (hasInlineUpstream) {
    return sortRoutes(
      [...routeMap.entries()].map(([prefix, upstreamOrigin]) => ({
        prefix,
        upstreamOrigin,
      }))
    );
  }

  if (!defaultUpstreamOrigin) {
    return [];
  }

  return buildProxyRoutes(extractPrefixesFromText(text), defaultUpstreamOrigin);
}

/**
 * 构造 proxy route 对象数组，按前缀长度倒序排列。
 *
 * @param {string[]} prefixes
 * @param {string} upstreamOrigin
 * @returns {Array<{prefix: string, upstreamOrigin: string}>}
 */
function buildProxyRoutes(prefixes, upstreamOrigin) {
  if (!UPSTREAM_RE.test(upstreamOrigin)) {
    throw new Error(
      `upstreamOrigin 格式错误，期望如 https://example.com，实际得到：${upstreamOrigin}`
    );
  }

  const routes = prefixes.map((prefix) => ({ prefix, upstreamOrigin }));
  return sortRoutes(routes);
}

/**
 * 将 routes 写入项目的 .webdesign/manifest.json 模板。
 * 只更新 proxy.routes，其他字段保持不变。
 * 写入后执行 validateManifest 校验。
 *
 * @param {string} projectPath
 * @param {Array<{prefix: string, upstreamOrigin: string}>} routes
 */
function writeProxyRoutes(projectPath, routes) {
  const templatePath = getManifestTemplatePath(projectPath);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`manifest 模板不存在：${templatePath}`);
  }

  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));

  const updated = {
    ...template,
    proxy: {
      ...(template.proxy || {}),
      routes,
    },
  };

  validateManifest(updated);
  fs.writeFileSync(templatePath, JSON.stringify(updated, null, 2));
}

// ─── CLI 入口 ────────────────────────────────────────────────────────────────

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseCliArgs(argv) {
  const positional = [];
  const options = {};

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--api-doc") {
      options.apiDoc = argv[i + 1];
      i++;
    } else {
      positional.push(argv[i]);
    }
  }

  return {
    projectPath: positional[0],
    upstreamOrigin: positional[1],
    apiDoc: options.apiDoc,
  };
}

async function readStdin() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin });
    const lines = [];
    rl.on("line", (line) => lines.push(line));
    rl.on("close", () => resolve(lines.join("\n")));
  });
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  if (!args.projectPath) {
    fail(
      "用法：node scripts/lib/manifest-proxy.js <project-path> [upstream-origin] [--api-doc <path>]\n" +
        "示例：node scripts/lib/manifest-proxy.js ./projects/admin http://api.example.com --api-doc ./api-doc.txt"
    );
  }

  let text;
  if (args.apiDoc) {
    const docPath = path.resolve(args.apiDoc);
    if (!fs.existsSync(docPath)) {
      fail(`接口文档文件不存在：${docPath}`);
    }
    text = fs.readFileSync(docPath, "utf8");
  } else {
    text = await readStdin();
  }

  const routes = extractRoutesFromText(text, args.upstreamOrigin);

  if (routes.length === 0) {
    fail(
      "未从接口文档中提取到任何有效 proxy route。请检查文档中的接口路径，或补充 inline upstreamOrigin / CLI upstreamOrigin。"
    );
  }

  writeProxyRoutes(path.resolve(args.projectPath), routes);

  process.stdout.write(
    `已写入 ${routes.length} 条 proxy route：\n${routes.map((r) => `  ${r.prefix} → ${r.upstreamOrigin}`).join("\n")}\n`
  );
}

if (require.main === module) {
  main().catch((err) => {
    fail(err.message);
  });
}

module.exports = {
  extractPrefix,
  extractPrefixesFromText,
  extractRoutesFromText,
  buildProxyRoutes,
  writeProxyRoutes,
};
