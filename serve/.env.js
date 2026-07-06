const fs = require("node:fs");
const path = require("node:path");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.js"), "utf8"));

module.exports = {
  host: "127.0.0.1",
  port: 4173,
  // 从顶层 config.js 继承，保持与 share-preview.js 写入目录一致
  projectsDir: config.PROJECTS_DIR,

  // ── 开发模式 ────────────────────────────────────────────────────────
  // enabled: true  → 下方字段覆盖生产配置，用于本地开发调试
  // enabled: false → 整个 devMode 块被忽略，生产配置原样生效
  // 留空的字段（""）不覆盖，对应接口退化到现有 mock
  devMode: {
    enabled: true,

    // SSO：validate2 + userinfo 打到此 host
    ssoHost: "https://nsso-test.zhonganinfo.com",

    // UC 用户搜索（search-users 接口）
    // ucOrigin: "https://aigc-test.zhonganonline.com",
    // ucBasePath: "/botWeb/admin/uc",
    ucOrigin:          "http://localhost:8080",
    ucBasePath:        "/api/botWeb/admin/uc",

    // App Center（分享配置读取 + 提交）
    // appCenterOrigin: "",
    // appCenterBasePath: "/app-center",
    appCenterOrigin:   "http://localhost:8080",
    appCenterBasePath: "/api/app-center",
  },

  // ── 生产配置（devMode.enabled = false 时生效）────────────────────────
  previewAuth: {
    enabled: true,
    // ssoHost 不填 → 由 gateway 按请求域名自动判断 test / prd
  },
  shareProxy: {
      // SSO：validate2 + userinfo 打到此 host
      ssoHost: "https://nsso.zhonganinfo.com",

      // UC 用户搜索（search-users 接口）
      // ucOrigin: "https://aigc.zhonganonline.com",
      // ucBasePath: "/botWeb/admin/uc",
      ucOrigin:          "https://aigc.zhonganonline.com",
      ucBasePath:        "/api/botWeb/admin/uc",

      // App Center（分享配置读取 + 提交）
      // appCenterOrigin: "",
      // appCenterBasePath: "/app-center",
      appCenterOrigin:   "https://clawmatic.zhonganonline.com",
      appCenterBasePath: "/api/app-center",
  }
  
};
