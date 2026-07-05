# Share & Publish Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 web-design-control-plugin 改造为只有「发布」和「分享」两个按钮，点击「分享」弹出纯 JS/CSS 实现的 ShareEntry 对话框，接口逻辑通过 serve gateway 代理。

**Architecture:** 去掉原有 SelectA/SelectB/Submit 逻辑，在 `view.js` 用纯 DOM 实现发布按钮（预留，handler 空）和分享对话框（复刻 React ShareEntry 的状态机与 UI）；在 `api.js` 新增三个分享接口方法；在 `gateway.js` 新增 `/__plugin/share/*` 路由，代理到配置文件中的上游 origin；`config.example.json` 和 `serve-config.js` 新增 `shareProxy` 字段。

**Tech Stack:** Node.js (http 模块), 原生 JS (ES5 兼容，IIFE bundle), 原生 CSS, Node.js test runner

## Global Constraints

- 插件所有 JS 必须 ES5 兼容（无 import/export，无箭头函数在顶层、无 class），但 `async/await` 已在现有代码中使用故可保留
- CSS 类名前缀统一用 `wdp-`
- 端点前缀 `/__plugin/share/` — 与现有 `/__plugin/` 保持同级
- `gateway.js` 新增路由不破坏现有 `/__plugin/options/*` 和 `/__plugin/submit` 逻辑
- 测试框架：Node.js 内置 `node:test` + `node:assert/strict`，无需安装额外依赖
- `plugin-bridge.js` 不修改（它只负责 mount，选项透传即可）

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `plugins/web-design-control-plugin/src/plugin/view.js` | **替换** | 只渲染发布/分享按钮 + ShareEntry 对话框 DOM |
| `plugins/web-design-control-plugin/src/plugin/api.js` | **替换** | 去掉旧三方法，新增 `loadShareConfig` / `submitShare` / `searchUsers` |
| `plugins/web-design-control-plugin/src/plugin/core.js` | **不变** | `mergeOptions` 不再需要 labels/endpoints — 但保持现有字段，删除无用字段 |
| `plugins/web-design-control-plugin/src/styles/plugin.css` | **替换** | 去掉 select/field 样式，新增按钮行 + 对话框样式 |
| `plugins/web-design-control-plugin/src/plugin.manifest.json` | **不变** | 文件列表不变 |
| `serve/gateway.js` | **修改** | 新增 `getShareTarget` / `buildShareMockPayload` / `/__plugin/share/*` 路由处理 |
| `serve/config.example.json` | **修改** | 新增 `shareProxy` 字段示例 |
| `serve/gateway.test.js` | **修改** | 新增分享端点测试（mock 和 proxy 两个 case） |
| `serve/plugin-build.test.js` | **修改** | 断言 `plugin.js` 包含 `wdp-share-dialog` 和 `publish` |

---

## Task 1: 清理 core.js 无用字段，重写 api.js

**Files:**
- Modify: `plugins/web-design-control-plugin/src/plugin/core.js`
- Modify: `plugins/web-design-control-plugin/src/plugin/api.js`

**Interfaces:**
- Produces:
  - `plugin.createApiClient(options, fetchImpl)` — 返回 `{ loadShareConfig(appId), submitShare(appId, payload), searchUsers(q) }`
  - `options.shareEndpoints.config` — `string` URL
  - `options.shareEndpoints.submit` — `string` URL
  - `options.shareEndpoints.searchUsers` — `string` URL

- [ ] **Step 1: 修改 `core.js` — 去掉 labels/endpoints，新增 shareEndpoints**

将 `src/plugin/core.js` 完整替换为：

```js
plugin.instances = new Map();

plugin.defaultOptions = {
  title: "Shared Control",
  shareEndpoints: {
    config: "/__plugin/share/config",
    submit: "/__plugin/share/submit",
    searchUsers: "/__plugin/share/search-users"
  },
  mode: "inline"
};

plugin.mergeOptions = function mergeOptions(options) {
  var raw = options || {};
  var se = raw.shareEndpoints || {};
  var def = plugin.defaultOptions.shareEndpoints;
  return {
    appId: raw.appId || "preview-app",
    currentPath: raw.currentPath || "/preview",
    title: raw.title || plugin.defaultOptions.title,
    shareEndpoints: {
      config:       se.config       || def.config,
      submit:       se.submit       || def.submit,
      searchUsers:  se.searchUsers  || def.searchUsers
    },
    mode: raw.mode || plugin.defaultOptions.mode
  };
};

plugin.getStorageKey = function getStorageKey(appId) {
  return "__webdesign_control_plugin__:" + appId;
};

plugin.readPersisted = function readPersisted(appId) {
  try {
    return JSON.parse(global.localStorage.getItem(plugin.getStorageKey(appId)) || "{}");
  } catch (error) {
    return {};
  }
};

plugin.writePersisted = function writePersisted(appId, value) {
  global.localStorage.setItem(plugin.getStorageKey(appId), JSON.stringify(value));
};

plugin.createElement = function createElement(tagName, className, text) {
  var element = global.document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (typeof text === "string") {
    element.textContent = text;
  }
  return element;
};

plugin.setStatus = function setStatus(node, message, tone) {
  node.textContent = message || "";
  node.dataset.tone = tone || "";
};
```

