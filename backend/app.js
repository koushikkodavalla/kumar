require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const opportunityRoutes = require("./routes/opportunities");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admin");

const app = express();

// CORS setup
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",").map(x => x.trim())
      : true,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

// Initialize DB and ensure default admin
let initPromise = null;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await connectDB();

      const email = (process.env.ADMIN_EMAIL || "admin@placementhub.com").toLowerCase();
      try {
        const exists = await User.findOne({ email });

        if (!exists) {
          const password = await bcrypt.hash(
            process.env.ADMIN_PASSWORD || "Admin@12345",
            10
          );

          await User.create({
            name: process.env.ADMIN_NAME || "Placement Administrator",
            email,
            password,
            role: "admin"
          });

          console.log("Default admin account created");
        }
      } catch (err) {
        // If concurrent worker already created admin, skip duplicate key error
        if (err.code !== 11000) {
          console.warn("Admin initialization notice:", err.message);
        }
      }
    })().catch(err => {
      initPromise = null; // Reset to allow retry on next request
      throw err;
    });
  }

  return initPromise;
}

// Health check endpoint (accessible at /api/health, /health, or /api)
const healthHandler = async (req, res) => {
  let dbStatus = "disconnected";
  try {
    await ensureInitialized();
    dbStatus = "connected";
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    service: "placement-management-api",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
};

app.get("/api/health", healthHandler);
app.get("/health", healthHandler);
app.get("/api", healthHandler);

// Database middleware for all standard API routes
app.use(async (req, res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Database connection failed",
      error: error.message
    });
  }
});

// API Routes Router
const apiRouter = express.Router();
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/opportunities", opportunityRoutes);
apiRouter.use("/applications", applicationRoutes);
apiRouter.use("/admin", adminRoutes);

// Mount router under /api as well as / (to handle both rewritten and direct paths)
app.use("/api", apiRouter);
app.use("/", apiRouter);

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Express unhandled error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "production" ? undefined : err.message
  });
});

module.exports = app;
