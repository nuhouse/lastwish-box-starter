const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(functions.config().stripe.secret);
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Create a Checkout Session for Stripe
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  const { priceId, email } = data;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: "https://www.lastwishbox.com/",
      cancel_url: "https://www.lastwishbox.com/",
    });
    return { url: session.url };
  } catch (err) {
    console.error("Stripe Checkout error:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});
