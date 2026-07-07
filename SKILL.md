---
name: web-design
description: 前端页面设计开发到上线的完整 SOP skill。用于 React 页面或项目的创建、续改、静态审计、用户预览和发布。凡是页面相关的新建、修改、编译、预览、发布，都必须使用这个 skill，禁止绕过。
---

# web-design

总控 skill，把页面工作收敛到项目管理、需求确认、设计、开发、静态审计、用户预览和发布的统一 SOP。**必须**先读取 `references/context.md` 上下文管理规则，防止 context 爆炸。

---

## 核心规则

- **上下文管理**：禁止 context 超过 70%，须立即停止任务执行 HANDOFF，用 `/compact` 压缩后从 HANDOFF 恢复。CDP 截图前必须先完成 HANDOFF，防止 token 爆炸。
   ## HANDOFF任务恢复
   用户说「继续任务」/「continue」/「恢复」/「继续上次」时：
   1. 要求用户粘贴上一次的 `CONTEXT_SAVE` 块
   2. 按块中 `[TASK]`/`[DONE]`/`[BLOCK]`/`[NEXT]`/`[REF]` 还原上下文
   3. 从 `[NEXT]` 指定的步骤继续执行，不重复已完成步骤
   4. 若用户未粘贴存档，回复：「请粘贴上次 HANDOFF 输出的 CONTEXT_SAVE 块以恢复任务。」
   
- 页面相关的新建、修改、编译、预览、发布，都必须走 `web-design`。
- 禁止修改技术栈（擅自换框架/打包工具），否则破坏项目一致性，脚本和 CI 失效。
- 禁止使用其他项目模版，只允许使用 template/scaffold，否则破坏项目一致性，脚本和 CI 失效。
- 禁止跳过 SOP Gate 或代替用户确认检查点，违反则立即失败。
- 禁止绕过 `publish.js` 直接发布。
- 审计和预览必须基于 `npm run build` 之后的静态页面，不允许基于 dev server。
- 续改项目时，只允许操作 `PROJECTS_DIR` 下、且存在 `.webdesign/project.json` 的托管项目。
- 生成页面内容时，默认保留 `src/app/router.jsx`、`src/shared/auth/*`、`src/shared/http/axios-instance.js` 这套脚手架鉴权基础设施，禁止把页面改造顺手变成移除 SSO。
- 为防止 CDP 截图导致 token 爆炸，单次任务只允许截图 1 次；优先在静态审计阶段使用，禁止反复截图探索。
- 截图前必须等待页面完成首屏渲染，禁止在页面加载中、骨架屏阶段、明显白屏阶段直接截图。
- 若预览页面存在 SSO 登录态要求，且当前尚未完成登录，必须先要求用户完成登录，再继续截图、审计、预览确认等后续动作。

**大文件处理**：读前 50 行总结结构 → 读中间总结逻辑 → 读末尾确认完整性 → 基于总结修改，不保留原文。

### 全局配置

全局配置在 `config.js`，文件内容是 JSON，由脚本读取解析：

- `PROJECTS_DIR`
- `WEBDESIGN_DIR`
- `TASKS_DIR`
- `WORKFLOW_VERSION`
- `TEMPLATE_DIR`

所有新建项目都放到 `PROJECTS_DIR` 下。

### 项目结构

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

### 图片素材规范

项目中对图片素材的使用规则请参考 `references/image.md`，禁止直接读取图片撑爆 context。
图片在 Step 3 中属于设计输入的一部分，必须先定义用途、位置、遮罩和移动端降级，再允许下载和引用。

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

**API 接口收集规范**：

收集 API 接口时，必须同时明确以下两项，缺一不可：

1. **接口路径列表**：每条接口的方法 + 路径，例如 `GET /api/app-center/projects`
2. **upstreamOrigin**：接口所在的服务域名（含协议，不含路径，不含尾斜杠），例如 `http://api.example.com`

