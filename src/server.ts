import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";
import session from "express-session";
import path from "path";
// import loginRoutes from "./routes/login.routes";
import authRoutes from "./routes/auth.routes";

import { testConnection } from "./config/database.config";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app: Application = express();

/**
 * Middleware
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  }),
);

/**
 * Static Files
 * http://localhost:3000/
 */
app.use(express.static(path.join(__dirname, "./public")));

/**
 * Health Check
 */
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is running",
  });
});

/**
 * Routes
 */
// app.use("/api/login", loginRoutes);
app.use("/api", authRoutes);

/**
 * 404
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
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
    console.log(`Server running at http://localhost:${PORT}`);
    console.log("=================================");
  });
}

startServer();
