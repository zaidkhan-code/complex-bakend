const BusinessPromotionTemplate = require("../models/BusinessPromotionTemplate");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeTemplateId = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  return UUID_REGEX.test(normalized) ? normalized : null;
};

const safeTextItems = (value) => (Array.isArray(value) ? value : []);
const safeMetadata = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const generateTemplateName = () =>
  `Template ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

const createBusinessPromotionTemplate = async (req, res) => {
  try {
    const {
      name,
      templateId,
      imageUrl,
      text = [],
      backgroundColor = "",
      metadata = {},
    } = req.body || {};

    const trimmedName = String(name || "").trim();

    const normalizedImageUrl = String(imageUrl || "").trim();
    if (!normalizedImageUrl) {
      return res.status(400).json({ message: "imageUrl is required" });
    }

    const created = await BusinessPromotionTemplate.create({
      businessId: req.business.id,
      name: trimmedName || generateTemplateName(),
      templateId: normalizeTemplateId(templateId),
      imageUrl: normalizedImageUrl,
      text: safeTextItems(text),
      backgroundColor:
        backgroundColor === null || backgroundColor === undefined
          ? ""
          : String(backgroundColor),
      metadata: safeMetadata(metadata),
    });

    return res.status(201).json({
      message: "Promotion template created successfully",
      template: created,
    });
  } catch (error) {
    console.error("CREATE BUSINESS TEMPLATE ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const getBusinessPromotionTemplates = async (req, res) => {
  try {
    const templates = await BusinessPromotionTemplate.findAll({
      where: { businessId: req.business.id },
      order: [["updatedAt", "DESC"]],
    });

    return res.json({ templates });
  } catch (error) {
    console.error("GET BUSINESS TEMPLATES ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const getBusinessPromotionTemplateById = async (req, res) => {
  try {
    const template = await BusinessPromotionTemplate.findOne({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({ template });
  } catch (error) {
    console.error("GET BUSINESS TEMPLATE ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateBusinessPromotionTemplate = async (req, res) => {
  try {
    const template = await BusinessPromotionTemplate.findOne({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const { name, templateId, imageUrl, text, backgroundColor, metadata } =
      req.body || {};

    if (name !== undefined) {
      const trimmedName = String(name || "").trim();
      template.name = trimmedName || template.name || generateTemplateName();
    }

    if (templateId !== undefined) {
      template.templateId = normalizeTemplateId(templateId);
    }

    if (imageUrl !== undefined) {
      const normalizedImageUrl = String(imageUrl || "").trim();
      if (!normalizedImageUrl) {
        return res.status(400).json({ message: "imageUrl is required" });
      }
      template.imageUrl = normalizedImageUrl;
    }

    if (text !== undefined) {
      template.text = safeTextItems(text);
    }

    if (backgroundColor !== undefined) {
      template.backgroundColor =
        backgroundColor === null || backgroundColor === undefined
          ? ""
          : String(backgroundColor);
    }

    if (metadata !== undefined) {
      template.metadata = safeMetadata(metadata);
    }

    await template.save();

    return res.json({
      message: "Promotion template updated successfully",
      template,
    });
  } catch (error) {
    console.error("UPDATE BUSINESS TEMPLATE ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const deleteBusinessPromotionTemplate = async (req, res) => {
  try {
    const template = await BusinessPromotionTemplate.findOne({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    await template.destroy();

    return res.json({ message: "Promotion template deleted successfully" });
  } catch (error) {
    console.error("DELETE BUSINESS TEMPLATE ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  createBusinessPromotionTemplate,
  getBusinessPromotionTemplates,
  getBusinessPromotionTemplateById,
  updateBusinessPromotionTemplate,
  deleteBusinessPromotionTemplate,
};
