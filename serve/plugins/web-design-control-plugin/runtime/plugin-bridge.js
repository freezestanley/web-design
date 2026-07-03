(function () {
  function boot() {
    var state = window.__WEB_DESIGN_GATEWAY__;
    var plugin = window.WebDesignControlPlugin;
    if (!state || !plugin) {
      return;
    }

    var runtimeConfig = state.runtimeConfig || {};
    var mountTargetId = runtimeConfig.mountTargetId || "__webdesign_plugin_mount";
    var container = document.getElementById(mountTargetId);
    if (!container) {
      container = document.createElement("div");
      container.id = mountTargetId;
      document.body.appendChild(container);
    }

    plugin.mount(container, {
      appId: state.appId,
      currentPath: window.location.pathname,
      title: runtimeConfig.title,
      labels: runtimeConfig.labels,
      endpoints: runtimeConfig.endpoints,
      mode: runtimeConfig.mode || "inline"
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
