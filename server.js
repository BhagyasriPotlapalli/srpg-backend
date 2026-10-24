
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import managementRoutes from "./routes/managementRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import rentPaymentRoutes from "./routes/rentPaymentRoutes.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

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

// Health endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is healthy",
    database:
      process.env.NODE_ENV === "test" ? "test" : "connected",
  });
});

// Application API routes
app.use("/api/auth", authRoutes);
app.use("/api/management", managementRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/rent-payments", rentPaymentRoutes);

// Not-found handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "API endpoint not found",
  });
});

// General error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`SR PG backend running at http://localhost:${PORT}`);
    });
  } catch {
    console.error("Server startup failed. Check your database settings.");
    process.exit(1);
  }
};

startServer();
