# Serve 开发说明

## 概览

这个目录包含两部分：

- 一个本地 Node 网关，用于托管 `projects/` 下的静态子应用
- 一个前端插件脚手架，位于 `plugins/web-design-control-plugin/`

网关会把构建后的前端插件注入到子应用页面中。日常 UI 开发应放在插件脚手架内完成，而不是直接修改 `gateway.js`。

## 目录结构

```text
serve/
  gateway.js
  server.js
  package.json
  projects/
  plugins/
    web-design-control-plugin/
      src/
      preview/
      runtime/
      scripts/
      dist/
```

## 插件源码

所有插件开发相关文件都在：

`plugins/web-design-control-plugin/`

插件内部的详细开发说明见：

`plugins/web-design-control-plugin/README.md`

## 常用命令

以下命令都在 `serve/` 根目录执行：

```bash
npm run preview
npm run build
npm run test
npm run start
```

命令说明：

- `npm run preview`：启动独立可视化预览页
- `npm run build`：将前端插件构建到 `plugins/web-design-control-plugin/dist/`
- `npm run test`：执行网关和插件构建相关测试
- `npm run start`：启动网关，用于托管 `projects/` 下的真实子应用

## 与 web-design 的关系

`serve` 只负责“分享预览”，不接管 `web-design` 的“开发预览”。

- 开发预览继续使用 `web-design` 的 Vite 预览脚本：`node scripts/vitectrl/dev-preview.js start <project-path> [--bypass true|false]`
- 分享预览先由 `web-design` 导出静态快照：`node scripts/share-preview.js export <project-path> <task-id>`
- 导出后的快照目录会写入 `PROJECTS_DIR`，目录内包含：
  - `index.html`
  - `assets/`
  - `manifest.json`
  - `_meta.json`
- `serve` 再从该目录读取 `manifest.proxy.routes`，为分享态页面提供代理和插件注入
- `serve` 还负责统一的预览登录引导：
  - 开发预览登录入口：`/preview/dev/<project-name>/`
  - 分享预览登录入口：`/apps/<appId>/`
  - 未登录时先跳 SSO，完成登录后再进入真实预览页面

开发态和分享态的 `bypass` 规则必须严格分开：

- 开发预览允许 `--bypass true` 或 `--bypass false`
- 分享预览构建阶段强制 `VITE_SSO_BYPASS=false`
- `serve` 本身不读取项目 `.env.local`，也不继承开发态 bypass
- 当 `previewAuth.enabled=true` 时，`serve` 会把登录得到的 session 同步到：
  - `ATLANTIS_SESSION_ID`：网关自用 cookie
  - `session_id` / `unsafeSessionId`：前端子应用可读取的 session cookie

## 配置加载

`serve` 默认优先读取根目录下的：

`./.env.js`

`.env.js` 会导出完整的 `serve` 配置对象，并且当前实现里会继续读取上级：

`../config.js`

用于复用 `PROJECTS_DIR` 等基础配置。

如果 `.env.js` 不存在，则回退读取：

`./config.example.json`

## 可视化开发

日常 UI 开发请直接修改 `plugins/web-design-control-plugin/` 下的源码，使用 `npm run preview` 预览，具体流程见 `plugins/web-design-control-plugin/README.md`。

## 网关集成

当网关托管子应用页面时，会注入：

- 运行时配置对象
- `__plugin-dist/plugin.css`
- `__plugin-dist/plugin.js`
- `__runtime/plugin-bridge.js`

桥接脚本会把构建后的插件挂载到页面里，并将 AJAX 请求回传给本地网关。

## 控制接口

前端插件只请求本地接口：

- `GET /__plugin/options/select-a`
- `GET /__plugin/options/select-b`
- `POST /__plugin/submit`

默认情况下，`serve` 会直接为这些接口返回 mock 数据。

如果后续配置了真实上游，网关再把这些请求代理到上游服务。

## 注意事项

- 不要把可编辑的插件 UI 逻辑重新写回 `gateway.js`
- 不要手动修改 `dist/`
- 默认启动读取 `config.example.json`，当前插件接口会返回 mock 数据
- 如果预览或网关启动时报 `EADDRINUSE`，请更换端口或停止占用端口的进程
