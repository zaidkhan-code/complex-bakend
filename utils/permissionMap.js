module.exports = {
  dashboard: ["view"],

  roles: ["view", "create", "edit", "delete"],

  users: ["view", "edit", "block"],

  support_messages: ["view", "export"],

  business_tagging: ["view"],

  businesses: [
    "view",
    "edit",
    "approve", // approve business
    "auto_approve", // 🔥 auto approve promotions
  ],

  promotions: [
    "view",
    "edit",
    "delete",
    "create",
    "approve", // 🔥 approve / change status
    "auto_approve", // 🔥 auto approval handling
  ],

  templates: ["view", "create", "edit", "delete"],

  categories: ["view", "create", "edit", "delete"],
};
