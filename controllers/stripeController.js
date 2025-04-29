const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// Get frontend URL from environment or use default
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.micuentacuentos.com';

// Create checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Creating checkout session for:', email);
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Using frontend URL for redirects:', FRONTEND_URL);
    
    // Create checkout session with TEST mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/subscribe`,
      customer_email: email,
      client_reference_id: user._id.toString(),
      metadata: {
        userId: user._id.toString()
      }
    });
    
    console.log('Checkout session created:', session.id);
    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
};

// Handle success callback
const handleSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;
    console.log('Handling success for session ID:', session_id);
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Session retrieved:', session.id, 'Payment status:', session.payment_status);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }
    
    // Get user ID from session
    const userId = session.client_reference_id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user subscription status
    user.subscriptionStatus = 'active';
    user.stripeCustomerId = session.customer;
    user.stripeSubscriptionId = session.subscription;
    user.storiesRemaining = 30; // Reset stories quota
    
    await user.save();
    console.log('User subscription activated:', user.email);
    
    res.json({
      success: true,
      message: 'Subscription activated successfully'
    });
  } catch (error) {
    console.error('Error handling success:', error);
    res.status(500).json({ error: error.message });
  }
};

// Handle webhook events
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle various webhook events
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      // Handle subscription update
      break;
      
    case 'customer.subscription.deleted':
      const cancelledSubscription = event.data.object;
      // Handle subscription cancellation
      break;
  }
  
  res.json({ received: true });
};

module.exports = {
  createCheckoutSession,
  handleSuccess,
  handleWebhook
};