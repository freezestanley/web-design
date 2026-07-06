(function (global) {
  var plugin = {};
  plugin.name = "web-design-control-plugin";
  plugin.version = "1.0.0";

  // src/plugin/core.js
  (function (plugin, global) {
    plugin.instances = new Map();
    
    plugin.defaultOptions = {
      title: "Shared Control",
      publishEndpoint: "/__plugin/publish",
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
        publishEndpoint: raw.publishEndpoint || plugin.defaultOptions.publishEndpoint,
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
    
  })(plugin, global);

  // src/plugin/api.js
  (function (plugin, global) {
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
        publish: function publish(appId) {
          return plugin.requestJson(
            options.publishEndpoint + "?appId=" + encodeURIComponent(appId),
            { method: "POST" },
            fetchImpl
          );
        },
        loadShareConfig: function loadShareConfig(appId) {
          return plugin.requestJson(
            ep.config + "?appId=" + encodeURIComponent(appId),
            { method: "GET" },
            fetchImpl
          );
        },
        submitShare: function submitShare(appId, payload) {
          return plugin.requestJson(
            ep.submit + "?appId=" + encodeURIComponent(appId),
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ shareType: payload.shareType, members: payload.members })
            },
            fetchImpl
          );
        },
        searchUsers: async function searchUsers(q) {
          var raw = await plugin.requestJson(
            ep.searchUsers + "?q=" + encodeURIComponent(q),
            { method: "GET" },
            fetchImpl
          );
          // UC 真实格式：{ data: {username, name, ...}, code: "200", success: true }
          // mock 格式（兜底）：[{username, name, ...}]
          if (Array.isArray(raw)) return raw;
          if (raw && raw.data) return [raw.data];
          return [];
        }
      };
    };
    
  })(plugin, global);

  // src/plugin/view.js
  (function (plugin, global) {
    plugin.render = function render(container, options, apiClient) {
      container.innerHTML = "";
      container.className = "";
      container.classList.add("wdp-root");
      if (options.mode === "floating") container.classList.add("wdp-root--floating");
      if (options.mode === "header")   container.classList.add("wdp-root--header");
    
      // ── 顶层 action bar ──────────────────────────────────────────────
      var bar = plugin.createElement("div", "wdp-action-bar");
    
      // 发布成功提示
      var publishSuccessMsg = plugin.createElement("span", "wdp-publish-success", "发布成功");
      publishSuccessMsg.style.display = "none";
      var publishCountdownTimer = null;
    
      var publishBtn = plugin.createElement("button", "wdp-btn wdp-btn--publish");
      publishBtn.type = "button";
      publishBtn.innerHTML = [
        '<span class="wdp-btn__icon wdp-btn__icon--spin" aria-hidden="true" style="display:none">',
        '<svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">',
        '<path d="M7.5 1.5A6 6 0 1 1 1.5 7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
        '</svg>',
        '</span>',
        '<span class="wdp-btn__icon wdp-btn__icon--default" aria-hidden="true">',
        '<svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">',
        '<path d="M7.5 1L13 7.5M7.5 1L2 7.5M7.5 1v10M2 13h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
        '</svg>',
        '</span>',
        '<span class="wdp-btn__text">发布</span>'
      ].join("");
    
      function setPublishing(on) {
        publishBtn.disabled = on;
        publishBtn.querySelector(".wdp-btn__icon--spin").style.display = on ? "inline-flex" : "none";
        publishBtn.querySelector(".wdp-btn__icon--default").style.display = on ? "none" : "inline-flex";
        publishBtn.querySelector(".wdp-btn__text").textContent = on ? "发布中..." : "发布";
      }
    
      publishBtn.addEventListener("click", async function () {
        if (publishBtn.disabled) return;
        // 清除上次倒计时
        clearTimeout(publishCountdownTimer);
        publishSuccessMsg.style.display = "none";
        setPublishing(true);
        try {
          await apiClient.publish(options.appId);
          setPublishing(false);
          publishSuccessMsg.style.display = "inline";
          publishCountdownTimer = setTimeout(function () {
            publishSuccessMsg.style.display = "none";
          }, 5000);
        } catch (_) {
          setPublishing(false);
        }
      });
    
      bar.appendChild(publishSuccessMsg);
    
      var shareBtn = plugin.createElement("button", "wdp-btn wdp-btn--share");
      shareBtn.type = "button";
      shareBtn.innerHTML = [
        '<span class="wdp-btn__icon" aria-hidden="true">',
        '<svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">',
        '<path d="M10 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 0" stroke="none"/>',
        '<circle cx="10" cy="4" r="2" stroke="currentColor" stroke-width="1.3"/>',
        '<circle cx="5" cy="7.5" r="2" stroke="currentColor" stroke-width="1.3"/>',
        '<circle cx="10" cy="11" r="2" stroke="currentColor" stroke-width="1.3"/>',
        '<path d="M7 6.5l2.2-1.5M7 8.5l2.2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
        '</svg>',
        '</span>',
        '<span>分享</span>'
      ].join("");
    
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
      var searchError    = plugin.createElement("div", "wdp-search-error", "请选择分享人");
      searchError.style.display = "none";
      searchWrap.appendChild(searchInput);
      searchWrap.appendChild(searchDropdown);
      searchWrap.appendChild(searchError);
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
    
      var footer      = plugin.createElement("div", "wdp-share-dialog__footer");
      var successMsg  = plugin.createElement("span", "wdp-share-success", "分享设置已成功");
      successMsg.style.display = "none";
      var cancelBtn   = plugin.createElement("button", "wdp-btn wdp-btn--cancel", "取消");
      cancelBtn.type  = "button";
      var okBtn       = plugin.createElement("button", "wdp-btn wdp-btn--ok", "确认");
      okBtn.type = "button";
      footer.appendChild(successMsg);
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
          var tag = plugin.createElement("span", "wdp-tag");
          var nameSpan = plugin.createElement("span", "", acc.label);
          var del = document.createElement("button");
          del.type = "button";
          del.className = "wdp-tag__del";
          del.setAttribute("aria-label", "移除 " + acc.label);
          del.innerHTML = '<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" width="12" height="12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
          del.addEventListener("click", function () {
            state.accounts = state.accounts.filter(function (a) { return a.value !== acc.value; });
            hideSuccess();
            renderTags();
            renderDropdown();
          });
          tag.appendChild(nameSpan);
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
              if (user._raw) state.userCache[user.value] = user._raw;
              // 清空输入框和搜索结果，便于继续搜索
              searchInput.value = "";
              state.searchResults = [];
              renderTags();
              renderDropdown();
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
        okBtn.textContent = on ? "处理中..." : "确认";
      }
    
      function hideSuccess() {
        successMsg.style.display = "none";
      }
    
      // ── debounce search ──────────────────────────────────────────────
      var searchTimer = null;
      searchInput.addEventListener("input", function () {
        var q = searchInput.value.trim();
        searchError.style.display = "none";
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
            // users: [{username, name, companyName, primaryDepartmentName, ...}]（已规范化为数组）
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
        hideSuccess();
        applyShareTypeUI();
      });
      inputGlobal.addEventListener("change", function () {
        state.shareType = "GLOBAL";
        hideSuccess();
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
        searchError.style.display = "none";
        successMsg.style.display = "none";
    
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
    
        // 校验：SPECIFIC 必须选人
        if (state.shareType === "SPECIFIC" && state.accounts.length === 0) {
          searchError.style.display = "block";
          return;
        }
        searchError.style.display = "none";
    
        var members = state.shareType === "SPECIFIC"
          ? state.accounts.map(function (a) { return { account: a.value }; })
          : [];
    
        setSubmitting(true);
        try {
          await apiClient.submitShare(options.appId, {
            shareType: state.shareType,
            members: members
          });
          setSubmitting(false);
          successMsg.style.display = "inline";
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
    
  })(plugin, global);

  // src/plugin/entry.js
  (function (plugin, global) {
    plugin.entry = {
      mount: function mount(container, rawOptions) {
        if (!container) {
          throw new Error("mount_container_required");
        }
    
        var options = plugin.mergeOptions(rawOptions);
        var existing = plugin.instances.get(container);
        if (existing) {
          existing.destroy();
          plugin.instances.delete(container);
        }
    
        var apiClient = plugin.createApiClient(options);
        var instance = plugin.render(container, options, apiClient);
        plugin.instances.set(container, instance);
        return instance;
      },
    
      unmount: function unmount(container) {
        var existing = plugin.instances.get(container);
        if (!existing) {
          return;
        }
    
        existing.destroy();
        plugin.instances.delete(container);
      }
    };
    
  })(plugin, global);

  global.WebDesignControlPlugin = plugin.entry;
})(window);
