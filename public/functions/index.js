const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(functions.config().stripe.secret);

// Initialize Firebase Admin
admin.initializeApp();

// Create a Checkout Session for Stripe (Callable Function)
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  const { priceId, email } = data;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: "https://www.lastwishbox.com/payment-success",  // You can change this
      cancel_url: "https://www.lastwishbox.com/payment-cancel",    // You can change this
    });
    return { url: session.url };
  } catch (err) {
    console.error("Stripe Checkout error:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});
