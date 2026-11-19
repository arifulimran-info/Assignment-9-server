import jwt from "jsonwebtoken";
import { users } from "../config/db.js";

// Verifies the Bearer JWT and loads the fresh user (role/plan) from MongoDB
export const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized: token missing" });

  try {
    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await users.findOne({ email });
    if (!user) return res.status(401).json({ message: "Unauthorized: user not found" });
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan || "free",
    };
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
};

const requireRole = (role) => (req, res, next) =>
  req.user?.role === role
    ? next()
    : res.status(403).json({ message: `Forbidden: ${role} access only` });

export const verifyStudent = requireRole("student");
export const verifyTutor = requireRole("tutor");
export const verifyAdmin = requireRole("admin");
