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
