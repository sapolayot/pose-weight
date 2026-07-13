import { Application } from "express";
import { listExpressEndpoints } from "./list-endpoints";

const port = process.env.PORT || 3000;
const host = (process.env.HOST || "localhost").replace(/^https?:\/\//, "");

function toOpenApiPath(path: string) {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function inferTag(path: string) {
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
) {
  const openApiPath = toOpenApiPath(path);
  const operation: Record<string, unknown> = {
    tags: [inferTag(path)],
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

export function buildSwaggerSpec(app: Application) {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const endpoint of listExpressEndpoints(app)) {
    const { path, method, requiresAuth } = endpoint;

    if (!path.startsWith("/api")) continue;
    if (path.startsWith("/api/swagger")) continue;
    if (method === "head" || method === "options") continue;

    const openApiPath = toOpenApiPath(path);
    paths[openApiPath] = paths[openApiPath] || {};
    paths[openApiPath][method] = buildOperation(
      method.toUpperCase(),
      path,
      requiresAuth,
    );
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "POSE Weight API",
      version: "1.0.0",
      description:
        "Auto-generated from Express routes. Add a route and it appears here on restart.",
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
