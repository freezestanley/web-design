---
name: web-design
description: 前端页面设计开发到上线的完整 SOP skill。用于 React 页面或项目的创建、续改、静态审计、用户预览和发布。凡是页面相关的新建、修改、编译、预览、发布，都必须使用这个 skill，禁止绕过。
---

# web-design

`web-design` 是总控 skill，不是单页面 HTML 生成器。它负责把页面工作强制收敛到项目管理、需求确认、设计、开发、静态审计、用户预览和最终发布的统一 SOP。

## 安装前置

如解析失败请手动安装依赖技能：

- `npx skills add https://github.com/greensock/gsap-skills -g`
- `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend" -g`
- `npx skills add anthropics/skills --skill frontend-design -g`
- `npx skills add ofershap/tailwind-best-practices -g`

## 核心规则

- 页面相关的新建、修改、编译、预览、发布，都必须走 `web-design`。
- 禁止跳过 SOP Gate。
- 禁止未确认就推进确认门。
- 禁止绕过 `publish.js` 直接发布。
- 审计和预览必须基于 `npm run build` 之后的静态页面，不允许基于 dev server。
- 续改项目时，只允许操作 `PROJECTS_DIR` 下、且存在 `.webdesign/project.json` 的托管项目。

**大文件处理协议**：
```
如果需要读取已有大文件：
  1. 读取文件前 80 行 → 总结结构
  2. 读取中间部分 → 总结逻辑
  3. 读取末尾部分 → 确认完整性
  4. 基于总结执行修改，不保留原文
```

| 禁令 | 原因 |
|------|------|
| 禁止跳跃 Gate | Gate 是工程代码强制执行的，不是建议 |
| 禁止修改技术栈 | 用户要求修改时明确拒绝 |
| 禁止一次性读写 >30K 文件 | 防止 context 爆炸 |
| 禁止读取 base64 图片 | 极度消耗 context |
| 禁止图片使用 CDN URL 直接引用 | 下载图片到本地 |
| 禁止在 HANDOFF 前执行 /compact 或 /clear | 防止丢失任务状态 |
| 禁止代替用户确认 Gate | 用户确认门必须用户口头确认 |
| 禁止一次性生成完整大页面 | 逐区块生成 |

## 全局配置

全局配置在 `config.js`，文件内容是 JSON，由脚本读取解析：

- `PROJECTS_DIR`
- `WEBDESIGN_DIR`
- `TASKS_DIR`
- `WORKFLOW_VERSION`
- `TEMPLATE_DIR`

所有新建项目都放到 `PROJECTS_DIR` 下。

## 项目结构

```text
<PROJECTS_DIR>/<project-name>/
  .webdesign/
    project.json
    tasks/
      <yyyyMMdd-HHmmss>-<page-slug>/
        workflow.json
        product.md
        design.md
        audit.md
  src/...
  public/...
  package.json
```

`project.json` 保存项目级信息和最新发布产物路径。  
`tasks/<task-id>/` 保存单次页面新建或修改任务。

---

## 图片素材规范

优先使用 Unsplash/Pexels搜索图片素材
- 图片下载到本地,项目assets文件夹下
- 找不到图,使用项目下`assets/default.jpg`作为默认占位图 
- 禁止直接读取图片,撑爆context

在 HTML/JSX 中直接引用：
```jsx
<img src="./assets/default.jpg" alt="描述" />
```
---


## SOP 步骤

### Step 1. 项目确认

执行 `node scripts/list-projects.js` 扫描 `PROJECTS_DIR`，展示全量项目表格：

- 项目名
- 项目简介
- 项目修改时间

然后只允许两种分支：

- 新建项目
- 续改已有托管项目

### Step 2. 页面任务确认

为本次页面任务创建 task，并写入 `product.md`。必须收集：

- 页面主题
- 页面素材
- 文案
- API 接口
- 动效
- 受众
- 场景
- 验收要求

用户明确确认后，才允许推进到设计阶段。

### Step 3. 开发

1. 先读取 `references/design_workflow.md`，把其中的设计经验、页面结构方法、视觉检查点、工具组合规则作为本次设计输入
2. 根据页面类型按需组合 `design-taste-frontend`、`frontend-design`、`React Bits`、`gsap-scrolltrigger`、`motion.js`
3. 复杂业务控件、表单、表格、后台交互场景按需接入 `antd`，不要默认引入
4. 使用选定工具形成设计方案，写入 `design.md`
5. 用户确认设计后进入开发
6. 开发完成后执行 `npm run build`
7. 基于打包产出的 `dist-single/index.html` 做 CDP 检查和 UI 走查，写入 `audit.md`
8. 主动在浏览器打开 `dist-single/index.html`，并把访问地址发给用户
9. 用户有修改意见则回退到开发阶段，重新走修改、构建、审计、预览

### Step 4. 发布

发布只能通过：

```bash
node scripts/publish.js <project-path> <task-id>
```

发布时必须：

- 再次执行 `npm run build`
- 打出源码 zip
- 打出包含 `dist` 和 `dist-single` 的 `dist.zip`
- 回写 `.webdesign/project.json`
- 输出发布标记

发布标记格式固定为：

```text
##publishStart##作者｜源码zip路径｜dist.zip路径｜项目名称｜项目简介##publishEnd##
```

## Gate 状态机

```text
G0_PROJECT_SELECTED
G1_TASK_CREATED
G2_PRODUCT_WRITTEN
G3_PRODUCT_CONFIRMED
G4_DESIGN_WRITTEN
G5_DESIGN_CONFIRMED
G6_DEVELOPMENT
G7_STATIC_AUDIT_PASSED
G8_PREVIEW_CONFIRMED
G9_PUBLISH_READY
DONE
```

关键推进规则：

- `G2 -> G3` 必须带用户确认原话
- `G4 -> G5` 必须带用户确认原话
- `G6 -> G7` 必须 `audit.md` 结论为 `PASS`
- `G8 -> G9` 必须有用户确认可以发布
- `G9 -> DONE` 禁止用普通 `advance`，只能执行 `publish.js`
- 用户预览后提修改意见时，必须 `reopen-dev` 回到 `G6_DEVELOPMENT`

## 脚本入口

- `node scripts/list-projects.js`
- `node scripts/resolve-project.js <project-name>`
- `node scripts/init-project.js <project-name> <page-slug> <intent> [--summary "..."]`
- `node scripts/gate.js status <project-path> <task-id>`
- `node scripts/gate.js advance <project-path> <task-id> [--confirm "..."]`
- `node scripts/gate.js block <project-path> <task-id> --reason "..."`
- `node scripts/gate.js unblock <project-path> <task-id>`
- `node scripts/gate.js reopen-dev <project-path> <task-id> --reason "..."`
- `node scripts/publish.js <project-path> <task-id>`

## 行为约束

- 不要直接改发布流程，必须调用脚本。
- 不要把流程控制写进业务项目的 `package.json`。
- 不要把预览建立在开发服务器上。
- 不要把多个页面任务混在同一个 task 下。
- 不要跳过 `references/design_workflow.md`，设计和开发前必须先读。