- [ ] **Step 2: 完整替换 `api.js`**

```js
plugin.requestJson = async function requestJson(url, init, fetchImpl) {
  var fetcher = fetchImpl || global.fetch;
  var response = await fetcher(url, init);
  if (!response.ok) {
    throw new Error("request_failed");
  }
  return response.json();
};

plugin.createApiClient = function createApiClient(options, fetchImpl) {
  var ep = options.shareEndpoints;
  return {
    loadShareConfig: function loadShareConfig(appId) {
      return plugin.requestJson(
        ep.config + "?appId=" + encodeURIComponent(appId),
        { method: "GET" },
        fetchImpl
      );
    },
    submitShare: function submitShare(appId, payload) {
      return plugin.requestJson(
        ep.submit,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ appId: appId, shareType: payload.shareType, members: payload.members })
        },
        fetchImpl
      );
    },
    searchUsers: function searchUsers(q) {
      return plugin.requestJson(
        ep.searchUsers + "?q=" + encodeURIComponent(q),
        { method: "GET" },
        fetchImpl
      );
    }
  };
};
```

- [ ] **Step 3: 构建验证**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
node -e "
  const { buildPlugin } = require('./plugins/web-design-control-plugin/scripts/build-plugin');
  const path = require('path');
  const rootDir = path.join(__dirname, 'plugins/web-design-control-plugin');
  const result = buildPlugin({ rootDir });
  console.log('build ok:', result.manifest.name);
"
```

期望输出：`build ok: web-design-control-plugin`

- [ ] **Step 4: Commit**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
git add plugins/web-design-control-plugin/src/plugin/core.js \
        plugins/web-design-control-plugin/src/plugin/api.js
git commit -m "refactor(plugin): replace selectA/B/submit with share api client"
```

---

## Task 2: 重写 view.js — 发布/分享按钮 + ShareEntry 对话框

**Files:**
- Modify: `plugins/web-design-control-plugin/src/plugin/view.js`

**Interfaces:**
- Consumes: `plugin.createApiClient(options)` → `{ loadShareConfig, submitShare, searchUsers }`
- Consumes: `plugin.createElement`, `plugin.setStatus`
- Produces: `plugin.render(container, options, apiClient)` → `{ destroy() }`

**ShareEntry 状态机（同 React 版）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `open` | bool | 对话框是否显示 |
| `shareType` | `"SPECIFIC"/"GLOBAL"` | 分享范围 |
| `accounts` | `[{value, label}]` | 已选域账号 |
| `userCache` | `{[username]: UserInfo}` | username→完整信息映射 |
| `submitting` | bool | 提交中 |
| `loadingInitial` | bool | 回填中 |
| `searchResults` | `[{value, label}]` | 搜索下拉候选 |
| `searchLoading` | bool | 搜索中 |

- [ ] **Step 1: 完整替换 `view.js`**

