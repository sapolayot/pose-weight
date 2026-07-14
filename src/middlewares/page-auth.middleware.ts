import { NextFunction, Request, Response } from "express";

/** หน้า login — redirect ไป main ถ้า login แล้ว */
export const GUEST_ONLY_PAGES = new Set(["/", "/index.html"]);

/** หน้าที่เข้าได้ทุกคน ไม่ตรวจ session */
export const PUBLIC_PAGES = new Set(["/404.html", "/mqtt-weight.html"]);

/** หน้าที่ต้อง login — เพิ่ม path ของหน้าใหม่ที่นี่ */
export const PROTECTED_PAGES = new Set(["/main.html"]);

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
      return res.redirect("/main.html");
    }
    return next();
  }

  if (isProtectedPage(requestPath) && !isLoggedIn) {
    return res.redirect("/");
  }

  next();
}
