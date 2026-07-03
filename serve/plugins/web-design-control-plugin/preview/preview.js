(function () {
  var container = document.getElementById("preview-root");
  if (!container || !window.WebDesignControlPlugin) {
    return;
  }

  window.WebDesignControlPlugin.mount(container, {
    appId: "preview-app",
    currentPath: "/preview",
    title: "Preview Control",
    labels: {
      selectA: "Environment",
      selectB: "Region",
      submit: "Submit"
    },
    endpoints: {
      selectAOptions: "/preview-api/options/select-a",
      selectBOptions: "/preview-api/options/select-b",
      submit: "/preview-api/submit"
    },
    mode: "inline"
  });
})();
