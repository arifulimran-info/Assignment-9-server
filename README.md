# MentorLagbe - Server

REST API for **MentorLagbe**, a smart tuition & mentorship platform where Tutors post tuition batches,
Students apply, and Admins moderate listings, users and Stripe revenue.

- **Live URL (client):** _add here_
- **Live URL (server):** _add here_
- **Client repo:** _add here_

## Admin credentials
- Email: `admin@mentorlagbe.com`
- Password: `Admin@123456` (change in `.env` before seeding)

## Key features
- BetterAuth (MongoDB adapter) with role selection on sign-up (student / tutor)
- JWT verification + role middlewares: `verifyToken`, `verifyStudent`, `verifyTutor`, `verifyAdmin`
- Server-side search, filters and pagination for approved tuitions
- Tutor CRUD with free-plan limit (2 posts), applicant management
- Student applications with duplicate prevention and cancel-while-pending
- Admin: tuition approval, role management, stats, transactions
- Stripe Checkout (Tutor $15 / Student $10), webhook + session verification, plan sync
- Seed script with 12 approved tuitions and sample applications

## Setup
```bash
npm install
cp .env.example .env   # fill in your values
npm run seed           # optional demo data
npm run dev
```
Stripe webhook (local): `stripe listen --forward-to localhost:5000/api/payments/webhook`

## NPM packages
express, cors, dotenv, mongodb, better-auth, jsonwebtoken, stripe

## Main endpoints
| Method | Route | Access |
|---|---|---|
| ALL | `/api/auth/*` | BetterAuth |
| GET | `/api/jwt` | session -> JWT |
| GET | `/api/tuitions?search=&subject=&classLevel=&mode=&page=&limit=` | public |
| GET | `/api/tuitions/latest`, `/filters`, `/:id` | public |
| POST/PATCH/DELETE | `/api/tuitions`, `/:id`, `/:id/toggle` | tutor |
| POST | `/api/applications` | student |
| GET/PATCH | `/api/applications/applicants`, `/:id/status` | tutor |
| GET/DELETE | `/api/applications/mine`, `/:id` | student |
| GET/PATCH | `/api/users/me` | any user |
| POST | `/api/payments/create-checkout-session`, `/verify` | student/tutor |
| GET | `/api/admin/stats`, `/users`, `/tuitions`, `/transactions` | admin |
