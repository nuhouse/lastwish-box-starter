const functions = require('firebase-functions');
const { createCheckoutSession } = require('./plans/stripeCheckout');



exports.createCheckoutSession = functions.https.onRequest(createCheckoutSession);

