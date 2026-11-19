import { Router } from "express";
import { tuitions, applications, oid } from "../config/db.js";
import { verifyToken, verifyTutor } from "../middleware/auth.js";

const router = Router();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PUBLIC = { approvalStatus: "approved", isActive: true };

// Challenge 1 + Optional 1: server-side search, filter and pagination
router.get("/", async (req, res) => {
  const { search, subject, classLevel, mode } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 9, 1), 50);

  const query = { ...PUBLIC };
  if (search?.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [{ title: rx }, { subject: rx }];
  }
  if (subject) query.subject = subject;
  if (classLevel) query.classLevel = classLevel;
  if (mode) query.mode = mode;

  const [items, total] = await Promise.all([
    tuitions
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    tuitions.countDocuments(query),
  ]);
  res.json({ tuitions: items, total, page, pages: Math.ceil(total / limit) });
});

router.get("/latest", async (_req, res) => {
  res.json(
    await tuitions.find(PUBLIC).sort({ createdAt: -1 }).limit(6).toArray(),
  );
});

// Values for the filter dropdowns
router.get("/filters", async (_req, res) => {
  const [subjects, classLevels] = await Promise.all([
    tuitions.distinct("subject", PUBLIC),
    tuitions.distinct("classLevel", PUBLIC),
  ]);
  res.json({ subjects: subjects.sort(), classLevels: classLevels.sort() });
});

// Tutor: own tuitions (must be declared before "/:id")
router.get("/mine", verifyToken, verifyTutor, async (req, res) => {
  res.json(
    await tuitions
      .find({ tutorEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray(),
  );
});

router.get("/:id", async (req, res) => {
  const _id = oid(req.params.id);
  if (!_id) return res.status(400).json({ message: "Invalid tuition id" });
  const tuition = await tuitions.findOne({ _id });
  if (!tuition) return res.status(404).json({ message: "Tuition not found" });
  res.json(tuition);
});

const pick = (b) => ({
  title: b.title,
  subject: b.subject,
  classLevel: b.classLevel,
  mode: b.mode,
  location: b.location,
  monthlyFee: Number(b.monthlyFee),
  daysPerWeek: Number(b.daysPerWeek),
  bannerImage: b.bannerImage,
  description: b.description,
});

const validate = (d) => {
  const required = [
    "title",
    "subject",
    "classLevel",
    "mode",
    "monthlyFee",
    "daysPerWeek",
    "description",
  ];
  for (const k of required) if (!d[k] && d[k] !== 0) return `${k} is required`;
  if (!["Online", "Offline"].includes(d.mode))
    return "mode must be Online or Offline";
  if (!(d.monthlyFee > 0)) return "monthlyFee must be greater than 0";
  if (!(d.daysPerWeek >= 1 && d.daysPerWeek <= 7))
    return "daysPerWeek must be between 1 and 7";
  return null;
};

router.post("/", verifyToken, verifyTutor, async (req, res) => {
  const data = pick(req.body);
  const error = validate(data);
  if (error) return res.status(400).json({ message: error });

  if (req.user.plan !== "pro") {
    const count = await tuitions.countDocuments({ tutorEmail: req.user.email });
    if (count >= 2) {
      return res.status(403).json({
        code: "LIMIT_REACHED",
        message:
          "Free plan allows 2 tuition posts. Upgrade to Pro for unlimited posts.",
      });
    }
  }

  const doc = {
    ...data,
    tutorName: req.user.name,
    tutorEmail: req.user.email,
    approvalStatus: "pending",
    isActive: true,
    createdAt: new Date(),
  };
  const result = await tuitions.insertOne(doc);
  res.status(201).json({ ...doc, _id: result.insertedId });
});

// Loads a tuition and makes sure it belongs to the logged-in tutor
const ownTuition = async (req, res) => {
  const _id = oid(req.params.id);
  if (!_id)
    return (res.status(400).json({ message: "Invalid tuition id" }), null);
  const tuition = await tuitions.findOne({ _id });
  if (!tuition)
    return (res.status(404).json({ message: "Tuition not found" }), null);
  if (tuition.tutorEmail !== req.user.email)
    return (
      res
        .status(403)
        .json({ message: "You can only manage your own tuitions" }),
      null
    );
  return tuition;
};

router.patch("/:id", verifyToken, verifyTutor, async (req, res) => {
  const tuition = await ownTuition(req, res);
  if (!tuition) return;
  const data = pick({ ...tuition, ...req.body });
  const error = validate(data);
  if (error) return res.status(400).json({ message: error });
  await tuitions.updateOne({ _id: tuition._id }, { $set: data });
  res.json({ message: "Tuition updated" });
});

router.patch("/:id/toggle", verifyToken, verifyTutor, async (req, res) => {
  const tuition = await ownTuition(req, res);
  if (!tuition) return;
  await tuitions.updateOne(
    { _id: tuition._id },
    { $set: { isActive: !tuition.isActive } },
  );
  res.json({ isActive: !tuition.isActive });
});

router.delete("/:id", verifyToken, verifyTutor, async (req, res) => {
  const tuition = await ownTuition(req, res);
  if (!tuition) return;
  await tuitions.deleteOne({ _id: tuition._id });
  await applications.deleteMany({ tuitionId: tuition._id.toString() });
  res.json({ message: "Tuition deleted" });
});

export default router;
