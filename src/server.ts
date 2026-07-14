import cors, { CorsOptions } from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";
import session from "express-session";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { testConnection } from "./master/config/database.config";
import {
  buildSwaggerSpec,
  listSwaggerModules,
} from "./master/config/swagger";
import authRoutes from "./master/auth/routes";
import { pageAuthMiddleware } from "./master/middleware/page-auth.middleware";
import mixRoutes from "./mix/routes";
import packRoutes from "./pack/routes";
import receiveRoutes from "./receive/routes";
import scaleCheckRoutes from "./scale-check/routes";
import specialRoutes from "./special/routes";
import weighRoutes from "./weigh/routes";

dotenv.config();

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 3000;

const app: Application = express();

const allowedOrigins = [
  "http://localhost:3000",
  `${HOST}:${PORT}`,
  "http://10.0.2.2:3000",
];

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const masterPublic = path.join(__dirname, "master/public");
const weighPublic = path.join(__dirname, "weigh/public");
const masterAssets = path.join(masterPublic, "assets");

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is running",
  });
});

app.use("/api", authRoutes);
app.use("/api", weighRoutes);
app.use("/api", receiveRoutes);
app.use("/api", scaleCheckRoutes);
app.use("/api", specialRoutes);
app.use("/api", mixRoutes);
app.use("/api", packRoutes);

app.get("/api/swagger.json", (_req: Request, res: Response) => {
  res.json(buildSwaggerSpec(app));
});

app.get("/api/swagger/modules", (_req: Request, res: Response) => {
  res.json({
    success: true,
    modules: listSwaggerModules(),
  });
});

app.get("/api/swagger/modules/:module", (req: Request, res: Response) => {
  const moduleName = String(req.params.module || "");
  if (!listSwaggerModules().includes(moduleName)) {
    return res.status(404).json({
      success: false,
      message: `Unknown swagger module: ${moduleName}`,
    });
  }
  res.json(buildSwaggerSpec(app, moduleName));
});

app.use(
  "/api/swagger",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/api/swagger.json",
    },
  }),
);

/** Stable page aliases */
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(masterPublic, "index.html"));
});

app.get("/index.html", (_req: Request, res: Response) => {
  res.sendFile(path.join(masterPublic, "index.html"));
});

app.get("/menu.html", (_req: Request, res: Response) => {
  res.sendFile(path.join(masterPublic, "menu.html"));
});

app.get("/main.html", (_req: Request, res: Response) => {
  res.sendFile(path.join(weighPublic, "main.html"));
});

app.get("/mqtt-weight.html", (_req: Request, res: Response) => {
  res.sendFile(path.join(weighPublic, "mqtt-weight.html"));
});

app.get("/404.html", (_req: Request, res: Response) => {
  res.status(404).sendFile(path.join(masterPublic, "404.html"));
});

app.use(pageAuthMiddleware);

app.use("/assets", express.static(masterAssets));
app.use("/master", express.static(masterPublic));
app.use("/weigh", express.static(weighPublic));
/** Back-compat for older /modules/weigh links */
app.use("/modules/weigh", express.static(weighPublic));

app.use((req: Request, res: Response) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }

  res.status(404).redirect("/404.html");
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

async function startServer() {
  await testConnection();
  app.listen(PORT, () => {
    console.log("=================================");
    console.log(`Server running at ${HOST}:${PORT}`);
    console.log(`Swagger UI at ${HOST}:${PORT}/api/swagger`);
    console.log(
      `Module swagger e.g. ${HOST}:${PORT}/api/swagger/modules/weigh`,
    );
    console.log("=================================");
  });
}

startServer();
