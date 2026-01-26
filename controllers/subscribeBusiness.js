// controllers/subscriptionController.js
const stripe = require("../config/stripe");
const Business = require("../models/Business");
const SubscriptionHistory = require("../models/SubscriptionHistory");
const createSubscriptionCheckout = async (req, res) => {
  try {
    const { months } = req.body;
    const business = await Business.findByPk(req.business.id);

    if (!business)
      return res.status(404).json({ message: "Business not found" });

    // Create Stripe customer if not exists
    if (!business.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: business.email,
        name: business.name,
      });
      business.stripeCustomerId = customer.id;
      await business.save();
    }

    // Determine price amount
    const priceAmount =
      business.businessType === "online-ecommerce" ? 1000 : 2000; // in cents
    const currency = "usd";

    // Create a one-off Stripe Price dynamically
    const product = await stripe.products.create({
      name: `${business.businessType} subscription`,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceAmount * months,
      currency,
      recurring: { interval: "month" },
    });

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: business.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: price.id,
          quantity: months, // number of months
        },
      ],
      subscription_data: {
        metadata: {
          businessId: business.id,
          months,
        },
      },
      success_url: `${process.env.FRONTEND_URL}/subscription-success`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription-cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ message: error.message });
  }
};

const getSubscriptionHistory = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { rows, count } = await SubscriptionHistory.findAndCountAll({
    where: { businessId: req.business.id },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  res.json({
    data: rows,
    pagination: {
      total: count,
      page,
      pages: Math.ceil(count / limit),
    },
  });
};
const getActiveSubscription = async (req, res) => {
  const subscription = await SubscriptionHistory.findOne({
    where: {
      businessId: req.business.id,
      status: "active",
    },
    order: [["endDate", "DESC"]],
  });

  res.json(subscription || null);
};

module.exports = {
  createSubscriptionCheckout,
  getSubscriptionHistory,
  getActiveSubscription,
};
