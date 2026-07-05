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
