import "dotenv/config";
import { auth } from "./auth.js";
import { users, tuitions, applications } from "./config/db.js";

const PASSWORD = "Pass@123456";

const people = [
  { name: "Admin MentorLagbe", email: process.env.ADMIN_EMAIL || "admin@mentorlagbe.com", role: "admin", password: process.env.ADMIN_PASSWORD || "Admin@123456" },
  { name: "Rahim Uddin", email: "tutor1@mentorlagbe.com", role: "tutor" },
  { name: "Nusrat Jahan", email: "tutor2@mentorlagbe.com", role: "tutor" },
  { name: "Tanvir Ahmed", email: "tutor3@mentorlagbe.com", role: "tutor" },
  { name: "Ayesha Siddika", email: "student1@mentorlagbe.com", role: "student" },
  { name: "Mahmud Hasan", email: "student2@mentorlagbe.com", role: "student" },
  { name: "Farhana Akter", email: "student3@mentorlagbe.com", role: "student" },
];

for (const p of people) {
  if (await users.findOne({ email: p.email })) continue;
  await auth.api.signUpEmail({
    body: { name: p.name, email: p.email, password: p.password || PASSWORD, role: p.role === "admin" ? "student" : p.role },
  });
  if (p.role === "admin") await users.updateOne({ email: p.email }, { $set: { role: "admin" } });
  console.log("created user", p.email);
}

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;
const T = [
  ["tutor1@mentorlagbe.com", "Rahim Uddin", "SSC Mathematics Mastery Batch", "Math", "Class 10", "Online", "Dhaka", 3000, 4, "photo-1635070041078-e363dbe005cb", "Concept-first algebra, geometry and trigonometry with weekly model tests."],
  ["tutor1@mentorlagbe.com", "Rahim Uddin", "HSC Higher Math 1-on-1 Mentorship", "Math", "Class 12", "Offline", "Mirpur, Dhaka", 4500, 3, "photo-1596495578065-6e0763fa1178", "Personal mentoring for calculus, vectors and complex numbers."],
  ["tutor2@mentorlagbe.com", "Nusrat Jahan", "Physics Problem Solving Lab", "Physics", "Class 11", "Online", "Remote", 3500, 3, "photo-1636466497217-26a8cbeaf0aa", "Mechanics and waves explained through real numerical problems."],
  ["tutor2@mentorlagbe.com", "Nusrat Jahan", "SSC Physics Crash Course", "Physics", "Class 9", "Offline", "Dhanmondi, Dhaka", 2800, 3, "photo-1532094349884-543bc11b234d", "Short and effective syllabus coverage before exams."],
  ["tutor3@mentorlagbe.com", "Tanvir Ahmed", "JavaScript for Beginners", "Programming", "Undergraduate", "Online", "Remote", 5000, 3, "photo-1627398242454-45a1465c2479", "Build real projects while learning JavaScript fundamentals."],
  ["tutor3@mentorlagbe.com", "Tanvir Ahmed", "Python & Problem Solving", "Programming", "Class 11", "Online", "Remote", 4200, 2, "photo-1526379095098-d400fd0bf935", "Python basics, logic building and competitive programming."],
  ["tutor1@mentorlagbe.com", "Rahim Uddin", "IELTS Band 7+ Preparation", "IELTS", "Undergraduate", "Online", "Remote", 6000, 4, "photo-1456513080510-7bf3a84b82f8", "Speaking, writing, reading and listening strategies with mock tests."],
  ["tutor2@mentorlagbe.com", "Nusrat Jahan", "IELTS Writing Workshop", "IELTS", "Undergraduate", "Offline", "Gulshan, Dhaka", 5500, 2, "photo-1455390582262-044cdead277a", "Task 1 and Task 2 writing with personal feedback."],
  ["tutor3@mentorlagbe.com", "Tanvir Ahmed", "Chemistry Made Simple", "Chemistry", "Class 10", "Offline", "Uttara, Dhaka", 3200, 3, "photo-1603126857599-f462f1a3d7f8", "Organic and physical chemistry with lab-style demonstrations."],
  ["tutor2@mentorlagbe.com", "Nusrat Jahan", "English Spoken & Grammar", "English", "Class 8", "Online", "Remote", 2500, 3, "photo-1503676260728-1c00da094a0b", "Fluency practice, grammar and vocabulary building."],
  ["tutor1@mentorlagbe.com", "Rahim Uddin", "Biology Concept Builder", "Biology", "Class 11", "Offline", "Banani, Dhaka", 3400, 3, "photo-1530026405186-ed1f139313f8", "Diagrams, memory tricks and MCQ practice for HSC."],
  ["tutor3@mentorlagbe.com", "Tanvir Ahmed", "ICT & Web Development Basics", "Programming", "Class 12", "Online", "Remote", 3800, 3, "photo-1461749280684-dccba630e2f6", "HTML, CSS and ICT syllabus covered with hands-on practice."],
];

if ((await tuitions.countDocuments({ approvalStatus: "approved" })) < 10) {
  const now = Date.now();
  const docs = T.map((t, i) => ({
    tutorEmail: t[0], tutorName: t[1], title: t[2], subject: t[3], classLevel: t[4],
    mode: t[5], location: t[6], monthlyFee: t[7], daysPerWeek: t[8],
    bannerImage: img(t[9]), description: t[10],
    approvalStatus: "approved", isActive: true,
    createdAt: new Date(now - i * 86400000),
  }));
  docs.push({ ...docs[0], title: "Pending Demo: Advanced Calculus", approvalStatus: "pending", createdAt: new Date() });
  const { insertedIds } = await tuitions.insertMany(docs);
  const ids = Object.values(insertedIds);
  const sample = [
    ["student1@mentorlagbe.com", "Ayesha Siddika", 0, "accepted"],
    ["student1@mentorlagbe.com", "Ayesha Siddika", 4, "pending"],
    ["student2@mentorlagbe.com", "Mahmud Hasan", 0, "pending"],
    ["student2@mentorlagbe.com", "Mahmud Hasan", 2, "rejected"],
    ["student3@mentorlagbe.com", "Farhana Akter", 6, "pending"],
  ];
  await applications.insertMany(
    sample.map(([email, name, idx, status]) => ({
      tuitionId: ids[idx].toString(), tuitionTitle: docs[idx].title, subject: docs[idx].subject,
      monthlyFee: docs[idx].monthlyFee, tutorName: docs[idx].tutorName, tutorEmail: docs[idx].tutorEmail,
      studentName: name, studentEmail: email, studentPhone: "01700000000",
      preferredSchedule: "Evening 6-8 PM", studentNote: "I want to improve my results.",
      status, appliedAt: new Date(),
    }))
  );
  console.log("seeded tuitions and applications");
}

console.log(`Done. Admin: ${people[0].email} / ${people[0].password} | others use ${PASSWORD}`);
process.exit(0);
