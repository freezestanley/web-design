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
