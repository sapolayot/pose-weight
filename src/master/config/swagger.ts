import { Application } from "express";
import { MODULE_PATH_PREFIXES as AUTH_PREFIXES } from "../auth/module";
import { listExpressEndpoints } from "./list-endpoints";

const port = process.env.PORT || 3000;
const host = (process.env.HOST || "localhost").replace(/^https?:\/\//, "");

export type SwaggerModuleFilter = string | undefined;

/** Menu modules + master auth registry for swagger filtering */
export const SWAGGER_MODULES: Record<string, string[]> = {
  auth: AUTH_PREFIXES,
  master: AUTH_PREFIXES,
  weigh: [
    "/api/weighing-machine",
    "/api/wh-inventory",
    "/api/wh-stock-transmit-iso",
    "/api/wh-stock-transmit-iso-sub",
    "/api/coa-approve",
  ],
  receive: [],
  "scale-check": [],
  special: [],
  mix: [],
  pack: [],
};

function toOpenApiPath(path: string) {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function pathMatchesPrefixes(path: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
}

function inferTag(path: string, moduleFilter?: string) {
  if (moduleFilter && moduleFilter !== "auth" && moduleFilter !== "master") {
    return moduleFilter
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  if (
    path === "/api/login" ||
    path === "/api/me" ||
    path === "/api/logout" ||
    path.startsWith("/api/login/")
  ) {
    return "Auth";
  }

  const segment = path.split("/").filter(Boolean)[1];
  if (!segment) return "API";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildPathParameters(openApiPath: string) {
  const matches = openApiPath.match(/\{([A-Za-z0-9_]+)\}/g);
  if (!matches) return [];

  return matches.map((match) => ({
    name: match.slice(1, -1),
    in: "path" as const,
    required: true,
    schema: { type: "string" },
  }));
}

function buildOperation(
  method: string,
  path: string,
  requiresAuth: boolean,
  moduleFilter?: string,
) {
  const openApiPath = toOpenApiPath(path);
  const operation: Record<string, unknown> = {
    tags: [inferTag(path, moduleFilter)],
    summary: `${method} ${openApiPath}`,
    responses: {
      "200": { description: "Success" },
      "401": { description: "Unauthorized" },
      "404": { description: "Not found" },
      "500": { description: "Internal server error" },
    },
  };

  const pathParams = buildPathParameters(openApiPath);
  if (pathParams.length > 0) {
    operation.parameters = pathParams;
  }

  if (requiresAuth) {
    operation.security = [{ cookieAuth: [] }];
  }

  return operation;
}

export function buildSwaggerSpec(
  app: Application,
  moduleFilter?: SwaggerModuleFilter,
) {
  const paths: Record<string, Record<string, unknown>> = {};
  const allowedPrefixes =
    moduleFilter && SWAGGER_MODULES[moduleFilter]
      ? SWAGGER_MODULES[moduleFilter]
      : null;

  for (const endpoint of listExpressEndpoints(app)) {
    const { path, method, requiresAuth } = endpoint;

    if (!path.startsWith("/api")) continue;
    if (path.startsWith("/api/swagger")) continue;
    if (path === "/api/health") continue;
    if (method === "head" || method === "options") continue;

    if (allowedPrefixes) {
      if (allowedPrefixes.length === 0) continue;
      if (!pathMatchesPrefixes(path, allowedPrefixes)) continue;
    }

    const openApiPath = toOpenApiPath(path);
    paths[openApiPath] = paths[openApiPath] || {};
    paths[openApiPath][method] = buildOperation(
      method.toUpperCase(),
      path,
      requiresAuth,
      moduleFilter,
    );
  }

  const titleSuffix = moduleFilter ? ` — ${moduleFilter}` : "";

  return {
    openapi: "3.0.3",
    info: {
      title: `POSE Weight API${titleSuffix}`,
      version: "1.0.0",
      description: moduleFilter
        ? `Auto-generated OpenAPI for module "${moduleFilter}".`
        : "Auto-generated from Express routes. Module specs: /api/swagger/{module}",
    },
    servers: [
      {
        url: `http://${host}:${port}`,
        description: "Local server",
      },
    ],
    paths,
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
          description: "Session cookie from POST /api/login",
        },
      },
    },
  };
}

export function listSwaggerModules() {
  return Object.keys(SWAGGER_MODULES);
}
