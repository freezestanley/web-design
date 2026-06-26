export function getSsoToken() {
  if (typeof window === "undefined") {
    return "";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const queryToken = searchParams.get("ssoToken");
  if (queryToken) {
    return queryToken;
  }

  return window.localStorage.getItem("ssoToken") || "";
}

export function validateSsoAccess() {
  const token = getSsoToken();

  return Boolean(token) && token !== "denied";
}

export function redirectToUnauthorized() {
  return "/unauthorized";
}
