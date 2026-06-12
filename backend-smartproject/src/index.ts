import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import dotenv from 'dotenv';
import { corsMiddleware } from "./cors-middleware";
import path from 'path';
import { fileURLToPath } from 'url';
import session from "express-session";
import passport from "./auth/passport";
import authRoutes from "./auth/routes";
import { connectToDatabase } from "./db";
import MongoStore from "connect-mongodb-session";

const MongoDBStore = MongoStore(session);

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const app = express();

// Session configuration
const isProd = process.env.NODE_ENV === "production";
const baseUrl = process.env.BASE_URL || "";
const cookieSecure = isProd && baseUrl.startsWith("https");

const store = new MongoDBStore({
  uri: process.env.MONGODB_URI || "mongodb://localhost:27017/smartproject",
  collection: 'sessions'
});

store.on('error', function(error) {
  console.error('Session store error:', error);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      secure: cookieSecure,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: cookieSecure ? "none" : "lax",
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Auth routes (must be before registerRoutes)
app.use("/api/auth", authRoutes);

// Health check entpoint
app.get('/api/hello', (req, res) => {
  res.status(200).json({ status: 'healthy', message: 'API is running' });
});

// Serve static files from the React app build directory
const frontendBuildPath = path.join(__dirname, '../../frontend-smartproject/dist');
app.use(express.static(frontendBuildPath));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    await connectToDatabase();
    const server = await registerRoutes(app);

    // Unmatched /api requests (any method) → 404
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API endpoint not found' });
      }
      next();
    });

    app.use((err: any, _req: Request, _res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      _res.status(status).json({ message });
      if (status === 500) console.error(err);
    });

    // SPA fallback: serve index.html for non-API GET requests
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });

    const port = process.env.PORT || 8080;
    server.listen(port, () => {
      console.log(`😺 Production server running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
