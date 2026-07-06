const AUTH_API_URL = "/api";

/** หน้าที่เข้าได้เฉพาะผู้ที่ยังไม่ login */
const GUEST_ONLY_PAGES = new Set(["/", "/index.html"]);

/** หน้าที่ต้อง login — เพิ่ม path ของหน้าใหม่ที่นี่ */
const PROTECTED_PAGES = new Set(["/main.html"]);

function isProtectedPage(path) {
  if (PROTECTED_PAGES.has(path)) return true;
  return path.endsWith(".html") && !GUEST_ONLY_PAGES.has(path);
}

function getPageAuthType() {
  const fromBody = document.body?.dataset?.pageAuth;
  if (fromBody) return fromBody;

  const currentPath = window.location.pathname;

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
  } catch {
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
