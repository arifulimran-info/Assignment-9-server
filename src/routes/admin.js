import { Router } from "express";
import { users, tuitions, payments, oid } from "../config/db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = Router();
router.use(verifyToken, verifyAdmin);

router.get("/stats", async (_req, res) => {
  const [totalUsers, totalTutors, pending, approved, revenue] = await Promise.all([
    users.countDocuments(),
    users.countDocuments({ role: "tutor" }),
    tuitions.countDocuments({ approvalStatus: "pending" }),
    tuitions.countDocuments({ approvalStatus: "approved" }),
    payments.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]).toArray(),
  ]);
  res.json({ totalUsers, totalTutors, pending, approved, revenue: revenue[0]?.total || 0 });
});

router.get("/users", async (_req, res) => {
  const list = await users
    .find({}, { projection: { name: 1, email: 1, image: 1, role: 1, plan: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(list);
});

router.patch("/users/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!["student", "tutor", "admin"].includes(role))
    return res.status(400).json({ message: "Invalid role" });
  if (req.params.id === req.user.id)
    return res.status(400).json({ message: "You cannot change your own role" });
  const result = await users.updateOne(
    { $or: [{ _id: oid(req.params.id) }, { _id: req.params.id }] },
    { $set: { role } }
  );
  if (!result.matchedCount) return res.status(404).json({ message: "User not found" });
  res.json({ message: "Role updated" });
});

router.get("/tuitions", async (req, res) => {
  const q = req.query.status ? { approvalStatus: req.query.status } : {};
  res.json(await tuitions.find(q).sort({ createdAt: -1 }).toArray());
});

router.patch("/tuitions/:id/approval", async (req, res) => {
  const { approvalStatus } = req.body;
  if (!["approved", "rejected", "pending"].includes(approvalStatus))
    return res.status(400).json({ message: "Invalid approvalStatus" });
  const _id = oid(req.params.id);
  const result = _id && (await tuitions.updateOne({ _id }, { $set: { approvalStatus } }));
  if (!result?.matchedCount) return res.status(404).json({ message: "Tuition not found" });
  res.json({ message: `Tuition ${approvalStatus}` });
});

router.get("/transactions", async (_req, res) => {
  res.json(await payments.find().sort({ paidAt: -1 }).toArray());
});

export default router;