```js
plugin.render = function render(container, options, apiClient) {
  container.innerHTML = "";
  container.className = "";
  container.classList.add("wdp-root");
  if (options.mode === "floating") container.classList.add("wdp-root--floating");
  if (options.mode === "header")   container.classList.add("wdp-root--header");

  // ── 顶层 action bar ──────────────────────────────────────────────
  var bar = plugin.createElement("div", "wdp-action-bar");

  var publishBtn = plugin.createElement("button", "wdp-btn wdp-btn--publish", "发布");
  publishBtn.type = "button";
  publishBtn.addEventListener("click", function () {
    // TODO: 发布接口待补充
  });

  var shareBtn = plugin.createElement("button", "wdp-btn wdp-btn--share", "分享");
  shareBtn.type = "button";

  bar.appendChild(publishBtn);
  bar.appendChild(shareBtn);
  container.appendChild(bar);

  // ── ShareEntry 对话框 ────────────────────────────────────────────
  var state = {
    open: false,
    shareType: "SPECIFIC",
    accounts: [],         // [{value, label}]
    userCache: {},        // {username: UserInfo}
    submitting: false,
    loadingInitial: false,
    searchResults: [],
    searchLoading: false,
    searchTerm: ""
  };

  // ── 对话框 DOM 结构 ──
  var overlay    = plugin.createElement("div", "wdp-overlay");
  var dialog     = plugin.createElement("div", "wdp-share-dialog");
  var header     = plugin.createElement("div", "wdp-share-dialog__header");
  var headerTitle = plugin.createElement("span", "wdp-share-dialog__title", "分享");
  var closeBtn   = plugin.createElement("button", "wdp-share-dialog__close", "×");
  closeBtn.type  = "button";
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);

  var body       = plugin.createElement("div", "wdp-share-dialog__body");
  var loadingMask = plugin.createElement("div", "wdp-share-dialog__loading", "加载中...");

  // 分享范围 radio group
  var rangeSection = plugin.createElement("div", "wdp-form-section");
  var rangeLabel   = plugin.createElement("div", "wdp-form-label", "分享范围");
  var radioGroup   = plugin.createElement("div", "wdp-radio-group");

  var radioSpecific = document.createElement("label");
  radioSpecific.className = "wdp-radio-option";
  var inputSpecific = document.createElement("input");
  inputSpecific.type = "radio"; inputSpecific.name = "wdp-share-type"; inputSpecific.value = "SPECIFIC";
  inputSpecific.checked = true;
  radioSpecific.appendChild(inputSpecific);
  radioSpecific.appendChild(document.createTextNode(" 指定成员"));

  var radioGlobal = document.createElement("label");
  radioGlobal.className = "wdp-radio-option";
  var inputGlobal = document.createElement("input");
  inputGlobal.type = "radio"; inputGlobal.name = "wdp-share-type"; inputGlobal.value = "GLOBAL";
  radioGlobal.appendChild(inputGlobal);
  radioGlobal.appendChild(document.createTextNode(" 全员可见"));

  radioGroup.appendChild(radioSpecific);
  radioGroup.appendChild(radioGlobal);
  rangeSection.appendChild(rangeLabel);
  rangeSection.appendChild(radioGroup);

  // 指定成员搜索区（SPECIFIC 时显示）
  var membersSection = plugin.createElement("div", "wdp-form-section");
  var membersLabel   = plugin.createElement("div", "wdp-form-label", "分享人");
  var tagsRow        = plugin.createElement("div", "wdp-tags-row");   // 已选 tag
  var searchWrap     = plugin.createElement("div", "wdp-search-wrap");
  var searchInput    = document.createElement("input");
  searchInput.type = "text"; searchInput.className = "wdp-search-input";
  searchInput.placeholder = "搜索域账号";
  var searchDropdown = plugin.createElement("div", "wdp-search-dropdown");
  searchDropdown.style.display = "none";
  searchWrap.appendChild(searchInput);
  searchWrap.appendChild(searchDropdown);
  membersSection.appendChild(membersLabel);
  membersSection.appendChild(tagsRow);
  membersSection.appendChild(searchWrap);

  // 全员可见提示
  var globalHint = plugin.createElement(
    "p", "wdp-global-hint",
    "开启后，所有用户均可访问该应用。"
  );
  globalHint.style.display = "none";

  body.appendChild(loadingMask);
  body.appendChild(rangeSection);
  body.appendChild(membersSection);
  body.appendChild(globalHint);

  var footer     = plugin.createElement("div", "wdp-share-dialog__footer");
  var cancelBtn  = plugin.createElement("button", "wdp-btn wdp-btn--cancel", "取消");
  cancelBtn.type = "button";
  var okBtn      = plugin.createElement("button", "wdp-btn wdp-btn--ok", "分享");
  okBtn.type = "button";
  footer.appendChild(cancelBtn);
  footer.appendChild(okBtn);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  // overlay 挂到 document.body，避免被 container 的 overflow 裁切
  document.body.appendChild(overlay);
  overlay.style.display = "none";

  // ── render helpers ───────────────────────────────────────────────
  function renderTags() {
    tagsRow.innerHTML = "";
    state.accounts.forEach(function (acc) {
      var tag = plugin.createElement("span", "wdp-tag", acc.label);
      var del = plugin.createElement("button", "wdp-tag__del", "×");
      del.type = "button";
      del.addEventListener("click", function () {
        state.accounts = state.accounts.filter(function (a) { return a.value !== acc.value; });
        renderTags();
      });
      tag.appendChild(del);
      tagsRow.appendChild(tag);
    });
  }

  function renderDropdown() {
    searchDropdown.innerHTML = "";
    if (state.searchLoading) {
      var li = plugin.createElement("div", "wdp-dropdown-item wdp-dropdown-item--loading", "搜索中...");
      searchDropdown.appendChild(li);
      searchDropdown.style.display = "block";
      return;
    }
    if (!state.searchResults.length) {
      searchDropdown.style.display = "none";
      return;
    }
    state.searchResults.forEach(function (user) {
      var already = state.accounts.some(function (a) { return a.value === user.value; });
      var item = plugin.createElement("div", "wdp-dropdown-item" + (already ? " wdp-dropdown-item--selected" : ""), user.label);
      if (!already) {
        item.addEventListener("click", function () {
          state.accounts.push(user);
          // 同步 userCache
          if (user._raw) state.userCache[user.value] = user._raw;
          searchInput.value = "";
          state.searchResults = [];
          searchDropdown.style.display = "none";
          renderTags();
        });
      }
      searchDropdown.appendChild(item);
    });
    searchDropdown.style.display = "block";
  }

  function applyShareTypeUI() {
    if (state.shareType === "SPECIFIC") {
      membersSection.style.display = "";
      globalHint.style.display = "none";
    } else {
      membersSection.style.display = "none";
      globalHint.style.display = "";
    }
  }

  function setLoadingMask(on) {
    loadingMask.style.display = on ? "flex" : "none";
    state.loadingInitial = on;
  }

  function setSubmitting(on) {
    state.submitting = on;
    okBtn.disabled = on;
    cancelBtn.disabled = on;
    okBtn.textContent = on ? "处理中..." : "分享";
  }

  // ── debounce search ──────────────────────────────────────────────
  var searchTimer = null;
  searchInput.addEventListener("input", function () {
    var q = searchInput.value.trim();
    clearTimeout(searchTimer);
    if (!q) {
      state.searchResults = [];
      searchDropdown.style.display = "none";
      return;
    }
    state.searchLoading = true;
    renderDropdown();
    searchTimer = setTimeout(async function () {
      try {
        var users = await apiClient.searchUsers(q);
        // users: [{username, name, ...}]
        state.searchResults = users.map(function (u) {
          return {
            value: u.username,
            label: (u.name || u.username) + "（" + u.username + "）",
            _raw: u
          };
        });
      } catch (_) {
        state.searchResults = [];
      }
      state.searchLoading = false;
      renderDropdown();
    }, 300);
  });

  // 点击 dialog 外部关闭 dropdown（不关闭 dialog）
  document.addEventListener("click", function onDocClick(e) {
    if (!searchWrap.contains(e.target)) {
      searchDropdown.style.display = "none";
    }
  });

  // ── radio change ─────────────────────────────────────────────────
  inputSpecific.addEventListener("change", function () {
    state.shareType = "SPECIFIC";
    applyShareTypeUI();
  });
  inputGlobal.addEventListener("change", function () {
    state.shareType = "GLOBAL";
    applyShareTypeUI();
  });

  // ── open dialog ──────────────────────────────────────────────────
  async function openDialog() {
    // reset
    state.shareType = "SPECIFIC";
    state.accounts = [];
    state.userCache = {};
    state.searchResults = [];
    searchInput.value = "";
    inputSpecific.checked = true;
    inputGlobal.checked = false;
    applyShareTypeUI();
    renderTags();
    setSubmitting(false);
    searchDropdown.style.display = "none";

    overlay.style.display = "flex";
    state.open = true;

    // 回填已有配置
    setLoadingMask(true);
    try {
      var cfg = await apiClient.loadShareConfig(options.appId);
      if (cfg) {
        var nextType = cfg.shareType === "GLOBAL" ? "GLOBAL" : "SPECIFIC";
        state.shareType = nextType;
        if (nextType === "GLOBAL") {
          inputGlobal.checked = true; inputSpecific.checked = false;
        } else {
          inputSpecific.checked = true; inputGlobal.checked = false;
        }
        var members = cfg.members || [];
        state.accounts = members
          .filter(function (m) { return !!m.account; })
          .map(function (m) {
            state.userCache[m.account] = {
              username: m.account,
              name: m.name || m.account,
              companyName: m.company,
              primaryDepartmentName: m.department
            };
            return {
              value: m.account,
              label: (m.name || m.account) + "（" + m.account + "）"
            };
          });
        applyShareTypeUI();
        renderTags();
      }
    } catch (_) {
      // 回填失败保持默认值
    } finally {
      setLoadingMask(false);
    }
  }

  function closeDialog() {
    if (state.submitting) return;
    overlay.style.display = "none";
    state.open = false;
  }

  // ── submit ───────────────────────────────────────────────────────
  okBtn.addEventListener("click", async function () {
    if (state.submitting) return;
    var members = state.shareType === "SPECIFIC"
      ? state.accounts.map(function (a) {
          var u = state.userCache[a.value] || {};
          return {
            account: a.value,
            name: u.name || a.value,
            company: u.companyName || "",
            department: u.primaryDepartmentName || ""
          };
        })
      : [];

    if (state.shareType === "SPECIFIC" && members.length === 0) {
      // 简单校验：SPECIFIC 必须选人
      searchInput.classList.add("wdp-search-input--error");
      setTimeout(function () { searchInput.classList.remove("wdp-search-input--error"); }, 1500);
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.submitShare(options.appId, {
        shareType: state.shareType,
        members: members
      });
      closeDialog();
    } catch (_) {
      setSubmitting(false);
    }
  });

  shareBtn.addEventListener("click", openDialog);
  closeBtn.addEventListener("click", closeDialog);
  cancelBtn.addEventListener("click", closeDialog);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeDialog();
  });

  return {
    destroy: function destroy() {
      container.innerHTML = "";
      container.className = "";
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  };
};
```

