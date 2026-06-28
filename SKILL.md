---
name: web-design
description: 前端页面设计开发到上线的完整 SOP skill。用于 React 页面或项目的创建、续改、静态审计、用户预览和发布。凡是页面相关的新建、修改、编译、预览、发布，都必须使用这个 skill，禁止绕过。
---

# web-design

`web-design` 是总控 skill，不是单页面 HTML 生成器。它负责把页面工作强制收敛到项目管理、需求确认、设计、开发、静态审计、用户预览和最终发布的统一 SOP,当运行中发现依赖的前置技能丢失时,请执行安装前置步骤以及config.js配置。

## 安装前置

如解析失败请手动安装依赖技能：

- `npx skills add https://github.com/greensock/gsap-skills -g`
- `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend" -g`
- `npx skills add anthropics/skills --skill frontend-design -g`
- `npx skills add ofershap/tailwind-best-practices -g`
- 修改config.js中`PROJECTS_DIR`改为当前 agent workspace的绝对路径下projects文件夹,如`/home/ubuntu/claw-workspace/projects`

## 核心规则

- 页面相关的新建、修改、编译、预览、发布，都必须走 `web-design`。
- 禁止修改技术栈（擅自换框架/打包工具），否则破坏项目一致性，脚本和 CI 失效。
- 禁止使用其他项目模版只允许使用template/scaffold,否则破坏项目一致性，脚本和 CI 失效。
- 禁止跳过 SOP Gate。
- 禁止未确认就推进确认门。
- 禁止绕过 `publish.js` 直接发布。
- 审计和预览必须基于 `npm run build` 之后的静态页面，不允许基于 dev server。
- 续改项目时，只允许操作 `PROJECTS_DIR` 下、且存在 `.webdesign/project.json` 的托管项目。
- 生成页面内容时，默认保留 `src/app/router.jsx`、`src/shared/auth/*`、`src/shared/http/axios-instance.js` 这套脚手架鉴权基础设施，不得把页面改造顺手变成移除 SSO。
- 只有用户明确要求生成公开页面或 public page，且明确说明不需要 SSO，才允许移除或重写上述鉴权基础设施。
- 为防止 CDP 截图导致 token 爆炸，单次任务最多截图 2 次。
- 优先在静态审计阶段使用截图，非必要不截图；禁止把截图当作常规探索手段反复调用。

**大文件处理**：读前 80 行总结结构 → 读中间总结逻辑 → 读末尾确认完整性 → 基于总结修改，不保留原文。

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
- 图片下载到本地,放进项目 `src/assets` 文件夹
- 找不到图,使用项目下 `src/assets/default.jpg` 作为默认占位图
- 禁止直接读取图片,撑爆context
- `src/assets` 下的图片在 React/Vite 项目里必须先 import，再放进 JSX；禁止写成 `./assets/*.jpg`、`/assets/*.jpg` 这类运行时路径绕过 Vite 资源处理

