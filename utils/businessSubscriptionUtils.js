const BusinessSubscription = require("../models/BusinessSubscription");
const SubscriptionTemplate = require("../models/SubscriptionTemplate");

const isExpired = (subscription) => {
  const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  if (!endDate || Number.isNaN(endDate.getTime())) return false;
  return endDate < new Date();
};

const getValidActiveSubscription = async (
  businessId,
  { includeTemplate = false } = {},
) => {
  if (!businessId) return null;

  const subscription = await BusinessSubscription.findOne({
    where: {
      businessId,
      status: "active",
    },
    ...(includeTemplate
      ? {
          include: [
            {
              model: SubscriptionTemplate,
              as: "template",
            },
          ],
        }
      : {}),
    order: [["endDate", "DESC"]],
  });

  if (!subscription) return null;

  if (isExpired(subscription)) {
    subscription.status = "expired";
    await subscription.save({ fields: ["status", "updatedAt"] });
    return null;
  }

  return subscription;
};

module.exports = { getValidActiveSubscription };