若用户未提供 upstreamOrigin，必须在此阶段补问，不允许用占位符或猜测值继续推进。

若存在多组接口且对应不同 upstreamOrigin，必须按组逐一收集并在 `product.md` 中为每组接口显式写出各自的 `upstreamOrigin`。

禁止把不同上游的接口混写在同一组里却不标注 origin；这会导致代理提取结果不完整，最终 `manifest.json` 缺路由。

**写入 product.md 后，立即执行 product sync**：

```bash
node scripts/product-sync.js <project-path> <task-id> [upstream-origin]
node scripts/product-sync.js <project-path> <task-id> --upstream-origin <origin>
```

`product-sync.js` 会读取当前 task 的 `product.md`，同步 `workflow.json.apiState`，并在需要时提取 proxy routes 后渲染根目录 `manifest.json`。

提取规则（脚本内部调用，此处说明供 AI 理解和校验）：

- 从每条接口路径中剥离 `/api` 前缀后取第一段作为 prefix
  - `/api/app-center/projects` → prefix = `/app-center`
  - `/app-center/projects`（无 `/api` 前缀）→ prefix = `/app-center`
- 若文档块内显式写了 `upstreamOrigin：http://api.example.com`，则该 block 内的接口路径绑定到该 origin
- 若同一个 `API接口` 段内存在多组接口且使用不同 upstreamOrigin，必须在每组接口开始前单独写一行 `upstreamOrigin：...`
- 若文档中没有 inline `upstreamOrigin`，则回退使用 CLI 传入的 `[upstream-origin]`
- 同 upstreamOrigin 下相同 prefix 自动去重
- 结果按前缀长度倒序写入 `.webdesign/manifest.json` 的 `proxy.routes`，再渲染到项目根目录 `manifest.json`

执行后检查脚本输出的 route 列表是否与接口文档吻合，如有遗漏手动补充。

🔴 **CHECKPOINT · G2→G3**：必须先完成 `product-sync.js`，再由用户口头确认 product.md 内容后，才允许推进到设计阶段。禁止代替用户确认。

### Step 3. 开发

1. 先读取 `references/design_workflow.md`，按其中的 Step 3 规程执行。必须先完成页型分流，再继续后续设计工作
2. 先判定当前页面属于哪一类：`Marketing / Landing`、`SaaS / Dashboard / Tool`、`Story / PPT / Scrolltelling`、`Hybrid`
   - `Hybrid` 必须额外写明主页型、副页型，以及副页型只影响哪些模块
   - 禁止先选工具，再倒推页面应该长什么样
3. 根据页型读取本地设计资料和图片策略规范：
   - `Marketing / Landing`：先读 `references/design/landing.md`
   - `SaaS / Dashboard / Tool`：先读 `references/design/landing.md` 中可复用的结构方法，并结合当前项目已有 UI 秩序
   - `Story / PPT / Scrolltelling`：先读 `references/design/ppt.md`、`references/design/story.md`
   - 需要背景、视频、粒子、光影时，再补读 `references/design/background.md`
   - 所有页型都必须读取 `references/image.md`
4. 先定义图片与背景策略，再允许引入素材。至少必须写清：
   - 是否真的需要图片
   - 图片承担主视觉、说明、情绪、产品演示还是纯背景
   - 图片所在 section
   - 是否需要遮罩、裁切、焦点保护
   - 移动端如何降级
   - 缺图 fallback 是什么
5. 根据页型再选择工具（以下为选择矩阵）：

   | 场景 | 使用工具 |
   |------|---------|
   | 基础整页设计与实现 | `design-taste-frontend` |
   | 设计定稿前和审计阶段的视觉纠偏 | `gpt-taste` |
   | 需要滚动叙事、章节推进、sticky/reveal/timeline | `gsap-scrolltrigger` |
   | 需要组件级微交互动效 | `motion.js` / `React Bits` |
   | 表单、表格、后台管理类交互控件 | `antd`（仅 `SaaS / Dashboard / Tool` 或 `Hybrid` 业务模块按需接入） |
   | 纯展示型落地页，无复杂交互 | 仅 `design-taste-frontend` |

