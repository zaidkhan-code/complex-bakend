const stripe = require("../config/stripe");
const Business = require("../models/Business");
const Promotion = require("../models/Promotion");
const SubscriptionTemplate = require("../models/SubscriptionTemplate");
const BusinessSubscription = require("../models/BusinessSubscription");
const { reschedulePromotionJobs } = require("../services/promotionScheduler");
const {
  sendBusinessSubscriptionConfirmationEmail,
} = require("../services/emailService");

const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  /* ================================
     SUBSCRIPTION PAYMENT COMPLETED
  ==================================*/
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.mode === "subscription") {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription,
      );

      const { businessId, templateId } = session.metadata;

      const business = await Business.findByPk(businessId);
      const template = await SubscriptionTemplate.findByPk(templateId);

      if (!business || !template) {
        return res.json({ received: true });
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + template.durationMonths);

      // 🔴 Expire old subscriptions
      await BusinessSubscription.update(
        { status: "expired" },
        {
          where: {
            businessId: business.id,
            status: "active",
          },
        },
      );

      // ✅ Create new active subscription
      const createdSubscription = await BusinessSubscription.create({
        businessId: business.id,
        subscriptionTemplateId: template.id,
        startDate,
        endDate,
        freeCities: template.freeCities,
        freeStates: template.freeStates,
        freeTimezones: template.freeTimezones,
        stripeSubscriptionId: subscription.id,
        status: "active",
      });

      try {
        await sendBusinessSubscriptionConfirmationEmail({
          business,
          subscription: createdSubscription,
          template,
        });
      } catch (emailError) {
        console.error(
          `Subscription confirmation email failed for business ${business.id}:`,
          emailError?.message || emailError,
        );
      }

      console.log(
        `✅ [WEBHOOK] Subscription activated for business ${business.id}`,
      );
    }
  }

  /* ================================
     PROMOTION ADD-ON PAYMENT SUCCESS
  ==================================*/
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const { promotionId, businessId } = paymentIntent.metadata;

    if (promotionId) {
      const promotion = await Promotion.findByPk(promotionId);
      const business = await Business.findByPk(businessId);

      if (promotion) {
        promotion.paymentStatus = "completed";
        promotion.stripePaymentId = paymentIntent.id;

        if (business?.autoApprovePromotions) {
          promotion.status = "inactive";
          promotion.approvedAt = new Date();
        } else {
          promotion.status = "pending";
        }

        await promotion.save();
        await reschedulePromotionJobs(promotion);

        console.log(`✅ [WEBHOOK] Promotion ${promotionId} payment completed`);
      }
    }
  }

  res.json({ received: true });
};

// const stripe = require("../config/stripe");
// const Promotion = require("../models/Promotion");

// // @desc    Create Stripe checkout session
// // @route   POST /api/payment/stripe
// // @access  Private (Business)
// const createCheckoutSession = async (req, res) => {
//   try {
//     const { promotionId } = req.body;

//     const promotion = await Promotion.findOne({
//       where: {
//         id: promotionId,
//         businessId: req.business.id,
//       },
//     });

//     if (!promotion) {
//       return res.status(404).json({ message: "Promotion not found" });
//     }

//     if (promotion.status === "active") {
//       return res.status(400).json({ message: "Promotion is already active" });
//     }

//     // Create Stripe checkout session
//     const productData = {
//       name: "Promotion Service",
//       description: `Promotion from ${promotion.runDate.toDateString()} to ${promotion.stopDate.toDateString()}`,
//     };

//     // Convert promotion price to cents for Stripe
//     const unitAmount = Math.round(promotion.price * 100);

//     // Build Stripe session
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: [
//         {
//           price_data: {
//             currency: "usd",
//             product_data: productData,
//             unit_amount: unitAmount,
//           },
//           quantity: 1,
//         },
//       ],
//       mode: "payment",
//       success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/business/dashboard?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/business/promotions/${promotionId}`,
//       metadata: {
//         promotionId: promotion.id,
//         businessId: req.business.id,
//       },
//     });

//     res.json({ sessionId: session.id, url: session.url });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // @desc    Handle Stripe webhook
// // @route   POST /api/payment/webhook
// // @access  Public (Stripe)
// const handleWebhook = async (req, res) => {
//   const sig = req.headers["stripe-signature"];

//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET,
//     );
//   } catch (err) {
//     console.error("Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle the event
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;

//     try {
//       const Business = require("../models/Business");

//       // Get promotion and business info
//       const promotion = await Promotion.findByPk(session.metadata.promotionId);

//       if (promotion) {
//         // Update payment status
//         promotion.paymentStatus = "completed";
//         promotion.stripePaymentId = session.payment_intent;

//         // Check if business has auto-approval enabled
//         const business = await Business.findByPk(promotion.businessId);

//         if (business && business.autoApprovePromotions) {
//           // Auto-approve: set to active immediately
//           promotion.status = "inactive";
//           promotion.approvedAt = new Date();
//           console.log(
//             `✅ [PAYMENT] Promotion ${promotion.id} auto-activated (business has auto-approve enabled)`,
//           );
//         } else {
//           // Default: set to pending, will be activated after 24 hours or by admin
//           promotion.status = "pending";
//           console.log(
//             `⏳ [PAYMENT] Promotion ${promotion.id} set to pending (admin approval required or 24-hour auto-activation)`,
//           );
//         }

//         await promotion.save();
//         console.log(`✅ [PAYMENT] Promotion ${promotion.id} payment completed`);
//       }
//     } catch (error) {
//       console.error("Error processing promotion after payment:", error);
//     }
//   }

//   res.json({ received: true });
// };

// // @desc    Verify payment status
// // @route   GET /api/payment/verify/:sessionId
// // @access  Private (Business)
// const verifyPayment = async (req, res) => {
//   try {
//     const session = await stripe.checkout.sessions.retrieve(
//       req.params.sessionId,
//     );

//     if (session.payment_status === "paid") {
//       const promotion = await Promotion.findByPk(session.metadata.promotionId);

//       res.json({
//         paid: true,
//         promotion,
//       });
//     } else {
//       res.json({
//         paid: false,
//         status: session.payment_status,
//       });
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// module.exports = {
//   createCheckoutSession,
//   handleWebhook,
//   verifyPayment,
// };
module.exports = {
  handleWebhook,
};
