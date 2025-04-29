const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

// Create checkout session
router.post('/create-checkout-session', stripeController.createCheckoutSession);

// Handle success redirect
router.get('/success', stripeController.handleSuccess);

// Handle Stripe webhooks
router.post('/webhook', 
    express.raw({type: 'application/json'}), 
    stripeController.handleWebhook
  );

module.exports = router; 