6. 使用选定工具形成设计方案，写入 `design.md`
   - `design.md` 必须以 `references/design_v2/design.md` 为模板
   - 可参考 `references/design_v2/example-marketing-design.md` 与 `references/design_v2/example-saas-design.md`，但禁止整份照抄
   - 至少包含：页面身份、设计指纹、视觉关键词、Section Blueprint、图片与背景策略、组件语言、动效策略、移动端降级、负向红线、自检表
   - 以下情况直接视为设计未完成：只有颜色字体没有结构、关键词全是空泛形容词、未写图片策略、未写移动端降级、未写负向红线
7. 使用 `gpt-taste` 先对 `design.md` 做一轮设计自审，确认没有明显页型错位、模板味、图片可读性问题，再进入用户确认
8. 🔴 **CHECKPOINT · G4→G5**：用户口头确认 design.md 后进入开发。
   - 禁止大文件一次性写入、禁止所有代码都在一个文件，必须基于设计方案拆分组件，按模块化、可复用、可维护的原则组织代码
   - 逻辑维护在hook里，UI维护在组件里，禁止把逻辑和UI混在一起
   - 接口请求维护在`services`里,便于维护
9. 必须制定开发计划,后按计划开发,禁止随意改动开发计划
   - 开发计划落地文档task.md,禁止放入context,否则容易撑爆上下文
   - task.md只有使用时才能读取
   - 必须将大任务拆分成多个小任务,禁止一次性写完所有代码,否则容易出错
   - **必须单任务执行** 禁止多个任务同时执行,只允许一次执行一个任务,一次只能写入一个组件
   - 每个任务依次执行，禁止跳过任务,否则容易出错
10. 页面开发时，默认只替换页面内容、样式、业务组件和新增受保护路由；保留 `src/app/router.jsx`、`src/shared/auth/*`、`src/shared/http/axios-instance.js` 的现有 wiring
   - 任何情况都禁止移除SSO、路由守卫和鉴权请求头
11. 图片素材获取步骤：在 Unsplash/Pexels 搜索关键词 → 复制图片直链 → `curl -L "<url>" -o src/assets/<name>.jpg` 下载到本地 → 在组件顶部 `import heroImage from "../../assets/<name>.jpg"` 后再在 JSX 中使用
   - 禁止直接使用外链 URL 作为最终交付资源,防止报错
   - `default.jpg` 仅允许临时占位，若进入审计仍未替换，必须在 `audit.md` 中标记为失败项
12. 开发完成后执行 `node scripts/vitectrl/dev-preview.js start <project-path> --bypass false`
   - `--bypass false` 为必传参数，确保启动和 build 均以 `VITE_SSO_BYPASS=false` 执行，与 G8 用户验收环境一致
   - 该脚本负责统一启动 dev preview，并自动治理由 `web-design` 管理过的 Vite 服务
   - 同一 `project-path` 若已有旧的 managed dev preview，启动新服务前必须自动关闭旧服务
   - 全局最多只保留最近 5 个 managed dev preview；超出的最老服务必须自动关闭释放端口
   - `.env.local` 由 `.gitignore` 保护，不进仓库
   - 启动成功后取返回值中的 `viteUrl`（Vite 原始端口，如 `http://127.0.0.1:517x`），用于 Step 13 的 CDP 截图和审计
