// Load Firebase Functions & Admin SDK
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Load Stripe SDK with your secret key
const stripe = require("stripe")("sk_test_..."); // <<-- USE YOUR LIVE KEY FOR PRODUCTION!

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 1. Create a Stripe Checkout Session
 * Called from your frontend to initiate payment.
 * Returns a URL to redirect the user to Stripe Checkout.
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  const { priceId, email } = data;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      customer_email: email,
      success_url: `https://app.lastwishbox.com/register?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://app.lastwishbox.com/plans`,
    });
    return { url: session.url };
  } catch (err) {
    console.error("Stripe checkout error:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

/**
 * 2. Validate Stripe Checkout Session
 * Called from your frontend to verify payment after redirect.
 */
exports.getCheckoutSession = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // For most subscriptions, session.subscription is set
    return {
      payment_status: session.payment_status,
      customer: session.customer,
      subscription: session.subscription,
      // Stripe's new API doesn't use display_items; use line_items instead if you want more details
      priceId: session?.display_items ? session.display_items[0].price.id : null
    };
  } catch (err) {
    console.error("Get Checkout Session error:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

/**
 * 3. Create Stripe Customer Portal Session
 * Allows logged-in users to manage their subscription (upgrade, cancel, change payment method).
 */
exports.createCustomerPortal = functions.https.onCall(async (data, context) => {
  const { customerId } = data;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://app.lastwishbox.com/profile",
    });
    return { url: session.url };
  } catch (err) {
    console.error("Customer Portal error:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