- [ ] **Step 2: 构建验证**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
node -e "
  const { buildPlugin } = require('./plugins/web-design-control-plugin/scripts/build-plugin');
  const path = require('path');
  const fs = require('fs');
  const rootDir = path.join(__dirname, 'plugins/web-design-control-plugin');
  const result = buildPlugin({ rootDir });
  const js = fs.readFileSync(path.join(result.distDir, 'plugin.js'), 'utf8');
  const hasDialog = js.includes('wdp-share-dialog');
  const hasPublish = js.includes('wdp-btn--publish');
  console.log('wdp-share-dialog:', hasDialog, '| wdp-btn--publish:', hasPublish);
"
```

期望输出：`wdp-share-dialog: true | wdp-btn--publish: true`

- [ ] **Step 3: Commit**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
git add plugins/web-design-control-plugin/src/plugin/view.js
git commit -m "feat(plugin/view): replace selects with publish/share buttons and ShareEntry dialog"
```

---

## Task 3: 重写 plugin.css — 去旧样式，新增按钮行 + 对话框样式

**Files:**
- Modify: `plugins/web-design-control-plugin/src/styles/plugin.css`

- [ ] **Step 1: 完整替换 `plugin.css`**

```css
/* ── reset ─────────────────────────────────────────── */
.wdp-root {
  box-sizing: border-box;
}
.wdp-root *,
.wdp-root *::before,
.wdp-root *::after {
  box-sizing: inherit;
}

.wdp-root--floating {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2147483647;
}
.wdp-root--header {
  width: 100%;
}

/* ── action bar ─────────────────────────────────────── */
.wdp-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

/* ── shared button base ────────────────────────────── */
.wdp-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.wdp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wdp-btn--publish {
  background: #22c55e;
  color: #052e16;
}
.wdp-btn--publish:hover:not(:disabled) {
  background: #16a34a;
}

.wdp-btn--share {
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}
.wdp-btn--share:hover:not(:disabled) {
  background: #e0e7ff;
}

.wdp-btn--cancel {
  background: #f1f5f9;
  color: #475569;
}
.wdp-btn--cancel:hover:not(:disabled) {
  background: #e2e8f0;
}

.wdp-btn--ok {
  background: #4f46e5;
  color: #fff;
}
.wdp-btn--ok:hover:not(:disabled) {
  background: #4338ca;
}

/* ── overlay ────────────────────────────────────────── */
.wdp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483646;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

/* ── dialog ─────────────────────────────────────────── */
.wdp-share-dialog {
  width: 460px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.wdp-share-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.wdp-share-dialog__title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.wdp-share-dialog__close {
  background: none;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 4px;
}
.wdp-share-dialog__close:hover { color: #475569; }

.wdp-share-dialog__body {
  position: relative;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.wdp-share-dialog__loading {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #64748b;
  border-radius: 0 0 0 0;
}

.wdp-share-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid #f1f5f9;
}

/* ── form ────────────────────────────────────────────── */
.wdp-form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wdp-form-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
}

.wdp-radio-group {
  display: flex;
  gap: 8px;
}

.wdp-radio-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  user-select: none;
}
.wdp-radio-option:has(input:checked) {
  background: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
}

.wdp-global-hint {
  margin: 0;
  padding: 8px 12px;
  background: #eef2ff;
  border-radius: 8px;
  font-size: 12.5px;
  color: #4338ca;
}

/* ── tags ────────────────────────────────────────────── */
.wdp-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 0;
}

.wdp-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 12px;
  color: #334155;
}

.wdp-tag__del {
  background: none;
  border: none;
  font-size: 14px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.wdp-tag__del:hover { color: #ef4444; }

/* ── search ──────────────────────────────────────────── */
.wdp-search-wrap {
  position: relative;
}

.wdp-search-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #0f172a;
  outline: none;
}
.wdp-search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.wdp-search-input--error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.wdp-search-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.wdp-dropdown-item {
  padding: 8px 12px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
}
.wdp-dropdown-item:hover {
  background: #f8fafc;
}
.wdp-dropdown-item--selected {
  color: #94a3b8;
  cursor: default;
}
.wdp-dropdown-item--loading {
  color: #94a3b8;
  font-style: italic;
  cursor: default;
}
```

