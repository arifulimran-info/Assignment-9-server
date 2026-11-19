import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

export const db = client.db(process.env.DB_NAME || "mentorlagbe");

// The 4 collections from the assignment
export const users = db.collection("users");
export const tuitions = db.collection("tuitions");
export const applications = db.collection("applications");
export const payments = db.collection("payments");

await Promise.all([
  applications.createIndex({ tuitionId: 1, studentEmail: 1 }, { unique: true }),
  payments.createIndex({ stripeSessionId: 1 }, { unique: true }),
  tuitions.createIndex({ approvalStatus: 1, isActive: 1, createdAt: -1 }),
  tuitions.createIndex({ tutorEmail: 1 }),
]);

// Returns an ObjectId or null when the string is not a valid id
export const oid = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
