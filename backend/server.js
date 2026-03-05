import express from "express";
import cors from "cors";
import http from "http";
import MongoStore from "connect-mongo";
import session from "express-session";
import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";
import connectDB from "./config/db.js";
import { resetStalledScans } from "./services/cleanupService.js";
import { initSocketIO } from "./services/socketService.js";

import userRouter from "./routes/userRoute.js";
import scanRouter from "./routes/scanRoutes.js";
import recommendationRouter from "./routes/recommendationRoutes.js";

import "dotenv/config.js";

const FRONT_END_ORIGIN = process.env.FRONT_END_ORIGIN;
const MONGODB_URI = process.env.MONGODB_URI;
const SECRET_SESSION_KEY = process.env.SECRET_SESSION_KEY;
const CSRF_SECRET_KEY = process.env.CSRF_SECRET_KEY;
const PORT = process.env.PORT;

const app = express();

// Wrap Express in a plain http.Server so Socket.io can share the same port
const httpServer = http.createServer(app);

// Attach Socket.io — must happen before routes so io is ready for scan events
initSocketIO(httpServer, FRONT_END_ORIGIN);

app.use(express.json());

app.use(cors({ origin: FRONT_END_ORIGIN, credentials: true }));
app.use(cookieParser());

connectDB();

const store = MongoStore.create({ mongoUrl: MONGODB_URI });

app.use(
  session({
    secret: SECRET_SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12, // 12 hours until expiry
      httpOnly: true,
      secure: false, // set true if using https
      sameSite: "lax",
    },
  }),
);

const { generateCsrfToken, doubleCsrfProtection, invalidCsrfTokenError } =
  doubleCsrf({
    getSecret: () => CSRF_SECRET_KEY,
    getSessionIdentifier: (req) => req.session.id,
    cookieName: "x-csrf-token",
    cookieOptions: {
      httpOnly: true,
      secure: false, // set true if using https
      sameSite: "lax",
    },
  });

app.get("/api/csrf-token", (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

app.use("/auth", userRouter);
app.use("/api/scans", scanRouter);
app.use("/api/recommendations", recommendationRouter);
app.use(doubleCsrfProtection);

app.use((err, req, res, next) => {
  if (err === invalidCsrfTokenError) {
    return res
      .status(403)
      .json({ success: false, message: "Invalid CSRF token" });
  }
  next(err);
});

await resetStalledScans();

httpServer.listen(PORT, () => console.log("Server started on port " + PORT));