- [ ] **Step 2: 构建验证**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
node -e "
  const { buildPlugin } = require('./plugins/web-design-control-plugin/scripts/build-plugin');
  const path = require('path');
  const fs = require('fs');
  const rootDir = path.join(__dirname, 'plugins/web-design-control-plugin');
  const result = buildPlugin({ rootDir });
  const css = fs.readFileSync(path.join(result.distDir, 'plugin.css'), 'utf8');
  console.log('wdp-action-bar:', css.includes('wdp-action-bar'));
  console.log('wdp-share-dialog:', css.includes('wdp-share-dialog'));
  console.log('wdp-overlay:', css.includes('wdp-overlay'));
"
```

期望输出三行均为 `true`。

- [ ] **Step 3: Commit**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
git add plugins/web-design-control-plugin/src/styles/plugin.css
git commit -m "feat(plugin/css): replace select/field styles with action-bar and share dialog styles"
```

---

## Task 4: gateway.js — 新增 `/__plugin/share/*` 路由

**Files:**
- Modify: `serve/gateway.js`

**Interfaces:**
- Consumes: `options.shareProxy` — `{ appCenterOrigin: string, appCenterBasePath: string, ucOrigin: string, ucBasePath: string }`
- Produces: 路由 `/__plugin/share/config` `/__plugin/share/submit` `/__plugin/share/search-users`

