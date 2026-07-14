const AUTH_API_URL = "/api";
const GUEST_ONLY_PAGES = /* @__PURE__ */ new Set(["/", "/index.html"]);
const PUBLIC_PAGES = /* @__PURE__ */ new Set([
  "/404.html",
  "/mqtt-weight.html",
]);
const PROTECTED_PAGES = /* @__PURE__ */ new Set(["/main.html"]);
function isProtectedPage(path) {
  return PROTECTED_PAGES.has(path);
}
function getPageAuthType() {
  var _a, _b;
  const fromBody =
    (_b = (_a = document.body) == null ? void 0 : _a.dataset) == null
      ? void 0
      : _b.pageAuth;
  if (fromBody === "public") return null;
  if (fromBody === "guest") return "guest";
  if (fromBody === "protected") return "protected";
  const currentPath = window.location.pathname;
  if (PUBLIC_PAGES.has(currentPath)) return null;
  if (GUEST_ONLY_PAGES.has(currentPath)) return "guest";
  if (isProtectedPage(currentPath)) return "protected";
  return null;
}
async function fetchSessionUser() {
  try {
    const res = await fetch(`${AUTH_API_URL}/me`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}
async function runPageAuthGuard() {
  const authType = getPageAuthType();
  if (!authType) return null;
  const user = await fetchSessionUser();
  if (authType === "guest" && user) {
    window.location.replace("/main.html");
    return null;
  }
  if (authType === "protected" && !user) {
    window.location.replace("/");
    return null;
  }
  if (user) {
    window.__sessionUser = user;
  }
  return user;
}
runPageAuthGuard().then((user) => {
  document.dispatchEvent(new CustomEvent("auth:ready", { detail: user }));
});
