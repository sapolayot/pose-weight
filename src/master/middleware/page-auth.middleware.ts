import { NextFunction, Request, Response } from "express";

/** หน้า login — redirect ไป menu ถ้า login แล้ว */
export const GUEST_ONLY_PAGES = new Set([
  "/",
  "/index.html",
  "/master/index.html",
]);

/** หน้าที่ต้อง login */
export const PROTECTED_PAGES = new Set([
  "/menu.html",
  "/main.html",
  "/master/menu.html",
  "/weigh/main.html",
  "/modules/weigh/main.html",
]);

/** หน้าที่เข้าได้ทุกคน ไม่ตรวจ session */
export const PUBLIC_PAGES = new Set([
  "/404.html",
  "/master/404.html",
  "/mqtt-weight.html",
  "/weigh/mqtt-weight.html",
  "/modules/weigh/mqtt-weight.html",
]);

function isProtectedPage(path: string): boolean {
  return PROTECTED_PAGES.has(path);
}

export function pageAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.method !== "GET") {
    return next();
  }

  const requestPath = req.path;
  const isHtmlPage = requestPath === "/" || requestPath.endsWith(".html");

  if (!isHtmlPage) {
    return next();
  }

  if (PUBLIC_PAGES.has(requestPath)) {
    return next();
  }

  const isLoggedIn = Boolean(req.session?.user);

  if (GUEST_ONLY_PAGES.has(requestPath)) {
    if (isLoggedIn) {
      return res.redirect("/menu.html");
    }
    return next();
  }

  if (isProtectedPage(requestPath) && !isLoggedIn) {
    return res.redirect("/");
  }

  next();
}