路由规则：

| 路径 | 方法 | 无 shareProxy 时 | 有 shareProxy 时 |
|------|------|-----------------|-----------------|
| `/__plugin/share/config?appId=X` | GET | mock 返回 `{shareType:"SPECIFIC",members:[]}` | 代理 `GET {appCenterOrigin}{appCenterBasePath}/projects/{appId}/share` |
| `/__plugin/share/submit` | POST body `{appId,shareType,members}` | mock 返回 `{accepted:true,mock:true}` | 代理 `POST {appCenterOrigin}{appCenterBasePath}/projects/{appId}/share` |
| `/__plugin/share/search-users?q=X` | GET | mock 返回 `[{username:"mock-user",name:"Mock User"}]` | 代理 `GET {ucOrigin}{ucBasePath}/user?username={q}` |

- [ ] **Step 1: 在 gateway.js 的 `getControlTarget` 函数之后新增辅助函数**

在 `gateway.js` 中，找到 `function getControlTarget` 定义结束的位置（`}` 行，约第 855 行），在其**后面**插入：

```js
function getShareRouteType(pathname) {
  if (pathname === "/__plugin/share/config")        return "config";
  if (pathname === "/__plugin/share/submit")        return "submit";
  if (pathname === "/__plugin/share/search-users")  return "search-users";
  return null;
}

function buildShareMockPayload(routeType, requestPayload, searchParams) {
  if (routeType === "config") {
    return { shareType: "SPECIFIC", members: [] };
  }
  if (routeType === "submit") {
    return { accepted: true, mock: true, received: requestPayload };
  }
  if (routeType === "search-users") {
    var q = searchParams.get("q") || "";
    return [{ username: "mock-" + (q || "user"), name: "Mock " + (q || "User") }];
  }
  return null;
}
```

- [ ] **Step 2: 在 handler 函数中，在 `/__plugin/` 路由块的前面插入 `/__plugin/share/` 路由处理**

在 `gateway.js` 中找到这一行（约第 1051 行）：

```js
      if (requestUrl.pathname.startsWith("/__plugin/") || requestUrl.pathname.startsWith("/__control/")) {
```

在此行**之前**（但在 `/__plugin-dist/` 处理块之后）插入：

