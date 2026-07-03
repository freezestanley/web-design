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