在 React/JSX 中必须这样引用：
```jsx
import defaultImage from "../../assets/default.jpg";

<img src={defaultImage} alt="描述" />
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

🔴 **CHECKPOINT · G2→G3**：用户口头确认 product.md 内容后，才允许推进到设计阶段。禁止代替用户确认。

### Step 3. 开发

1. 先读取 `references/design_workflow.md`，把其中的设计经验、页面结构方法、视觉检查点、工具组合规则作为本次设计输入
2. 根据页面类型选择工具（以下为选择矩阵）：

   | 场景 | 使用工具 |
   |------|---------|
   | 通用视觉风格、色彩排版决策 | `design-taste-frontend` |
   | 需要滚动触发动效（parallax/reveal） | `gsap-scrolltrigger` |
   | 需要组件级微交互动效 | `motion.js` / `React Bits` |
   | 表单、表格、后台管理类交互控件 | `antd`（仅此场景接入，不默认引入） |
   | 纯展示型落地页，无复杂交互 | 仅 `design-taste-frontend` |

3. 图片素材获取步骤：在 Unsplash/Pexels 搜索关键词 → 复制图片直链 → `curl -L "<url>" -o src/assets/<name>.jpg` 下载到本地 → 在组件顶部 `import heroImage from "../../assets/<name>.jpg"` 后再在 JSX 中使用
4. 使用选定工具形成设计方案，写入 `design.md`
5. 🔴 **CHECKPOINT · G4→G5**：用户口头确认 design.md 后进入开发。
6. 页面开发时，默认只替换页面内容、样式、业务组件和新增受保护路由；保留 `src/app/router.jsx`、`src/shared/auth/*`、`src/shared/http/axios-instance.js` 的现有 wiring
   - 任何情况都禁止移除SSO、路由守卫和鉴权请求头
7. 开发完成后执行 `node scripts/vitectrl/dev-preview.js start <project-path>`
   - 该脚本负责统一启动 dev preview，并自动治理由 `web-design` 管理过的 Vite 服务
   - 同一 `project-path` 若已有旧的 managed dev preview，启动新服务前必须自动关闭旧服务
   - 全局最多只保留最近 5 个 managed dev preview；超出的最老服务必须自动关闭释放端口
   - 启动时自动向项目写入 `.env.local`（含 `VITE_SSO_BYPASS=true`），SSO 认证在开发预览中自动关闭
   - `.env.local` 由 `.gitignore` 保护，不进仓库；Step 4 发布构建读 `.env.production`，bypass 不生效
8. 对启动的服务路径,做 CDP 检查和 UI 走查，写入 `audit.md`，格式如下：
   - 截图预算固定为单次任务最多 2 次
   - 优先分配为 1 次桌面全页截图 + 1 次 375px 移动端截图
   - 若首轮截图已足够定位问题，剩余额度保留，不得为了“多看几眼”继续截图
   ```
   ## Audit Report
   task: <task-id>
   date: <YYYY-MM-DD>
   conclusion: PASS | FAIL

   ### 检查项
   - [ ] 页面正常加载，无 JS 报错
   - [ ] 所有图片资源加载成功（无 404）
   - [ ] 移动端适配（375px）正常
   - [ ] 文案与 product.md 一致
   - [ ] 动效无卡顿

   ### 失败项（如有）
   - <描述具体问题>
   ```
9. 主动在浏览器打开启动的服务,并把访问地址发给用户
   - 若自动打开失败，或用户侧出现“页面拒绝链接”等异常，必须补发一条站在用户视角的手动预览提示
   - 提示文案严格使用纯文本句式，例如：`请用浏览器打开 127.0.0.1:4173 预览页面。若显示失败如链接被拒绝请告诉我，将重新打开页面。`
   - 浏览地址必须以纯文本形式输出，禁止使用 Markdown 链接、富文本链接或“点这里打开”一类表述
10. 用户有修改意见则回退到开发阶段，重新走修改、构建、审计、预览

### Step 4. 发布

发布只能通过：

```bash
node scripts/publish.js <project-path> <task-id>
```

发布时必须：

- 再次执行 `npm run build`
- 从 `.webdesign/manifest.json` 生成项目根目录 `manifest.json`
- 打出源码 `project.zip`
- 打出 zip 包根目录包含 `manifest.json`、并同时包含 `dist` 和 `dist-single` 的 `dist.zip`
- 回写 `.webdesign/project.json`
- 输出发布标记

发布标记格式固定为：

```text
##publishStart##session.userAccount｜源码zip绝对路径｜dist.zip绝对路径｜项目名称｜项目简介##publishEnd##
```

发送规则：

- 发布标记必须在一个独立轮次内单独发送
- 该轮次只输出发布标记，不拼接解释、总结、提示语或其他正文
- 不要把发布标记和发布结果说明放在同一条消息里

作者字段规则：

- 项目新建时，从当前对话的 `SESSION_KEY` 读取 session key
- 若 `SESSION_KEY` 缺失，可兼容读取 `SESSION`
- session 格式按 `agent:<agentId>:<channel>:<userAccount>:dm:<sessionNo>` 解析
- 作者固定取 `userAccount`
- 发布时优先使用 `project.json.author`
- 若 `project.json.author` 为空，则从当前对话 session 获取作者并回写到 `project.json.author`
- 发布标记里的作者字段始终使用最终的 `project.json.author`
- 若项目元数据和当前对话都取不到 `userAccount`，则作者字段留空

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
- `G8 -> G9` 必须有用户确认可以发布 如: "请预览是否需要修改,若无修改将进入发布流程？"，禁止 agent 自行推进
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
- `node scripts/vitectrl/dev-preview.js <start|status|cleanup> [project-path]`
- `node scripts/publish.js <project-path> <task-id>`

## 行为约束

- 不要直接改发布流程，必须调用脚本。
- 不要把流程控制写进业务项目的 `package.json`。
- 不要把预览建立在开发服务器上。
- 不要把多个页面任务混在同一个 task 下。
- 不要跳过 `references/design_workflow.md`，设计和开发前必须先读。
- 不要在普通页面生成任务里删除或绕过 `src/app/router.jsx`、`src/shared/auth/*`、`src/shared/http/axios-instance.js`；除非用户明确要求公开页面且不需要 SSO。

---

## 反模式黑名单（Anti-Patterns）

以下是**绝对禁止**的操作，每条附后果说明：

| # | 禁止做 | 后果 |
|---|--------|------|
| 1 | 跳过 Gate 直接推进 | Gate 是代码强制执行的，跳过会导致工作流状态不一致，无法溯源 |
| 2 | 用 `npm start` / dev server 做预览和审计 | 热更新环境与 dist 产物不一致，审计结论失效 |
| 3 | 绕过 `publish.js` 手动复制文件发布 | 发布标记缺失，project.json 不更新，平台无法识别产物 |
| 4 | 代替用户口头确认 Gate（自己写"用户确认了"） | 违反 CHECKPOINT 协议，视为 Gate 未通过 |
| 5 | 一次性读写 >30K 的大文件 | context 爆炸，导致后续操作截断或丢失 |
| 6 | 读取 base64 图片内容 | 单张图片可消耗数万 token，直接卡死上下文 |
| 7 | 使用 CDN URL 直接引用图片 | 外部链接随时失效，打包产物不包含资源 |
| 8 | 把多个页面任务放同一个 task | 审计、回滚、溯源全部混乱，无法单独回退某个页面 |
| 9 | 在普通页面生成任务里删除 `src/app/router.jsx`、`src/shared/auth/*`、`src/shared/http/axios-instance.js` | 页面会绕过脚手架 SSO、路由守卫和鉴权请求头，生成结果与模板约束失配 |
| 10 | 把 `src/assets` 写成 `./assets/*.jpg` 或 `/assets/*.jpg` 直接放进 JSX | Vite 不会按模块产出资源，构建后图片 404 |
| 11 | 在 HANDOFF 前执行 /compact 或 /clear | Gate 状态和任务进度丢失，无法续改 |
| 12 | 单次任务截图超过 2 次 | CDP 截图 token 成本过高，容易把上下文和审计成本打爆 |
| 13 | 修改技术栈（擅自换框架/打包工具） | 破坏项目一致性，脚本和 CI 失效 |

---

## 失败处理（Failure Handling）

| 触发条件 | 一线修复 | 仍失败的兜底 |
|---------|---------|------------|
| `npm run build` 报错 | 读错误末尾 5 行定位 → 修复对应文件 → 重新 build | 回退到 `G6_DEVELOPMENT`，执行 `gate.js reopen-dev` 并记录原因 |
| Gate advance 被拒（缺字段） | 执行 `gate.js status` 查看缺失字段 → 补全后重试 advance | 告知用户缺少哪个字段，不得静默跳过 |
| 图片资源找不到 | 从 `src/assets` `import defaultImage from ".../assets/default.jpg"` 作为占位，在 audit.md 中记录缺图 | 询问用户提供图片，不得使用 CDN URL 直接引用 |
| `publish.js` 执行失败 | 检查 `dist-single/index.html` 是否存在 → 重新 `npm run build` → 重试 | 告知用户失败原因，不得用任何其他方式发布 |
| Gate 被 block（`gate.js block`） | 执行 `gate.js unblock` 解锁后重新推进 | 若无法 unblock，告知用户具体 block 原因，等待用户决策 |
| `resolve-project.js` 找不到项目 | 检查 `PROJECTS_DIR` 配置和目录是否存在 | 提示用户：续改只允许操作有 `.webdesign/project.json` 的托管项目 |
| 审计结论为 FAIL | 读取 `audit.md` 中的失败项 → 回到 `G6_DEVELOPMENT` 修复 | 不得在审计 FAIL 的情况下强行推进到 G8 |