```js
      if (requestUrl.pathname.startsWith("/__plugin/share/")) {
        routeType = "plugin-share";
        const shareRouteType = getShareRouteType(requestUrl.pathname);
        if (!shareRouteType) {
          return sendJson(response, 404, { error: "unsupported_share_route", pathname: requestUrl.pathname });
        }
        const isSubmit = shareRouteType === "submit";
        if (isSubmit && request.method !== "POST") {
          return sendJson(response, 405, { error: "method_not_allowed" });
        }
        if (!isSubmit && request.method !== "GET") {
          return sendJson(response, 405, { error: "method_not_allowed" });
        }

        const shareProxy = options.shareProxy || {};
        const hasAppCenter = shareProxy.appCenterOrigin;
        const hasUc = shareProxy.ucOrigin;

        // search-users → UC 代理
        if (shareRouteType === "search-users") {
          if (!hasUc) {
            return sendJson(response, 200, buildShareMockPayload("search-users", null, requestUrl.searchParams));
          }
          const q = requestUrl.searchParams.get("q") || "";
          const ucBase = shareProxy.ucBasePath || "/admin/uc";
          return proxyToUpstream({
            request, response,
            upstreamOrigin: shareProxy.ucOrigin,
            targetPath: `${ucBase}/user?username=${encodeURIComponent(q)}`,
            sessionToken: "",
            serviceName: "",
            logger, requestId,
            pathName: requestUrl.pathname
          });
        }

        // config + submit → app-center 代理
        if (!hasAppCenter) {
          const payload = isSubmit ? await parseJsonBody(request) : null;
          return sendJson(response, 200, buildShareMockPayload(shareRouteType, payload, requestUrl.searchParams));
        }

        const appCenterBase = shareProxy.appCenterBasePath || "/app-center";
        if (shareRouteType === "config") {
          const qAppId = requestUrl.searchParams.get("appId") || "";
          return proxyToUpstream({
            request, response,
            upstreamOrigin: shareProxy.appCenterOrigin,
            targetPath: `${appCenterBase}/projects/${encodeURIComponent(qAppId)}/share`,
            sessionToken: "",
            serviceName: "",
            logger, requestId,
            pathName: requestUrl.pathname
          });
        }

        // submit
        const submitBody = await parseJsonBody(request);
        if (!submitBody) {
          return sendJson(response, 400, { error: "invalid_json" });
        }
        const submitAppId = submitBody.appId || "";
        return proxyToUpstream({
          request, response,
          upstreamOrigin: shareProxy.appCenterOrigin,
          targetPath: `${appCenterBase}/projects/${encodeURIComponent(submitAppId)}/share`,
          sessionToken: "",
          serviceName: "",
          logger, requestId,
          pathName: requestUrl.pathname
        });
      }
```

- [ ] **Step 3: 验证语法（不启动服务）**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
node --check gateway.js && echo "syntax ok"
```

期望输出：`syntax ok`

- [ ] **Step 4: Commit**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
git add gateway.js
git commit -m "feat(gateway): add /__plugin/share/* routes with mock and upstream proxy"
```

---

## Task 5: config.example.json 新增 shareProxy 字段

**Files:**
- Modify: `serve/config.example.json`

- [ ] **Step 1: 更新 `config.example.json`**

将文件完整替换为：

```json
{
  "host": "127.0.0.1",
  "port": 4173,
  "projectsDir": "./projects",
  "shareProxy": {
    "appCenterOrigin": "",
    "appCenterBasePath": "/app-center",
    "ucOrigin": "",
    "ucBasePath": "/admin/uc"
  }
}
```

注释说明：
- `appCenterOrigin` 空字符串时，`/__plugin/share/config` 和 `/__plugin/share/submit` 走 mock
- `ucOrigin` 空字符串时，`/__plugin/share/search-users` 走 mock
- 填入真实 origin 后即转为代理（无需修改代码）

