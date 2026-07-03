(function () {
  const state = window.__WEB_DESIGN_GATEWAY__;
  if (!state || document.getElementById("__webdesign_menu")) {
    return;
  }

  const runtimeConfig = state.runtimeConfig || {};
  const endpoints = runtimeConfig.endpoints || {};
  const labels = runtimeConfig.labels || {};
  const storageKey = "__webdesign_menu_state__";

  function loadPersistedState() {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    } catch (error) {
      return {};
    }
  }

  function savePersistedState(nextState) {
    window.localStorage.setItem(storageKey, JSON.stringify(nextState));
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error("request_failed");
    }
    return response.json();
  }

  function createField(labelText, name) {
    const wrap = document.createElement("label");
    wrap.className = "wdg-field";

    const title = document.createElement("span");
    title.className = "wdg-field-label";
    title.textContent = labelText || name || "";
    wrap.appendChild(title);

    const select = document.createElement("select");
    select.name = name;
    wrap.appendChild(select);

    return { wrap: wrap, select: select };
  }

  function fillSelect(select, options, selectedValue) {
    select.innerHTML = "";
    options.forEach(function (option) {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = option.label;
      if (option.value === selectedValue) {
        node.selected = true;
      }
      select.appendChild(node);
    });
  }

  const persisted = loadPersistedState();

  const mount = document.createElement("div");
  mount.id = "__webdesign_menu";
  mount.className = "wdg-shell";

  const title = document.createElement("div");
  title.className = "wdg-title";
  title.textContent = runtimeConfig.title || "Shared Menu";
  mount.appendChild(title);

  const selectAField = createField(labels.selectA || "Select A", "selectA");
  const selectBField = createField(labels.selectB || "Select B", "selectB");
  mount.appendChild(selectAField.wrap);
  mount.appendChild(selectBField.wrap);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "wdg-button";
  button.textContent = labels.submit || "Submit";
  mount.appendChild(button);

  const status = document.createElement("div");
  status.className = "wdg-status";
  mount.appendChild(status);

  function updateStatus(message, tone) {
    status.textContent = message || "";
    status.dataset.tone = tone || "";
  }

  function persistSelection() {
    savePersistedState({
      selectA: selectAField.select.value,
      selectB: selectBField.select.value
    });
  }

  selectAField.select.addEventListener("change", persistSelection);
  selectBField.select.addEventListener("change", persistSelection);

  button.addEventListener("click", async function () {
    try {
      persistSelection();
      updateStatus("Submitting...", "loading");
      await requestJson(endpoints.submit || "/__control/submit", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          appId: state.appId,
          currentPath: window.location.pathname,
          selectA: selectAField.select.value,
          selectB: selectBField.select.value
        })
      });
      updateStatus("Submitted", "success");
    } catch (error) {
      updateStatus("Submit failed", "error");
    }
  });

  document.body.appendChild(mount);

  Promise.all([
    requestJson(endpoints.selectAOptions || "/__control/options/select-a"),
    requestJson(endpoints.selectBOptions || "/__control/options/select-b")
  ])
    .then(function (results) {
      fillSelect(selectAField.select, results[0], persisted.selectA);
      fillSelect(selectBField.select, results[1], persisted.selectB);
      persistSelection();
      updateStatus("", "");
    })
    .catch(function () {
      updateStatus("Options failed to load", "error");
    });
})();
