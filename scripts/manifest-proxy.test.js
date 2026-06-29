const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildProxyRoutes,
  extractPrefixesFromText,
  extractRoutesFromText,
} = require("./lib/manifest-proxy");

test("extractRoutesFromText builds per-prefix upstream routes from product blocks", () => {
  const text = `
# Product Brief

## 页面结构
- 路由：/orders、/app-center

## 页面一：订单管理

### API 接口
- 方法：GET /orders
- 方法：POST /orders/search
- upstreamOrigin：http://localhost:3000

## 页面二：应用中心

### API 接口
- 方法：GET /app-center/projects
- upstreamOrigin：http://example.com
`;

  assert.deepEqual(extractRoutesFromText(text), [
    {
      prefix: "/app-center",
      upstreamOrigin: "http://example.com",
    },
    {
      prefix: "/orders",
      upstreamOrigin: "http://localhost:3000",
    },
  ]);
});

test("extractPrefixesFromText keeps backward-compatible single-upstream extraction", () => {
  const text = `
- 方法：GET /orders
- 方法：POST /orders/search
`;

  assert.deepEqual(buildProxyRoutes(extractPrefixesFromText(text), "http://localhost:3000"), [
    {
      prefix: "/orders",
      upstreamOrigin: "http://localhost:3000",
    },
  ]);
});

test("extractRoutesFromText supports multiple upstream origins inside one API section", () => {
  const text = `
## API接口
- upstreamOrigin：http://api-a.example.com
- GET /api/app-center/projects
- POST /api/app-center/search
- upstreamOrigin：http://api-b.example.com
- GET /api/user-center/profile
- POST /api/user-center/logout
`;

  assert.deepEqual(extractRoutesFromText(text), [
    {
      prefix: "/user-center",
      upstreamOrigin: "http://api-b.example.com",
    },
    {
      prefix: "/app-center",
      upstreamOrigin: "http://api-a.example.com",
    },
  ]);
});
