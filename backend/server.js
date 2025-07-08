require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const fileUpload = require("express-fileupload");
const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");
const leadRoutes = require("./routes/leads");
const userRoutes = require("./routes/users");
const landingRoutes = require("./routes/landing");
const agentRoutes = require("./routes/agents");
const clientNetworkRoutes = require("./routes/clientNetworks");
const ourNetworkRoutes = require("./routes/ourNetworks");
const clientBrokerRoutes = require("./routes/clientBrokers");
const campaignRoutes = require("./routes/campaigns");
const testRoutes = require("./routes/test");
const guiBrowserRoutes = require("./routes/gui-browser");
const agentBonusRoutes = require("./routes/agentBonuses");
const agentFineRoutes = require("./routes/agentFines");
const withdrawalRoutes = require("./routes/withdrawals");
const errorHandler = require("./middleware/errorHandler");
const SessionCleanupService = require("./services/sessionCleanupService");
const app = express();

app.set("trust proxy", 1);
mongoose.connect(
  process.env.MONGODB_URI ||
    "mongodb+srv://dani034406:Daniel6285@cluster0.g0vqepz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 60000,
    family: 4,
    maxPoolSize: 50,
    minPoolSize: 10,
    heartbeatFrequencyMS: 10000,
    maxIdleTimeMS: 30000,
    compressors: "zlib",
  }
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
  if (process.env.NODE_ENV !== "test") {
    try {
      const sessionCleanupService = new SessionCleanupService();
      sessionCleanupService.initializeScheduledJobs();
      console.log("✅ Session cleanup service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize session cleanup service:", error);
    }
  }
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "ws:", "wss:", "*.onrender.com"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);
const corsOptions = {
  origin: function (origin, callback) {
    console.log("CORS request from origin:", origin);
    console.log("CORS_ORIGIN env var:", process.env.CORS_ORIGIN);
    if (
      !origin ||
      origin.includes(".vercel.app") ||
      origin.includes("ftd-omega.vercel.app")
    ) {
      console.log("CORS: Allowing Vercel domain or no origin");
      return callback(null, true);
    }
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      console.log("CORS: Allowing localhost");
      return callback(null, true);
    }
    const allowedOrigins = (process.env.CORS_ORIGIN || "")
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o);
    if (allowedOrigins.includes(origin)) {
      console.log("CORS: Allowing origin from env variable");
      return callback(null, true);
    }
    console.log("CORS: Blocking origin:", origin);
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.method === "DELETE") {
    express.json({ limit: "10mb" })(req, res, next);
  } else {
    next();
  }
});
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: false,
    abortOnLimit: true,
    responseOnLimit: "File size limit has been reached",
    debug: true,
  })
);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/landing", landingRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/client-networks", clientNetworkRoutes);
app.use("/api/our-networks", ourNetworkRoutes);
app.use("/api/client-brokers", clientBrokerRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/test", testRoutes);
app.use("/api/gui-browser", guiBrowserRoutes);
app.use("/api/agent-bonuses", agentBonusRoutes);
app.use("/api/agent-fines", agentFineRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
const healthRoutes = require("./routes/health");
app.use("/api/health", healthRoutes);
app.use(errorHandler);
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    mongoose.connection.close();
  });
});
module.exports = app;
