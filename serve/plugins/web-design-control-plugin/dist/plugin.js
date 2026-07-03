(function (global) {
  var plugin = {};
  plugin.name = "web-design-control-plugin";
  plugin.version = "1.0.0";

  // src/plugin/core.js
  (function (plugin, global) {
    plugin.instances = new Map();
    
    plugin.defaultOptions = {
      title: "Shared Control",
      labels: {
        selectA: "Select A",
        selectB: "Select B",
        submit: "Submit"
      },
      endpoints: {
        selectAOptions: "/__plugin/options/select-a",
        selectBOptions: "/__plugin/options/select-b",
        submit: "/__plugin/submit"
      },
      mode: "inline"
    };
    
    plugin.mergeOptions = function mergeOptions(options) {
      var raw = options || {};
      return {
        appId: raw.appId || "preview-app",
        currentPath: raw.currentPath || "/preview",
        title: raw.title || plugin.defaultOptions.title,
        labels: {
          selectA: raw.labels && raw.labels.selectA ? raw.labels.selectA : plugin.defaultOptions.labels.selectA,
          selectB: raw.labels && raw.labels.selectB ? raw.labels.selectB : plugin.defaultOptions.labels.selectB,
          submit: raw.labels && raw.labels.submit ? raw.labels.submit : plugin.defaultOptions.labels.submit
        },
        endpoints: {
          selectAOptions:
            raw.endpoints && raw.endpoints.selectAOptions
              ? raw.endpoints.selectAOptions
              : plugin.defaultOptions.endpoints.selectAOptions,
          selectBOptions:
            raw.endpoints && raw.endpoints.selectBOptions
              ? raw.endpoints.selectBOptions
              : plugin.defaultOptions.endpoints.selectBOptions,
          submit:
            raw.endpoints && raw.endpoints.submit ? raw.endpoints.submit : plugin.defaultOptions.endpoints.submit
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
      return {
        loadSelectA: function loadSelectA() {
          return plugin.requestJson(options.endpoints.selectAOptions, { method: "GET" }, fetchImpl);
        },
        loadSelectB: function loadSelectB() {
          return plugin.requestJson(options.endpoints.selectBOptions, { method: "GET" }, fetchImpl);
        },
        submit: function submit(payload) {
          return plugin.requestJson(
            options.endpoints.submit,
            {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify(payload)
            },
            fetchImpl
          );
        }
      };
    };
    
  })(plugin, global);

  // src/plugin/view.js
  (function (plugin, global) {
    plugin.render = function render(container, options, apiClient) {
      var persisted = plugin.readPersisted(options.appId);
    
      container.innerHTML = "";
      container.className = "";
      container.classList.add("wdp-root");
      if (options.mode === "floating") {
        container.classList.add("wdp-root--floating");
      }
      if (options.mode === "header") {
        container.classList.add("wdp-root--header");
      }
    
      var shell = plugin.createElement("section", "wdp-shell");
      var title = plugin.createElement("div", "wdp-title", options.title);
      var status = plugin.createElement("div", "wdp-status", "");
    
      function createField(labelText, name) {
        var wrap = plugin.createElement("label", "wdp-field");
        var label = plugin.createElement("span", "wdp-field-label", labelText);
        var select = plugin.createElement("select", "wdp-select");
        select.name = name;
        wrap.appendChild(label);
        wrap.appendChild(select);
        return { wrap: wrap, select: select };
      }
    
      function fillSelect(select, values, selectedValue) {
        select.innerHTML = "";
        values.forEach(function (item) {
          var option = plugin.createElement("option", "", item.label);
          option.value = item.value;
          if (item.value === selectedValue) {
            option.selected = true;
          }
          select.appendChild(option);
        });
      }
    
      var selectAField = createField(options.labels.selectA, "selectA");
      var selectBField = createField(options.labels.selectB, "selectB");
      var button = plugin.createElement("button", "wdp-button", options.labels.submit);
      button.type = "button";
    
      function persistSelection() {
        plugin.writePersisted(options.appId, {
          selectA: selectAField.select.value,
          selectB: selectBField.select.value
        });
      }
    
      selectAField.select.addEventListener("change", persistSelection);
      selectBField.select.addEventListener("change", persistSelection);
    
      button.addEventListener("click", async function () {
        try {
          persistSelection();
          plugin.setStatus(status, "Submitting...", "loading");
          await apiClient.submit({
            appId: options.appId,
            currentPath: options.currentPath,
            selectA: selectAField.select.value,
            selectB: selectBField.select.value
          });
          plugin.setStatus(status, "Submitted", "success");
        } catch (error) {
          plugin.setStatus(status, "Submit failed", "error");
        }
      });
    
      shell.appendChild(title);
      shell.appendChild(selectAField.wrap);
      shell.appendChild(selectBField.wrap);
      shell.appendChild(button);
      shell.appendChild(status);
      container.appendChild(shell);
    
      Promise.all([apiClient.loadSelectA(), apiClient.loadSelectB()])
        .then(function (results) {
          fillSelect(selectAField.select, results[0], persisted.selectA);
          fillSelect(selectBField.select, results[1], persisted.selectB);
          persistSelection();
          plugin.setStatus(status, "", "");
        })
        .catch(function () {
          plugin.setStatus(status, "Options failed to load", "error");
        });
    
      return {
        destroy: function destroy() {
          container.innerHTML = "";
          container.className = "";
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
