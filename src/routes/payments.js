import { Router } from "express";
import Stripe from "stripe";
import { users, payments } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";
import { clientOrigins } from "../auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_missing");
const PRICES = { tutor: 15, student: 10 }; // USD
const clientUrl = clientOrigins[0];

// Saves the transaction and upgrades the user. Safe to call many times
// (webhook + success page verification) thanks to the unique stripeSessionId index.
export async function fulfillSession(session) {
  if (session.payment_status !== "paid") return null;
  const email = session.metadata?.email;
  const role = session.metadata?.role;
  const user = await users.findOne({ email });
  if (!user) return null;

  const record = {
    userEmail: email,
    userName: user.name,
    userRole: role,
    planName: `Pro ${role === "tutor" ? "Tutor" : "Student"}`,
    amount: session.amount_total / 100,
    currency: session.currency,
    transactionId: session.payment_intent,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  };
  const result = await payments.updateOne(
    { stripeSessionId: session.id },
    { $setOnInsert: record },
    { upsert: true }
  );
  await users.updateOne({ email }, { $set: { plan: "pro" } });
  return { created: !!result.upsertedCount };
}

// Raw-body webhook handler (mounted in app.js before express.json)
export async function stripeWebhook(req, res) {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") await fulfillSession(event.data.object);
  res.json({ received: true });
}

const router = Router();

router.post("/create-checkout-session", verifyToken, async (req, res) => {
  const { role, email, name, plan } = req.user;
  if (!PRICES[role]) return res.status(403).json({ message: "Only students and tutors can subscribe" });
  if (plan === "pro") return res.status(400).json({ message: "You are already on the Pro plan" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `MentorLagbe Pro ${role === "tutor" ? "Tutor" : "Student"} Plan` },
          unit_amount: PRICES[role] * 100,
        },
        quantity: 1,
      },
    ],
    metadata: { email, role, name },
    success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/payment/cancel`,
  });
  res.json({ url: session.url });
});

// Called by /payment/success (works even if the webhook is not configured)
router.post("/verify", verifyToken, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ message: "sessionId is required" });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.email !== req.user.email)
    return res.status(403).json({ message: "This payment belongs to another user" });
  if (session.payment_status !== "paid")
    return res.status(400).json({ message: "Payment not completed" });
  await fulfillSession(session);
  const payment = await payments.findOne({ stripeSessionId: sessionId });
  res.json({ message: "Plan upgraded to Pro", payment });
});

router.get("/mine", verifyToken, async (req, res) => {
  res.json(await payments.find({ userEmail: req.user.email }).sort({ paidAt: -1 }).toArray());
});

export default router;
