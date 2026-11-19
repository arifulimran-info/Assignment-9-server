import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { db } from "./config/db.js";

const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

export const clientOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  trustedOrigins: clientOrigins,
  emailAndPassword: { enabled: true, minPasswordLength: 6 },
  socialProviders: process.env.GOOGLE_CLIENT_ID
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},
  user: {
    modelName: "users", // store BetterAuth users in the "users" collection
    additionalFields: {
      role: { type: "string", defaultValue: "student", input: true },
      phone: { type: "string", required: false, input: true },
      bio: { type: "string", required: false, input: true },
      plan: { type: "string", defaultValue: "free", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Nobody can sign up as admin or as pro from the client
        before: async (user) => ({
          data: {
            ...user,
            role: ["student", "tutor"].includes(user.role) ? user.role : "student",
            plan: "free",
          },
        }),
      },
    },
  },
  // Needed when client and server live on different domains
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    },
  },
});
