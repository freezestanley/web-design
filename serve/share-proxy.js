"use strict";

// ── 路由识别 ──────────────────────────────────────────────────────────────────

function getShareRouteType(pathname) {
  if (pathname === "/__plugin/share/config")        return "config";
  if (pathname === "/__plugin/share/submit")        return "submit";
  if (pathname === "/__plugin/share/search-users")  return "search-users";
  return null;
}

// ── Mock 兜底 ─────────────────────────────────────────────────────────────────

function buildShareMockPayload(routeType, requestPayload, searchParams) {
  if (routeType === "config") {
    return { shareType: "SPECIFIC", members: [] };
  }
  if (routeType === "submit") {
    return { accepted: true, mock: true, received: requestPayload };
  }
  if (routeType === "search-users") {
    const q = searchParams.get("q") || "";
    return [{ username: "mock-" + (q || "user"), name: "Mock " + (q || "User") }];
  }
  return null;
}

// ── 主处理器 ──────────────────────────────────────────────────────────────────

/**
 * 处理 /__plugin/share/* 路由
 *
 * @param {object} ctx
 * @param {object} ctx.request
 * @param {object} ctx.response
 * @param {URL}    ctx.requestUrl
 * @param {object} ctx.options          gateway 运行时 options（含 shareProxy）
 * @param {object} ctx.previewAuth
 * @param {Function} ctx.proxyToUpstream
 * @param {Function} ctx.parseJsonBody
 * @param {Function} ctx.parseCookieHeader
 * @param {Function} ctx.buildUserinfoSessionValue
 * @param {Function} ctx.sendJson
 * @param {Function} ctx.sendText
 * @param {object} ctx.logger
 * @param {string} ctx.requestId
 */
