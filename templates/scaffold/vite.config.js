import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import zipPack from "@adjfut/vite-plugin-zip-pack";

/**
 * 从 VITE_DEV_PROXY_* 环境变量中解析开发期代理规则，避免把上游域名硬写进仓库文件。
 *
 * 约定格式（写在 .env.local，不进仓库）：
 *   VITE_DEV_PROXY_<KEY>=<前缀>|<上游 origin>
 *
 * 示例：
 *   VITE_DEV_PROXY_USER=/user|https://user-service.example.com
 *   VITE_DEV_PROXY_ORDER=/order|https://order-service.example.com
 *
 * 生成的代理条目：
 *   /api/user → https://user-service.example.com/user/...
 *   /api/order → https://order-service.example.com/order/...
 *
 * 路径转换：/api/<prefix>/rest → /<prefix>/rest（剥掉 /api 前缀，保留 manifest prefix）
 */
function buildDevProxy(env) {
  const proxy = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("VITE_DEV_PROXY_")) continue;
    // 用 indexOf 而非 split，避免 origin 含 '|' 时截断（标准 URL 不含此字符，防御性处理）
    const separatorIndex = value.indexOf("|");
    if (separatorIndex === -1) {
      console.warn(`[vite proxy] ${key} 格式错误，缺少 '|' 分隔符，已跳过。期望格式：<prefix>|<origin>`);
      continue;
    }
    const prefix = value.slice(0, separatorIndex);
    const target = value.slice(separatorIndex + 1);
    if (!prefix || !target) {
      console.warn(`[vite proxy] ${key} prefix 或 origin 为空，已跳过`);
      continue;
    }
    // origin 格式校验：必须含协议，不含路径
    if (!/^https?:\/\/[^/]+$/.test(target)) {
      console.warn(`[vite proxy] ${key} origin 格式错误（期望如 https://host），已跳过：${target}`);
      continue;
    }
    // 代理匹配路径：/api<prefix>（如 /api/user）
    const proxyPath = `/api${prefix}`;
    proxy[proxyPath] = {
      target,
      changeOrigin: true,
      // 剥掉 /api 前缀，上游收到的是 <prefix>/rest（与 manifest 路径一致）
      rewrite: (path) => path.replace(/^\/api/, ""),
      ws: true,   // 同时支持 WebSocket / SSE 升级
    };
  }
  return proxy;
}

export default defineConfig(({ mode }) => {
  // loadEnv 读取 .env、.env.local 等，不依赖 import.meta.env（构建期才有）
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [
      react(),
      zipPack({
        outDir: ".",
        outFileName: "dist.zip",
      }),
    ],
    server: {
      proxy: buildDevProxy(env),
    },
  };
});
