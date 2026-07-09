import cors, { CorsOptions } from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";
import session from "express-session";
import path from "path";
import { pageAuthMiddleware } from "./middlewares/page-auth.middleware";
import routes from "./routes";

import { testConnection } from "./config/database.config";

dotenv.config();

const HOST = process.env.HOST || "localhost";

const PORT = process.env.PORT || 3000;

const app: Application = express();

const allowedOrigins = [
  "http://localhost:3000",
  // "https://2532-183-88-229-99.ngrok-free.app",
  `${HOST}:${PORT}`,
  // "https://yourdomain.com"
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

/**
 * Middleware
 */
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

/**
 * API Routes
 */
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is running",
  });
});

app.use("/api", routes);

/**
 * Page Auth Middleware (HTML pages)
 */
app.use(pageAuthMiddleware);

app.get("/404.html", (req: Request, res: Response) => {
  res.status(404).sendFile(path.join(__dirname, "./public", "404.html"));
});

/**
 * Static Files
 * http://localhost:3000/
 */
app.use(express.static(path.join(__dirname, "./public")));

/**
 * 404 — redirect ไป /404.html เพื่อให้ asset path และ auth ทำงานถูกต้อง
 */
app.use((req: Request, res: Response) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }

  res.status(404).redirect("/404.html");
});

/**
 * Global Error Handler
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
    console.log("=================================");
  });
}

startServer();