async function handleShareRoute(ctx) {
  const {
    request, response, requestUrl,
    options, previewAuth,
    proxyToUpstream, parseJsonBody, parseCookieHeader,
    buildUserinfoSessionValue, sendJson, sendText,
    logger, requestId
  } = ctx;

  const shareRouteType = getShareRouteType(requestUrl.pathname);
  if (!shareRouteType) {
    return sendJson(response, 404, { error: "unsupported_share_route", pathname: requestUrl.pathname });
  }

  const isSubmit = shareRouteType === "submit";
  if (isSubmit && request.method !== "POST") {
    return sendJson(response, 405, { error: "method_not_allowed" });
  }
  if (!isSubmit && request.method !== "GET") {
    return sendJson(response, 405, { error: "method_not_allowed" });
  }

  const shareProxy = options.shareProxy || {};
  const hasAppCenter = shareProxy.appCenterOrigin;
  const hasUc = shareProxy.ucOrigin;

  // ── search-users → UC 代理 ────────────────────────────────────────────────
  if (shareRouteType === "search-users") {
    if (!hasUc) {
      return sendJson(response, 200, buildShareMockPayload("search-users", null, requestUrl.searchParams));
    }

    const q = requestUrl.searchParams.get("q") || "";
    const ucBase = shareProxy.ucBasePath || "/admin/uc";

    const ucCookies = parseCookieHeader(request.headers.cookie || "");
    const ucSessionToken =
      request.headers["x-usercenter-session"] ||
      buildUserinfoSessionValue(
        ucCookies[previewAuth.cookieName] ||
        ucCookies[previewAuth.clientSessionCookieName] ||
        ucCookies[previewAuth.clientUnsafeSessionCookieName] ||
        ""
      );

    const ucProxyHeaders = {
      "Accept": "application/json",
      "X-Service-Name": previewAuth.defaultServiceName,
      "X-Platform-Type": "web",
      "X-Requested-With": "XMLHttpRequest"
    };
    if (ucSessionToken) {
      ucProxyHeaders["X-Usercenter-Session"] = ucSessionToken;
    }
    const apigAppCode = shareProxy.apigAppCode || request.headers["x-apig-appcode"] || "";
    if (apigAppCode) {
      ucProxyHeaders["X-Apig-AppCode"] = apigAppCode;
    }

    const ucUrl = new URL(`${ucBase}/user?username=${encodeURIComponent(q)}`, shareProxy.ucOrigin);
    const startedAt = Date.now();
    let ucRes;
    try {
      ucRes = await fetch(ucUrl.toString(), { headers: ucProxyHeaders });
    } catch (err) {
      logger.error("proxy.failed", { requestId, path: requestUrl.pathname, upstreamOrigin: shareProxy.ucOrigin, error: err });
      return sendJson(response, 502, { error: "uc_proxy_failed" });
    }
    const ucBody = await ucRes.text();
    logger.info("proxy.completed", { requestId, method: "GET", path: requestUrl.pathname, upstreamOrigin: shareProxy.ucOrigin, targetPath: ucUrl.pathname + ucUrl.search, statusCode: ucRes.status, durationMs: Date.now() - startedAt });
    return sendText(response, ucRes.status, ucBody, ucRes.headers.get("content-type") || "application/json");
  }

  // ── config / submit → app-center 代理（无配置时走 mock）────────────────────
  if (!hasAppCenter) {
    const payload = isSubmit ? await parseJsonBody(request) : null;
    return sendJson(response, 200, buildShareMockPayload(shareRouteType, payload, requestUrl.searchParams));
  }

  const appCenterBase = shareProxy.appCenterBasePath || "/app-center";
  // appId 统一从 query param 读取（config 和 submit 保持一致）
  const appId = requestUrl.searchParams.get("appId") || "";

  if (shareRouteType === "config") {
    return proxyToUpstream({
      request, response,
      upstreamOrigin: shareProxy.appCenterOrigin,
      targetPath: `${appCenterBase}/projects/${encodeURIComponent(appId)}/share`,
      sessionToken: request.headers["x-usercenter-session"] || "",
      serviceName: previewAuth.defaultServiceName,
      logger, requestId,
      pathName: requestUrl.pathname,
      previewAuth
    });
  }

  // submit
  const submitBody = await parseJsonBody(request);
  if (!submitBody) {
    return sendJson(response, 400, { error: "invalid_json" });
  }
  return proxyToUpstream({
    request, response,
    upstreamOrigin: shareProxy.appCenterOrigin,
    targetPath: `${appCenterBase}/projects/${encodeURIComponent(appId)}/share`,
    sessionToken: request.headers["x-usercenter-session"] || "",
    serviceName: previewAuth.defaultServiceName,
    logger, requestId,
    pathName: requestUrl.pathname,
    rawBody: Buffer.from(JSON.stringify({ shareType: submitBody.shareType, members: submitBody.members })),
    previewAuth
  });
}

// ── publish 处理器 ────────────────────────────────────────────────────────────

/**
 * 处理 /__plugin/publish 路由
 */
async function handlePublishRoute(ctx) {
  const {
    request, response, requestUrl,
    options, previewAuth,
    proxyToUpstream, sendJson,
    logger, requestId
  } = ctx;

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "method_not_allowed" });
  }

  const shareProxy = options.shareProxy || {};
  const appId = requestUrl.searchParams.get("appId") || "";

  if (!shareProxy.appCenterOrigin) {
    return sendJson(response, 200, { success: true, mock: true, appId });
  }

  const appCenterBase = shareProxy.appCenterBasePath || "/app-center";
  return proxyToUpstream({
    request, response,
    upstreamOrigin: shareProxy.appCenterOrigin,
    targetPath: `${appCenterBase}/projects/${encodeURIComponent(appId)}/publish`,
    sessionToken: request.headers["x-usercenter-session"] || "",
    serviceName: previewAuth.defaultServiceName,
    logger, requestId,
    pathName: requestUrl.pathname,
    rawBody: Buffer.from("{}"),
    previewAuth
  });
}

module.exports = { getShareRouteType, buildShareMockPayload, handleShareRoute, handlePublishRoute };