13. 对启动的服务路径,做 CDP 检查和 UI 走查，写入 `audit.md`
   - 截图预算固定为单次任务只能 1 次
   - 分配为 1 次桌面全页截图
   - 若首轮截图已足够定位问题，剩余额度保留，禁止为了“多看几眼”继续截图,多次截图
   - 截图前必须先等待页面完成首屏渲染；至少确认主标题、主内容区域、关键图片或核心模块已出现，且页面不再处于 loading / skeleton / spinner / 明显白屏 状态
   - 若页面仍在加载中，必须继续等待，不得提前截图
   - 若页面进入 SSO 登录页、鉴权跳转页或未登录态，必须暂停截图与审计，先通知用户完成登录，再继续后续动作
     读取design audit: `references/design_v2/design_audit.md`，禁止绕过
   - 若出现页型错位、白字压复杂图且无遮罩、工具页信息难扫读、营销页无首屏抓手、故事页无章节推进、默认占位图未替换、明显模板味，直接判定 `overall: FAIL`
14. 🔴 **[必须执行·不可跳过]** 执行 share-preview 导出,再把访问地址发给用户
   - 本步骤与 CDP 截图无关，token 成本为零，不受上下文压力、截图预算、HANDOFF 状态影响，任何情况不得省略
   - 🔴 禁止以任何理由跳过：无论是新建页面、续改页面、小幅修改、样式调整、纯文案改动，还是 agent 自判"用户已知道链接"，均不构成豁免条件
   - 执行命令：`node scripts/share-preview.js export <project-path> <task-id>`
   - 该命令内部已集成 vite preview 健康检查：自动检测 4173 端口是否已占用，未占用则启动 `npm run preview`，等待端口就绪后返回
   - 取返回值中的 `sharePreviewUrl`，执行 `open <sharePreviewUrl>`；若命令失败，必须补发纯文本提示
   - `sharePreviewUrl` 格式为 `http://127.0.0.1:4173/apps/<appId>/`
   - 浏览地址必须以纯文本形式输出，禁止使用 Markdown 链接
15. 用户有修改意见则回退到开发阶段，重新走修改、构建、审计、预览
    - 执行 `reopen-dev` 后 Gate 回退到 `G6_DEVELOPMENT`
    - **必须重新完整走完 G6→G7（静态审计 PASS）→G8（用户预览确认）→G9，才允许执行 `publish.js`**
    - 任何代码修改（包括 `src/`、`scripts/`、配置文件、组件）都视为重新进入 G6，禁止跳过审计和预览直接发布
    - 🔴 禁止在 Gate < G9_PUBLISH_READY 时调用 `publish.js` 或输出发布标记
16. 🔴 **CHECKPOINT · G8→G9**：必须在用户已收到访问地址（Step 14 完成）之后，才能发出询问：「预览是否满意？若无修改将进入发布流程。」
    - 禁止在 Step 14 未完成（未执行 open 且未发出纯文本地址）的情况下发出此询问
    - 用户回复确认表示"已看过页面且满意"，若用户仅回复模糊词（如"好""确认""继续"）且未明确说明已预览，必须追问：「请确认您已在浏览器中查看过页面。」
    - 禁止在未获得用户明确确认前自行推进到 Step 4
    - 用户明确确认已预览且无修改后才能执行发布

### Step 4. 发布

发布只能通过：

```bash
node scripts/publish.js <project-path> <task-id>
```

**发布动作的完整定义（不多不少）：**

1. 再次执行 `npm run build`
2. 从 `.webdesign/manifest.json` 生成项目根目录 `manifest.json`
3. 打出源码 `project.zip`
4. 打出 zip 包根目录包含 `manifest.json` 和 `dist` 的 `dist.zip`
5. 回写 `.webdesign/project.json`
6. 输出发布标记

**发布标记输出成功 = 发布动作完成并结束。**

🔴 **禁止在发布标记输出后追加任何动作**，包括但不限于：
- git commit / git push / git tag
- 文件复制、上传、部署
- 任何"发布后续处理"
- 任何说明、总结、提示语

上述动作均属于错误行为，发布动作在发布标记输出后即告完成，禁止自行扩展。

