const SubscriptionTemplate = require("../models/SubscriptionTemplate");

exports.createTemplate = async (req, res) => {
  const template = await SubscriptionTemplate.create(req.body);
  res.status(201).json(template);
};
exports.deleteTemplate = async (req, res) => {
  const { id } = req.params;

  const template = await SubscriptionTemplate.findByPk(id);

  if (!template) {
    return res.status(404).json({ message: "Template not found" });
  }

  // Soft delete (recommended)
  template.isActive = false;
  await template.save();

  res.json({ message: "Subscription template deactivated successfully" });
};
exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await SubscriptionTemplate.findAll({
      order: [["price", "ASC"]],
    });

    res.json(templates);
  } catch (error) {
    console.error("GET TEMPLATES ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
