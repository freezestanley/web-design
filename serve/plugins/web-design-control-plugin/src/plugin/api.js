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
