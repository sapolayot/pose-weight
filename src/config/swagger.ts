const port = process.env.PORT || 3000;
const host = process.env.HOST || "localhost";

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "POSE Weight API",
    version: "1.0.0",
    description: "API documentation for pose-weight application",
  },
  servers: [
    {
      url: `${host}:${port}`,
      description: "Local server",
    },
  ],
  tags: [
    { name: "Health", description: "Health check" },
    { name: "Auth", description: "Authentication" },
    { name: "Production", description: "Production list" },
    { name: "Materials", description: "Withdraw materials" },
    { name: "Inventory", description: "Inventory / QR lookup" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "API is running",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "API is running" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", example: "admin" },
                  password: { type: "string", example: "password" },
                  rememberMe: { type: "boolean", example: false },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login success" },
          "401": { description: "Invalid username or password" },
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current session user",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "Current user" },
          "401": { description: "Not logged in" },
        },
      },
    },
    "/api/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        responses: {
          "200": { description: "Logged out" },
        },
      },
    },
    "/api/wh-stock-transmit-iso": {
      get: {
        tags: ["Production"],
        summary: "Search production list",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Search keyword",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["0", "1"] },
            description: "Filter by status",
          },
        ],
        responses: {
          "200": { description: "Production list loaded" },
        },
      },
    },
    "/api/wh-stock-transmit-iso-sub/{docNo}": {
      get: {
        tags: ["Materials"],
        summary: "Get withdraw materials by document number",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "docNo",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Product list loaded" },
        },
      },
    },
    "/api/wh-inventory/qrcode": {
      get: {
        tags: ["Inventory"],
        summary: "Lookup inventory by QR code and item code",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "invCode",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "itemCode",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Inventory found or not found" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "connect.sid",
        description: "Session cookie from login",
      },
    },
  },
};
