module.exports = {
  dashboard: ["view"],

  roles: ["view", "create", "edit", "delete"],

  users: ["view", "edit", "block"],

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
    "approve", // 🔥 approve / change status
    "auto_approve", // 🔥 auto approval handling
  ],

  templates: ["view", "create", "edit", "delete"],

  categories: ["view", "create", "edit", "delete"],
};
