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