#### 输出发布标记
- 新的独立一轮，输出发布标记
   - 必须运行 `node scripts/publish.js`，由脚本内部调用 `buildPublishMarker()` 生成发布标记
   - **禁止手工拼接发布标记**：不得读取 project.json 后自行组装字符串输出
   - **发布标记必须遵守**
     禁止做任何修改或解读，
     禁止解读成机器或人类可读格式，
     禁止转换成任何可读模式，只能将其返回值原样输出
   - **处罚**：违反则直接判定为失败重发标记，否则会导致后续流程失败

🔴 **[输出前强制自检]** 在发送发布标记之前，必须先在内部确认以下三项，不通过则不得输出：
- [ ] 本轮输出是否只包含发布标记，没有任何其他文字？
- [ ] 发布标记前后是否完全空白，无说明、无总结、无提示语？
- [ ] 发布标记内容是否为以 `-` 分组的 Base64 密文（不含 `｜` 字符）？若含 `｜`，判定为手拼，禁止输出。
若任一项为"否"，停止输出，重新运行 `node scripts/publish.js` 获取真实标记。

发送规则：

- 只允许发送发布标记，禁止任何其他文案
- 禁止在发布标记前后拼接任何其他文字
- 禁止换行、禁止 markdown 格式化、禁止包裹任何其他文字
- 禁止把信号内容解释或转述成人类可读摘要
- 该轮次只输出发布标记，不拼接解释、总结、提示语或其他正文


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
- `G7 -> G8` 必须已执行 `open <url>` 或已向用户发出纯文本访问地址，两者缺一不可
- `G8 -> G9` 前置条件：① Step 14 已完成（open 已执行或纯文本地址已发送）；② 用户明确确认已在浏览器中查看过页面且无修改意见；禁止 agent 自行推进
- `G9 -> DONE` 禁止用普通 `advance`，只能执行 `publish.js`
- 用户预览后提修改意见时，必须 `reopen-dev` 回到 `G6_DEVELOPMENT`
- **强制**：任何文件修改（`src/`、`scripts/`、`config.js`、组件、配置）发生后，若当前 Gate ≥ G7，必须立即执行 `reopen-dev` 退回 `G6_DEVELOPMENT`，重新触发 G7 审计→G8 预览→G9 流程，禁止在修改后跳过审计直接推进到发布

## 脚本入口

- `node scripts/list-projects.js`
- `node scripts/resolve-project.js <project-name>`
- `node scripts/init-project.js <project-name> <page-slug> <intent> [--summary "..."]`
- `node scripts/gate.js status <project-path> <task-id>`
- `node scripts/gate.js advance <project-path> <task-id> [--confirm "..."]`
- `node scripts/gate.js block <project-path> <task-id> --reason "..."`
- `node scripts/gate.js unblock <project-path> <task-id>`
- `node scripts/gate.js reopen-dev <project-path> <task-id> --reason "..."`
- `node scripts/vitectrl/dev-preview.js <start|status|cleanup> <project-path> --bypass false`
- `node scripts/share-preview.js export <project-path> <task-id> [--output-dir <dir>]`
  - 生成给 `serve` 使用的分享预览快照目录，目录内包含静态构建产物、`manifest.json` 与 `_meta.json`
  - 分享预览构建阶段强制 `VITE_SSO_BYPASS=false`，禁止沿用开发态 `.env.local` 中的 bypass
  - 内置 serve 健康检查（`scripts/lib/ensure-serve.js`）：自动确保 `web-design-serve-gateway` pm2 进程 online，失败写 stderr 警告不阻断主流程
- `node scripts/publish.js <project-path> <task-id>`
- `node scripts/lib/manifest-proxy.js <project-path> [upstream-origin] [--api-doc <path>]`
  - 从接口文档提取 proxy routes 并写入 `.webdesign/manifest.json`
  - 不传 `--api-doc` 时从 stdin 读取文档文本
