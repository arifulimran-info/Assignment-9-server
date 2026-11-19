import { Router } from "express";
import { applications, tuitions, oid } from "../config/db.js";
import { verifyToken, verifyStudent, verifyTutor } from "../middleware/auth.js";

const router = Router();

// Student applies (duplicates are blocked)
router.post("/", verifyToken, verifyStudent, async (req, res) => {
  const { tuitionId, studentPhone, preferredSchedule, studentNote } = req.body;
  if (!studentPhone || !preferredSchedule)
    return res.status(400).json({ message: "Phone and preferred schedule are required" });

  const _id = oid(tuitionId);
  const tuition = _id && (await tuitions.findOne({ _id, approvalStatus: "approved", isActive: true }));
  if (!tuition) return res.status(404).json({ message: "Tuition not available" });

  const exists = await applications.findOne({ tuitionId, studentEmail: req.user.email });
  if (exists) return res.status(409).json({ message: "You have already applied for this tuition" });

  const doc = {
    tuitionId,
    tuitionTitle: tuition.title,
    subject: tuition.subject,
    monthlyFee: tuition.monthlyFee,
    tutorName: tuition.tutorName,
    tutorEmail: tuition.tutorEmail,
    studentName: req.user.name,
    studentEmail: req.user.email,
    studentPhone,
    preferredSchedule,
    studentNote: studentNote || "",
    status: "pending",
    appliedAt: new Date(),
  };
  const result = await applications.insertOne(doc);
  res.status(201).json({ ...doc, _id: result.insertedId });
});

router.get("/mine", verifyToken, verifyStudent, async (req, res) => {
  res.json(await applications.find({ studentEmail: req.user.email }).sort({ appliedAt: -1 }).toArray());
});

// Has this student already applied? (used to disable the Apply button)
router.get("/check/:tuitionId", verifyToken, verifyStudent, async (req, res) => {
  const found = await applications.findOne({
    tuitionId: req.params.tuitionId,
    studentEmail: req.user.email,
  });
  res.json({ applied: !!found });
});

// Student cancels while still pending
router.delete("/:id", verifyToken, verifyStudent, async (req, res) => {
  const _id = oid(req.params.id);
  const app = _id && (await applications.findOne({ _id }));
  if (!app) return res.status(404).json({ message: "Application not found" });
  if (app.studentEmail !== req.user.email) return res.status(403).json({ message: "Forbidden" });
  if (app.status !== "pending")
    return res.status(400).json({ message: "Only pending applications can be cancelled" });
  await applications.deleteOne({ _id });
  res.json({ message: "Application cancelled" });
});

// Tutor: applicants of own tuitions
router.get("/applicants", verifyToken, verifyTutor, async (req, res) => {
  res.json(await applications.find({ tutorEmail: req.user.email }).sort({ appliedAt: -1 }).toArray());
});

router.patch("/:id/status", verifyToken, verifyTutor, async (req, res) => {
  const { status } = req.body;
  if (!["accepted", "rejected"].includes(status))
    return res.status(400).json({ message: "status must be accepted or rejected" });
  const _id = oid(req.params.id);
  const app = _id && (await applications.findOne({ _id }));
  if (!app) return res.status(404).json({ message: "Application not found" });
  if (app.tutorEmail !== req.user.email) return res.status(403).json({ message: "Forbidden" });
  await applications.updateOne({ _id }, { $set: { status } });
  res.json({ message: `Application ${status}` });
});

export default router;
