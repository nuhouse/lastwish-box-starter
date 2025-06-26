const stripe = require('stripe')(process.env.STRIPE_SECRET || functions.config().stripe.secret);

// List your packages/plans here
const PLANS = {
  "basic": {
    price: 9900, // in cents = €99.00
    name: "2GB Package",
    id: "basic"
  },
  "premium": {
    price: 19900, // in cents = €199.00
    name: "5GB Package",
    id: "premium"
  }
};

// This is the HTTP function to create a checkout session
exports.createCheckoutSession = async (req, res) => {
  const { email, plan } = req.body;

  if (!email || !PLANS[plan]) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: PLANS[plan].name,
          },
          unit_amount: PLANS[plan].price,
          recurring: {
            interval: 'year'
          }
        },
        quantity: 1
      }],
      // Where to go after payment
      success_url: 'https://app.lastwishbox.com/stripe-success',
      cancel_url: 'https://app.lastwishbox.com/stripe-cancel',
      metadata: {
        plan_id: plan,
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
};
