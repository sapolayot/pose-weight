import { Application, Router } from "express";

export type ListedEndpoint = {
  path: string;
  method: string;
  requiresAuth: boolean;
};

function joinPaths(base: string, segment: string) {
  if (!segment || segment === "/") return base || "/";
  const left = base.endsWith("/") ? base.slice(0, -1) : base;
  const right = segment.startsWith("/") ? segment : `/${segment}`;
  return `${left}${right}` || "/";
}

function samplePathFromRoute(routePath: string) {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, "sample");
}

function getMiddlewareName(handle: unknown) {
  if (typeof handle !== "function") return "";
  const fn = handle as { name?: string };
  return fn.name || "";
}

function routeRequiresAuth(route: { stack?: Array<{ handle: unknown }> }) {
  return (route.stack ?? []).some(
    (layer) => getMiddlewareName(layer.handle) === "authMiddleware",
  );
}

function collectRelativeRoutePaths(stack: unknown[]): string[] {
  const paths: string[] = [];

  for (const item of stack) {
    const layer = item as {
      route?: { path: string };
      handle?: { stack?: unknown[] };
    };

    if (layer.route?.path) {
      paths.push(layer.route.path);
      continue;
    }

    if (layer.handle?.stack) {
      paths.push(...collectRelativeRoutePaths(layer.handle.stack));
    }
  }

  return paths;
}

function collectDirectRoutePaths(stack: unknown[]): string[] {
  const paths: string[] = [];

  for (const item of stack) {
    const layer = item as { route?: { path: string } };
    if (layer.route?.path) {
      paths.push(layer.route.path);
    }
  }

  return paths;
}

function inferPrefixCandidates(directPaths: string[]) {
  const candidates = new Set<string>([""]);

  for (const path of directPaths) {
    const parts = path.split("/").filter(Boolean);
    for (let i = 1; i < parts.length; i += 1) {
      candidates.add(`/${parts.slice(0, i).join("/")}`);
    }
  }

  return [...candidates].sort((a, b) => b.length - a.length);
}

function resolveMountPath(
  layer: { matchers?: Array<(path: string) => false | { path: string }> },
  prefix: string,
  childRoutePaths: string[],
  prefixCandidates: string[],
) {
  const matcher = layer.matchers?.[0];
  if (!matcher) return prefix;

  const tryMatch = (sample: string) => {
    const match = matcher(sample);
    if (!match || typeof match !== "object" || !match.path) return null;
    if (match.path === "/") return prefix;
    const mountPath = match.path.endsWith("/")
      ? match.path.slice(0, -1)
      : match.path;
    return mountPath || prefix;
  };

  for (const routePath of childRoutePaths) {
    const relativeSample = samplePathFromRoute(routePath);
    const resolved = tryMatch(relativeSample);
    if (resolved && resolved !== prefix) return resolved;
  }

  for (const candidate of prefixCandidates) {
    for (const routePath of childRoutePaths) {
      const sample = joinPaths(candidate, samplePathFromRoute(routePath));
      const resolved = tryMatch(sample);
      if (resolved && resolved !== prefix) return resolved;
    }
  }

  return prefix;
}

function walkStack(
  stack: unknown[],
  prefix: string,
  prefixCandidates: string[],
  endpoints: ListedEndpoint[],
) {
  for (const item of stack) {
    const layer = item as {
      route?: {
        path: string;
        methods: Record<string, boolean>;
        stack?: Array<{ handle: unknown }>;
      };
      handle?: { stack?: unknown[] };
      matchers?: Array<(path: string) => false | { path: string }>;
    };

    if (layer.route) {
      const methods = Object.keys(layer.route.methods).filter(
        (method) => method !== "_all",
      );
      const requiresAuth = routeRequiresAuth(layer.route);

      for (const method of methods) {
        endpoints.push({
          path: joinPaths(prefix, layer.route.path),
          method: method.toLowerCase(),
          requiresAuth,
        });
      }
      continue;
    }

    if (!layer.handle?.stack) continue;

    const childRoutePaths = collectRelativeRoutePaths(layer.handle.stack);
    const nextPrefix = resolveMountPath(
      layer,
      prefix,
      childRoutePaths,
      prefixCandidates,
    );

    walkStack(layer.handle.stack, nextPrefix, prefixCandidates, endpoints);
  }
}

export function listExpressEndpoints(app: Application | Router) {
  const root = app as Application & {
    router?: { stack?: unknown[] };
    stack?: unknown[];
  };

  const stack = root.router?.stack ?? root.stack ?? [];
  const prefixCandidates = inferPrefixCandidates(collectDirectRoutePaths(stack));
  const endpoints: ListedEndpoint[] = [];

  walkStack(stack, "", prefixCandidates, endpoints);

  return endpoints.sort((a, b) => {
    const byPath = a.path.localeCompare(b.path);
    if (byPath !== 0) return byPath;
    return a.method.localeCompare(b.method);
  });
}
