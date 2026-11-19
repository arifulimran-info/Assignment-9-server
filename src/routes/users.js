import { Router } from "express";
import jwt from "jsonwebtoken";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { users, tuitions, applications } from "../config/db.js";
import { verifyToken, verifyStudent, verifyTutor } from "../middleware/auth.js";

const router = Router();

// Exchanges a valid BetterAuth session (cookie) for a JWT used on protected routes
router.get("/jwt", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return res.status(401).json({ message: "Not signed in" });
  const token = jwt.sign({ email: session.user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

router.get("/users/me", verifyToken, async (req, res) => {
  const user = await users.findOne({ email: req.user.email });
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    image: user.image || "",
    role: user.role,
    plan: user.plan || "free",
    phone: user.phone || "",
    bio: user.bio || "",
    createdAt: user.createdAt,
  });
});

// Every role can update name, phone, bio and photo
router.patch("/users/me", verifyToken, async (req, res) => {
  const { name, phone, bio, image } = req.body;
  if (name !== undefined && !name.trim()) return res.status(400).json({ message: "Name cannot be empty" });
  const set = { updatedAt: new Date() };
  if (name !== undefined) set.name = name.trim();
  if (phone !== undefined) set.phone = phone;
  if (bio !== undefined) set.bio = bio;
  if (image !== undefined) set.image = image;
  await users.updateOne({ email: req.user.email }, { $set: set });
  res.json({ message: "Profile updated" });
});

// ---- dashboard stats ----
router.get("/stats/student", verifyToken, verifyStudent, async (req, res) => {
  const q = { studentEmail: req.user.email };
  const [total, accepted, pending] = await Promise.all([
    applications.countDocuments(q),
    applications.countDocuments({ ...q, status: "accepted" }),
    applications.countDocuments({ ...q, status: "pending" }),
  ]);
  res.json({ total, accepted, pending, plan: req.user.plan });
});

router.get("/stats/tutor", verifyToken, verifyTutor, async (req, res) => {
  const q = { tutorEmail: req.user.email };
  const [totalTuitions, activeApproved, totalApplicants] = await Promise.all([
    tuitions.countDocuments(q),
    tuitions.countDocuments({ ...q, approvalStatus: "approved", isActive: true }),
    applications.countDocuments(q),
  ]);
  res.json({ totalTuitions, activeApproved, totalApplicants, plan: req.user.plan });
});

// ---- public landing page stats ----
router.get("/stats/public", async (_req, res) => {
  const [tutors, students, tuitionCount, subjects] = await Promise.all([
    users.countDocuments({ role: "tutor" }),
    users.countDocuments({ role: "student" }),
    tuitions.countDocuments({ approvalStatus: "approved", isActive: true }),
    tuitions.distinct("subject", { approvalStatus: "approved", isActive: true }),
  ]);
  res.json({ tutors, students, tuitions: tuitionCount, subjects: subjects.length });
});

export default router;
