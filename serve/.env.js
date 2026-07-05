const fs = require("node:fs");
const path = require("node:path");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.js"), "utf8"));

module.exports = {
  host: "127.0.0.1",
  port: 4173,
  // 从顶层 config.js 继承，保持与 share-preview.js 写入目录一致
  projectsDir: config.PROJECTS_DIR,
  // 分享功能代理配置
  // ucOrigin: UC 服务地址（对应生产 vite 代理 /api/platform → za-aigc-platform.test.za.biz）
  // ucBasePath: rewrite 后的路径前缀（去掉 /api/platform，保留 /admin/uc）
  shareProxy: {
    ucOrigin: "https://aigc.zhonganonline.com",
    ucBasePath: "/botWeb/admin/uc"
  }
};
