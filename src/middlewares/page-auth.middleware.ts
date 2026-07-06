import { NextFunction, Request, Response } from "express";

/** หน้าที่เข้าได้เฉพาะผู้ที่ยังไม่ login */
export const GUEST_ONLY_PAGES = new Set(["/", "/index.html"]);

/** หน้าที่ต้อง login — เพิ่ม path ของหน้าใหม่ที่นี่ */
export const PROTECTED_PAGES = new Set(["/main.html"]);

function isProtectedPage(path: string): boolean {
  if (PROTECTED_PAGES.has(path)) return true;
  return path.endsWith(".html") && !GUEST_ONLY_PAGES.has(path);
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