- `node scripts/product-sync.js <project-path> <task-id> [upstream-origin]`
  - 读取当前 task 的 `product.md`，同步 `workflow.json.apiState`
  - 在有 API 时调用 `manifest-proxy.js` 写模板层，再渲染根目录 `manifest.json`
  - **必须在 G2（product.md 写入后）阶段执行，G2→G3 推进前完成**

## 行为约束

- 禁止直接改发布流程，必须调用脚本。
- 禁止把流程控制写进业务项目的 `package.json`。
- 禁止把预览建立在开发服务器上。
- 禁止把多个页面任务混在同一个 task 下。
- 禁止跳过 `references/design_workflow.md`，设计和开发前必须先读。
- 禁止先选工具、后定页型。
- 禁止未定义图片策略就下载或引用大图、背景图、视频素材。
- 禁止 `design.md` 缺少 Section Blueprint、图片策略、移动端降级和负向红线就推进到 G5。
- 禁止在普通页面生成任务里删除或绕过 `src/app/router.jsx`、`src/shared/auth/*`、`src/shared/http/axios-instance.js`。
- 禁止修改技术栈或项目脚手架,必须且只能使用template下的模版作为项目技术栈和脚手架。

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
| 12 | 单次任务截图超过 1 次 | CDP 截图 token 成本过高，容易把上下文和审计成本打爆 |
| 13 | 修改技术栈（擅自换框架/打包工具） | 破坏项目一致性，脚本和 CI 失效 |
| 14 | 在 manifest 模板中手写 prefix（如 `/openapi`）而不执行 `manifest-proxy.js` | prefix 与前端实际接口路径不匹配，部署后代理 403 |
| 15 | 未明确 upstreamOrigin 就推进到 G3 | proxy.routes 缺少目标域名，平台代理服务无法转发，等同于代理未配置 |
| 16 | 多组接口对应不同 upstreamOrigin，却不为每组接口显式写 `upstreamOrigin` | 路由会错误继承前一个上游或遗漏，最终 `manifest.json` 不完整 |

---

## 失败处理（Failure Handling）

| 触发条件 | 一线修复 | 仍失败的兜底 |
|---------|---------|------------|
| `npm run build` 报错 | 读错误末尾 5 行定位 → 修复对应文件 → 重新 build | 回退到 `G6_DEVELOPMENT`，执行 `gate.js reopen-dev` 并记录原因 |
| Gate advance 被拒（缺字段） | 执行 `gate.js status` 查看缺失字段 → 补全后重试 advance | 告知用户缺少哪个字段，不得静默跳过 |
| 图片资源找不到 | 从 `src/assets` `import defaultImage from ".../assets/default.jpg"` 作为临时占位，在 audit.md 中记录缺图 | 询问用户提供图片，不得使用 CDN URL 直接引用；若最终审计仍未替换，直接判 FAIL |
| `publish.js` 执行失败 | 检查 `dist/index.html` 是否存在 → 重新 `npm run build` → 重试 | 告知用户失败原因，不得用任何其他方式发布 |
| Gate 被 block（`gate.js block`） | 执行 `gate.js unblock` 解锁后重新推进 | 若无法 unblock，告知用户具体 block 原因，等待用户决策 |
| `resolve-project.js` 找不到项目 | 检查 `PROJECTS_DIR` 配置和目录是否存在 | 提示用户：续改只允许操作有 `.webdesign/project.json` 的托管项目 |
| 审计结论为 FAIL | 读取 `audit.md` 中的失败项 → 回到 `G6_DEVELOPMENT` 修复 | 不得在审计 FAIL 的情况下强行推进到 G8 |


# 安装前置依赖和init初始化
检查前置依赖技能和配置,当发现依赖的前置技能不能使用时,强制执行安装前置步骤以及config.js配置。
安装前置依赖技能和项目初始化设置: `references/install.md` 里有详细步骤,请严格按照步骤执行,否则会导致后续流程失败。
