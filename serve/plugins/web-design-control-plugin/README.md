# Web Design Control Plugin 开发说明

## 概览

这是给外层 `serve/` 网关使用的前端插件脚手架。

它使用纯 JavaScript 和 CSS 开发，支持独立预览页进行可视化编辑，并能构建出供外层插件加载的 bundle 产物。

## 目录结构

```text
web-design-control-plugin/
  src/
    plugin.manifest.json
    plugin/
      core.js
      api.js
      view.js
      entry.js
    styles/
      plugin.css
  preview/
    index.html
    preview.js
  runtime/
    plugin-bridge.js
  scripts/
    build-plugin.js
    preview-server.js
  dist/
    plugin.js
    plugin.css
    manifest.json
```

## 源码编辑

主要可编辑源码位置：

- `src/plugin/`：插件逻辑和 UI 结构
- `src/styles/plugin.css`：插件样式
- `src/plugin.manifest.json`：构建输入顺序和 bundle 元数据

不要手动修改 `dist/`。

## 开发命令

以下命令从 `serve/` 根目录执行：

```bash
npm run preview
npm run build
npm run test
```

对应的底层脚本：

- `node plugins/web-design-control-plugin/scripts/preview-server.js`
- `node plugins/web-design-control-plugin/scripts/build-plugin.js`

## 预览开发流程

可视化开发时使用预览模式：

1. 执行 `npm run preview`
2. 打开终端输出的预览地址
3. 修改 `src/` 下的文件
4. 刷新浏览器查看效果

预览页入口：

- `preview/index.html`

预览挂载脚本：

- `preview/preview.js`

预览 mock 接口：

- `GET /preview-api/options/select-a`
- `GET /preview-api/options/select-b`
- `POST /preview-api/submit`

## 构建产物

构建会生成：

- `dist/plugin.js`
- `dist/plugin.css`
- `dist/manifest.json`

外层网关会通过以下路径加载这些文件：

- `/__plugin-dist/plugin.js`
- `/__plugin-dist/plugin.css`

## 运行时集成

外层网关会注入：

- 运行时配置对象
- 构建后的插件 CSS
- 构建后的插件 JS
- `runtime/plugin-bridge.js`

`runtime/plugin-bridge.js` 只是一个很薄的挂载桥接层，真正的 UI 逻辑必须保留在 `src/` 中。

## 控制请求模型

插件只请求本地网关接口：

- `GET /__plugin/options/select-a`
- `GET /__plugin/options/select-b`
- `POST /__plugin/submit`

默认情况下，这些接口直接返回 mock 数据。

如果外层网关配置了真实上游，再由网关负责把这些请求代理到上游服务。

## 注意事项

- UI 逻辑放在 `src/`，不要放回 `gateway.js`
- `runtime/` 只保留薄桥接层
- 默认开发环境下，插件接口会拿到 `serve` 提供的 mock 数据
- 在把 bundle 产物交给外层集成前，先重新执行构建
