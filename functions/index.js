const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

admin.initializeApp();
const db = admin.firestore();
const app = express();
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

app.use(cors({ origin: true }));
app.use(express.json({ limit: "150kb" }));

async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  req.user = null;
  if (!token) return next();

  try {
    req.user = await admin.auth().verifyIdToken(token);
  } catch (error) {
    logger.warn("Invalid optional auth token", { message: error.message });
  }
  next();
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Authentication required." });

  admin.auth().verifyIdToken(token)
    .then(decoded => {
      req.user = decoded;
      next();
    })
    .catch(() => res.status(401).json({ error: "Invalid authentication token." }));
}

function sanitizeText(value, maxLength = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map(item => ({
    role: item && item.role === "bot" ? "assistant" : "user",
    content: sanitizeText(item && (item.text || item.content), 800)
  })).filter(item => item.content);
}

async function loadProductContext() {
  try {
    const snapshot = await db.collection("products").limit(40).get();
    return snapshot.docs.map(doc => {
      const p = doc.data() || {};
      return {
        id: doc.id,
        name: sanitizeText(p.name, 100),
        price: Number(p.price || 0),
        category: sanitizeText(p.category, 80),
        subcategory: sanitizeText(p.subcategory, 80),
        stock: Number(p.stock || 0),
        description: sanitizeText(p.description, 220)
      };
    });
  } catch (error) {
    logger.warn("Could not load product context", { message: error.message });
    return [];
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "SmileHub API", ai: "configured when OPENAI_API_KEY secret is set" });
});

app.get("/profile", requireAuth, async (req, res) => {
  const snap = await db.collection("users").doc(req.user.uid).get();
  res.json(snap.exists ? snap.data() : {});
});

app.patch("/profile", requireAuth, async (req, res) => {
  const allowed = ["firstName", "lastName", "displayName", "address", "deliveryPreferences"];
  const update = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) update[key] = req.body[key];
  }
  update.email = req.user.email || "";
  update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await db.collection("users").doc(req.user.uid).set(update, { merge: true });
  res.json({ ok: true });
});

app.post("/ai/chat", optionalAuth, async (req, res) => {
  const message = sanitizeText(req.body && req.body.message, 1200);
  if (!message) return res.status(400).json({ error: "Message is required." });

  const history = sanitizeHistory(req.body && req.body.history);
  const page = sanitizeText(req.body && req.body.page, 120);
  const cart = Array.isArray(req.body && req.body.cart) ? req.body.cart.slice(0, 20) : [];
  const currentProduct = req.body && req.body.currentProduct ? req.body.currentProduct : null;
  const products = await loadProductContext();

  try {
    const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

    const context = {
      page,
      signedIn: Boolean(req.user),
      userEmail: req.user && req.user.email ? req.user.email : "",
      cart: cart.map(item => ({
        id: item.id,
        name: sanitizeText(item.name, 100),
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1)
      })),
      currentProduct,
      catalog: products
    };

    const response = await client.responses.create({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      max_output_tokens: 500,
      instructions: [
        "You are SmileBot, the friendly shopping assistant for SmileHub Dental Supplies.",
        "Reply naturally in the user's language. Taglish is welcome when the user writes Taglish.",
        "Understand greetings and typos such as 'helo', 'hii', and 'idk'.",
        "Be concise, helpful, and conversational. Ask at most one useful follow-up question at a time.",
        "Use only the provided SmileHub catalog and site context for prices, stock, products, policies, and account guidance.",
        "Never invent products, stock, order status, discounts, medical claims, or payment confirmations.",
        "Do not provide diagnosis or treatment. For clinical decisions, recommend consulting a licensed dental professional.",
        "When recommending products, mention no more than three relevant catalog items and explain why.",
        "When a user has a checkout problem, guide them step by step without sending them to Change Password unless they explicitly ask about passwords.",
        "Do not claim an order, refund, OTP, or payment succeeded unless the site context confirms it."
      ].join("\n"),
      input: [
        ...history,
        {
          role: "user",
          content: [
            { type: "input_text", text: `SITE CONTEXT:\n${JSON.stringify(context)}` },
            { type: "input_text", text: `USER MESSAGE:\n${message}` }
          ]
        }
      ]
    });

    const reply = sanitizeText(response.output_text, 3000);
    if (!reply) throw new Error("OpenAI returned an empty response.");

    res.json({
      reply,
      source: "openai",
      model: "gpt-5.6-luna"
    });
  } catch (error) {
    logger.error("SmileBot AI request failed", {
      message: error.message,
      status: error.status || null
    });

    const status = error && (error.status === 401 || error.status === 403) ? 503 : 502;
    res.status(status).json({
      error: "SmileBot AI is temporarily unavailable.",
      code: "ai_unavailable"
    });
  }
});

exports.api = onRequest({
  region: "asia-southeast1",
  secrets: [OPENAI_API_KEY],
  timeoutSeconds: 60,
  memory: "512MiB",
  maxInstances: 10
}, app);

exports.onOrderCreated = onDocumentCreated({
  document: "orders/{orderId}",
  region: "asia-southeast1"
}, async event => {
  const order = event.data && event.data.data();
  if (!order) return;
  logger.info("Order created", {
    orderId: event.params.orderId,
    userId: order.userId
  });

  // Decrement stock server-side with a transaction. Doing this from the
  // browser is impossible for customers (security rules reserve product
  // writes for admins) and racy between concurrent checkouts.
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return;

  try {
    await db.runTransaction(async tx => {
      const refs = items.map(item => db.collection("products").doc(String(item.productId)));
      const snaps = await tx.getAll(...refs);

      snaps.forEach((snap, index) => {
        if (!snap.exists) {
          logger.warn("Stock update skipped, product missing", { productId: items[index].productId });
          return;
        }
        const product = snap.data() || {};
        const qty = Math.max(0, Number(items[index].quantity || 0));
        const newStock = Math.max(0, Number(product.stock || 0) - qty);
        const updates = { stock: newStock };
        if (product.status !== "Out of Stock") {
          updates.status = newStock === 0 ? "Out of Stock" : newStock <= 10 ? "Low Stock" : "Active";
        }
        tx.update(snap.ref, updates);
      });
    });
    logger.info("Stock updated for order", { orderId: event.params.orderId });
  } catch (error) {
    logger.error("Stock decrement failed", {
      orderId: event.params.orderId,
      message: error.message
    });
  }
});
