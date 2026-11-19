import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth, clientOrigins } from "./auth.js";
import tuitionRoutes from "./routes/tuitions.js";
import applicationRoutes from "./routes/applications.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes, { stripeWebhook } from "./routes/payments.js";

const app = express();

app.use(cors({ origin: clientOrigins, credentials: true }));

// Stripe needs the raw body, so this must come BEFORE express.json()
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// BetterAuth handles /api/auth/* (sign-up, sign-in, sign-out, session ...)
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/", (_req, res) => res.json({ name: "MentorLagbe API", status: "running" }));
app.use("/api", userRoutes);
app.use("/api/tuitions", tuitionRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

export default app;
