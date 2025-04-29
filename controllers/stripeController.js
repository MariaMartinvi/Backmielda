const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// Get the frontend URL from environment variables or use a default
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.micuentacuentos.com';

// Create a checkout session
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
    
    // Log the frontend URL being used
    console.log('Using frontend URL for redirects:', FRONTEND_URL);
    
    // Create checkout session
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

// Handle success redirect
const handleSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;
    console.log('Handling success for session ID:', session_id);
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Session retrieved:', session.id, 'Payment status:', session.payment_status);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }
    
    // Find the user from client_reference_id
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

// Handle Stripe webhooks
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
      await handleSubscriptionUpdated(subscription);
      break;
      
    case 'customer.subscription.deleted':
      const cancelledSubscription = event.data.object;
      await handleSubscriptionCancelled(cancelledSubscription);
      break;
      
    // Add other webhook events as needed
  }
  
  res.json({ received: true });
};

// Helper functions for webhook handlers
async function handleSubscriptionUpdated(subscription) {
  try {
    // Find user with this subscription ID
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    
    if (!user) {
      console.log('No user found with subscription ID:', subscription.id);
      return;
    }
    
    // Update user based on subscription status
    if (subscription.status === 'active') {
      user.subscriptionStatus = 'active';
      console.log('Subscription activated for user:', user.email);
    } else if (subscription.status === 'trialing') {
      user.subscriptionStatus = 'active'; // Handle trial as active
      console.log('Trial subscription activated for user:', user.email);
    }
    
    await user.save();
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    // Find user with this subscription ID
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    
    if (!user) {
      console.log('No user found with subscription ID:', subscription.id);
      return;
    }
    
    // Mark subscription as cancelled
    user.subscriptionStatus = 'cancelled';
    await user.save();
    console.log('Subscription cancelled for user:', user.email);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

module.exports = {
  createCheckoutSession,
  handleSuccess,
  handleWebhook
};