- [ ] **Step 2: Commit**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
git add config.example.json
git commit -m "docs(config): add shareProxy fields to example config"
```

---

## Task 6: 测试 — gateway 分享端点 + plugin build 断言

**Files:**
- Modify: `serve/gateway.test.js`
- Modify: `serve/plugin-build.test.js`

- [ ] **Step 1: 在 `gateway.test.js` 末尾追加两个测试**

在文件末尾追加：

```js
test("share endpoints return mock data when shareProxy is not configured", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-share-mock-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_SHARE_MOCK" });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir
    // no shareProxy
  });

  try {
    const base = `http://127.0.0.1:${gateway.port}`;

    // config mock
    const configRes = await fetch(`${base}/__plugin/share/config?appId=APP001`);
    assert.equal(configRes.status, 200);
    const configData = await configRes.json();
    assert.equal(configData.shareType, "SPECIFIC");
    assert.ok(Array.isArray(configData.members));

    // submit mock
    const submitRes = await fetch(`${base}/__plugin/share/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appId: "APP001", shareType: "GLOBAL", members: [] })
    });
    assert.equal(submitRes.status, 200);
    const submitData = await submitRes.json();
    assert.equal(submitData.accepted, true);
    assert.equal(submitData.mock, true);

    // search-users mock
    const searchRes = await fetch(`${base}/__plugin/share/search-users?q=zhang`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(Array.isArray(searchData));
    assert.ok(searchData.length > 0);
    assert.ok(searchData[0].username);
  } finally {
    await gateway.close();
  }
});

test("share endpoints proxy to upstream when shareProxy is configured", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-share-proxy-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_SHARE_PROXY" });

  // 创建两个 upstream server（app-center + uc）
  const appCenterRequests = [];
  const appCenterServer = await createUpstreamServer(async (req, res) => {
    appCenterRequests.push({ method: req.method, url: req.url });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ shareType: "GLOBAL", members: [] }));
  });

  const ucRequests = [];
  const ucServer = await createUpstreamServer(async (req, res) => {
    ucRequests.push({ method: req.method, url: req.url });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify([{ username: "za-test", name: "Test User" }]));
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    shareProxy: {
      appCenterOrigin: appCenterServer.url,
      appCenterBasePath: "/app-center",
      ucOrigin: ucServer.url,
      ucBasePath: "/admin/uc"
    }
  });

  try {
    const base = `http://127.0.0.1:${gateway.port}`;

    // config → proxy GET /app-center/projects/{appId}/share
    const configRes = await fetch(`${base}/__plugin/share/config?appId=APP001`);
    assert.equal(configRes.status, 200);
    assert.equal(appCenterRequests.length, 1);
    assert.equal(appCenterRequests[0].method, "GET");
    assert.ok(appCenterRequests[0].url.includes("/app-center/projects/APP001/share"));

    // submit → proxy POST /app-center/projects/{appId}/share
    const submitRes = await fetch(`${base}/__plugin/share/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appId: "APP001", shareType: "SPECIFIC", members: [{ account: "za-test" }] })
    });
    assert.equal(submitRes.status, 200);
    assert.equal(appCenterRequests.length, 2);
    assert.equal(appCenterRequests[1].method, "POST");

    // search-users → proxy GET /admin/uc/user?username=xxx
    const searchRes = await fetch(`${base}/__plugin/share/search-users?q=test`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(Array.isArray(searchData));
    assert.equal(ucRequests.length, 1);
    assert.ok(ucRequests[0].url.includes("/admin/uc/user"));
    assert.ok(ucRequests[0].url.includes("username=test"));
  } finally {
    await Promise.all([gateway.close(), appCenterServer.close(), ucServer.close()]);
  }
});
```

- [ ] **Step 2: 更新 `plugin-build.test.js` — 新增对 view.js 内容的断言**

在文件末尾追加：

```js
test("buildPlugin includes share dialog and publish button in output", () => {
  const rootDir = path.join(path.resolve(__dirname), "plugins", "web-design-control-plugin");
  const distDir = path.join(rootDir, "dist");

  const result = buildPlugin({ rootDir });

  const pluginJs = fs.readFileSync(path.join(distDir, "plugin.js"), "utf8");
  const pluginCss = fs.readFileSync(path.join(distDir, "plugin.css"), "utf8");

  assert.match(pluginJs, /wdp-share-dialog/, "plugin.js should contain share dialog class");
  assert.match(pluginJs, /wdp-btn--publish/, "plugin.js should contain publish button class");
  assert.match(pluginJs, /loadShareConfig/, "plugin.js should contain loadShareConfig method");
  assert.match(pluginJs, /submitShare/, "plugin.js should contain submitShare method");
  assert.match(pluginJs, /searchUsers/, "plugin.js should contain searchUsers method");

  assert.match(pluginCss, /wdp-action-bar/, "plugin.css should contain action bar class");
  assert.match(pluginCss, /wdp-overlay/, "plugin.css should contain overlay class");
  assert.match(pluginCss, /wdp-share-dialog/, "plugin.css should contain share dialog class");
});
```

- [ ] **Step 3: 运行所有测试**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
node --test
```

期望：所有测试通过，无 FAIL。

- [ ] **Step 4: Commit**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
git add gateway.test.js plugin-build.test.js
git commit -m "test: add share endpoint tests (mock and proxy) and plugin build assertions"
```

---

## Self-Review

**Spec coverage 检查：**

| 需求 | 覆盖任务 |
|------|---------|
| 去掉 SelectA/SelectB/Submit | Task 1 (api.js) + Task 2 (view.js) |
| 发布按钮（接口空） | Task 2 view.js |
| 分享按钮 + 点击显示 ShareEntry | Task 2 view.js |
| ShareEntry 纯 JS/CSS | Task 2 + Task 3 |
| loadShareConfig / submitShare / searchUsers | Task 1 api.js |
| gateway 代理 `/__plugin/share/*` | Task 4 gateway.js |
| shareProxy 写在 config.js（config.example.json） | Task 5 |
| mock 降级（无 shareProxy 配置时） | Task 4 gateway.js |
| 测试覆盖 | Task 6 |

**Placeholder 扫描：** 无 TBD/TODO，发布按钮 handler 按需求明确标注 `// TODO: 发布接口待补充`。

**Type consistency：**
- `api.js` 的 `loadShareConfig` → `gateway` 接收 `?appId=` query param ✓
- `api.js` 的 `submitShare(appId, {shareType, members})` → `gateway` 从 body 读 `submitBody.appId` ✓
- `api.js` 的 `searchUsers(q)` → `gateway` 接收 `?q=` query param ✓
- `view.js` 调用 `apiClient.loadShareConfig(options.appId)` — `options.appId` 由 `plugin-bridge.js` 透传 ✓
