const BusinessSubscription = require("../models/BusinessSubscription");
const SubscriptionTemplate = require("../models/SubscriptionTemplate");
const stripe = require("../config/stripe");
const Business = require("../models/Business");
const createSubscriptionCheckout = async (req, res) => {
  const { templateId } = req.body;
  const business = await Business.findByPk(req.business.id);
  const template = await SubscriptionTemplate.findByPk(templateId);

  if (!template || !template.isActive)
    return res.status(404).json({ message: "Invalid subscription plan" });

  // Stripe customer
  if (!business.stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: business.email,
      name: business.name,
    });
    business.stripeCustomerId = customer.id;
    await business.save();
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: business.stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: template.name },
          unit_amount: template.price * 100,
          recurring: { interval: "month" },
        },
        quantity: template.durationMonths,
      },
    ],
    metadata: {
      businessId: business.id,
      templateId: template.id,
    },
    success_url: `${process.env.FRONTEND_URL}/subscription-success`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription-cancel`,
  });

  res.json({ url: session.url });
};

const getActiveSubscription = async (req, res) => {
  const subscription = await BusinessSubscription.findOne({
    where: {
      businessId: req.business.id,
      status: "active",
    },
    include: [
      {
        model: SubscriptionTemplate,
        attributes: ["name", "durationMonths", "price"],
      },
    ],
    order: [["endDate", "DESC"]],
  });

  res.json(subscription || null);
};

const getSubscriptionHistory = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { rows, count } = await BusinessSubscription.findAndCountAll({
    where: {
      businessId: req.business.id,
    },
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

module.exports = {
  createSubscriptionCheckout,
  getSubscriptionHistory,
  getActiveSubscription,
};
