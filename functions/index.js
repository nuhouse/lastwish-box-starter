const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")("sk_test_..."); // <-- your secret key

admin.initializeApp();

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  // data: { priceId, email }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{
      price: data.priceId,
      quantity: 1
    }],
    customer_email: data.email, // pre-fill email
    success_url: `https://app.lastwishbox.com/register?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://app.lastwishbox.com/plans`,
  });
  return { url: session.url };
});

// For registration page: validate Stripe Checkout Session
exports.getCheckoutSession = functions.https.onCall(async (data, context) => {
  // data: { sessionId }
  const session = await stripe.checkout.sessions.retrieve(data.sessionId);
  // Check session.payment_status === 'paid'
  // Get subscription and plan
  return {
    payment_status: session.payment_status,
    customer: session.customer,
    subscription: session.subscription,
    priceId: session.display_items ? session.display_items[0].price.id : null
  };
});

// For customer portal (upgrades/downgrades/cancels)
exports.createCustomerPortal = functions.https.onCall(async (data, context) => {
  // data: { customerId }
  const session = await stripe.billingPortal.sessions.create({
    customer: data.customerId,
    return_url: "https://app.lastwishbox.com/profile",
  });
  return { url: session.url };
});
