import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import managementRoutes from "./routes/managementRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import rentPaymentRoutes from "./routes/rentPaymentRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers
app.disable("x-powered-by");
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Serve uploaded static files if needed
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rate limiting
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "SR PG Management API is running",
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is healthy",
    database: process.env.NODE_ENV === "test" ? "test" : "connected",
  });
});

// Application API routes
app.use("/api/auth", authRoutes);
app.use("/api/management", managementRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/rent-payments", rentPaymentRoutes);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "API endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack || err);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
