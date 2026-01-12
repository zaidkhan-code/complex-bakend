const User = require("../models/User");
const Business = require("../models/Business");
const Promotion = require("../models/Promotion");
const Template = require("../models/Template");
const { Op } = require("sequelize");
const { uploadImageToCloudinary } = require("../utils/cloudinaryUtils");

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;

    const where = {};

    // Search by name or email
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter by role (user, business, admin)
    if (role) {
      where.role = role;
    }

    // Filter by status (active, inactive, blocked, suspended)
    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      users,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get all businesses with filters
// @route   GET /api/admin/businesses
// @access  Private (Admin)
const getAllBusinesses = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10, autoApprove } = req.query;

    const where = {};

    // Search by name, email, or phone
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter by status (active, inactive, blocked, suspended)
    if (status) {
      where.status = status;
    }

    // Filter by auto-approve setting
    if (autoApprove) {
      where.autoApprovePromotions = autoApprove === "true";
    }

    const offset = (page - 1) * limit;

    const { count, rows: businesses } = await Business.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      businesses,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive", "blocked", "suspended"].includes(status)) {
      return res.status(400).json({
        message:
          "Invalid status. Must be one of: active, inactive, blocked, suspended",
      });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    res.json({
      message: `User status updated from ${oldStatus} to ${status}`,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update business status
// @route   PUT /api/admin/businesses/:id/status
// @access  Private (Admin)
const updateBusinessStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive", "blocked", "suspended"].includes(status)) {
      return res.status(400).json({
        message:
          "Invalid status. Must be one of: active, inactive, blocked, suspended",
      });
    }

    const business = await Business.findByPk(req.params.id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const oldStatus = business.status;
    business.status = status;
    await business.save();

    res.json({
      message: `Business status updated from ${oldStatus} to ${status}`,
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        status: business.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block/Unblock business (deprecated - use updateBusinessStatus instead)
// @route   PUT /api/admin/businesses/:id/block
// @access  Private (Admin)

// @desc    Get all promotions with filters
// @route   GET /api/admin/promotions
// @access  Private (Admin)
const getAllPromotions = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    const where = {};

    // Filter by promotion status (active, inactive, pending)
    if (status) {
      where.status = status;
    }

    // Search by business name or category
    let businessWhere = {};
    if (search) {
      businessWhere = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: promotions } = await Promotion.findAndCountAll({
      where,
      include: [
        {
          model: Business,
          as: "business",
          attributes: [
            "id",
            "name",
            "email",
            "businessType",
            "autoApprovePromotions",
            "status",
          ],
          where:
            Object.keys(businessWhere).length > 0 ? businessWhere : undefined,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.json({
      promotions: promotions,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete promotion (admin)
// @route   DELETE /api/admin/promotions/:id
// @access  Private (Admin)
const deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    await promotion.destroy();

    res.json({ message: "Promotion deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getAdminDashboard = async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: "active" } });
    const blockedUsers = await User.count({ where: { status: "blocked" } });
    const suspendedUsers = await User.count({ where: { status: "suspended" } });

    // Business statistics
    const totalBusinesses = await Business.count();
    const activeBusinesses = await Business.count({
      where: { status: "active" },
    });
    const blockedBusinesses = await Business.count({
      where: { status: "blocked" },
    });
    const businessesWithAutoApprove = await Business.count({
      where: { autoApprovePromotions: true },
    });

    // Promotion statistics
    const totalPromotions = await Promotion.count();
    const activePromotions = await Promotion.count({
      where: { status: "active" },
    });
    const pendingPromotions = await Promotion.count({
      where: { status: "pending" },
    });
    const inactivePromotions = await Promotion.count({
      where: { status: "inactive" },
    });

    // Revenue statistics (total price of active/completed promotions)
    const totalRevenue = await Promotion.sum("price", {
      where: { status: "active" },
    });

    // Engagement metrics
    const totalViews = await Promotion.sum("views");
    const totalClicks = await Promotion.sum("clicks");

    // Recent activity
    const recentUsers = await User.findAll({
      attributes: ["id", "fullName", "email", "role", "status", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    const recentPromotions = await Promotion.findAll({
      attributes: [
        "id",
        "businessId",
        "status",
        "price",
        "createdAt",
        "views",
        "clicks",
      ],
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
        suspended: suspendedUsers,
      },
      businesses: {
        total: totalBusinesses,
        active: activeBusinesses,
        blocked: blockedBusinesses,
        withAutoApprove: businessesWithAutoApprove,
      },
      promotions: {
        total: totalPromotions,
        active: activePromotions,
        pending: pendingPromotions,
        inactive: inactivePromotions,
      },
      revenue: {
        total: parseFloat(totalRevenue) || 0,
      },
      engagement: {
        totalViews: totalViews || 0,
        totalClicks: totalClicks || 0,
        clickThroughRate: totalViews
          ? (((totalClicks || 0) / totalViews) * 100).toFixed(2)
          : 0,
      },
      recentActivity: {
        users: recentUsers,
        promotions: recentPromotions,
      },
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload template image
// @route   POST /api/admin/templates/upload
// @access  Private (Admin)
const uploadTemplateImage = async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: "No images provided" });
    }

    const createdTemplates = [];

    for (const file of req.files) {
      const cloudinaryResult = await uploadImageToCloudinary(
        file.buffer,
        "templates"
      );

      if (!cloudinaryResult.success) continue;

      const name = `${file.originalname.split(".")[0]}-${Date.now()}`;

      const template = await Template.create({
        name,
        imageUrl: cloudinaryResult.data.url,
        cloudinaryPublicId: cloudinaryResult.data.publicId,
        isDefault: false,
      });

      createdTemplates.push({
        id: template.id,
        name: template.name,
        imageUrl: template.imageUrl,
      });
    }

    res.status(201).json({
      message: "Templates uploaded successfully",
      templates: createdTemplates,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all templates
// @route   GET /api/admin/templates
// @access  Public
const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete template
// @route   DELETE /api/admin/templates/:id
// @access  Private (Admin)
const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    await template.destroy();

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change promotion status (admin can approve, reject, or deactivate)
// @route   PUT /api/admin/promotions/:promotionId/status
// @access  Private (Admin)
const changePromotionStatus = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "pending"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be one of: active, inactive, pending",
      });
    }

    const promotion = await Promotion.findByPk(promotionId, {
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["id", "name", "autoApprovePromotions"],
        },
      ],
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    const oldStatus = promotion.status;
    promotion.status = status;

    // Set approvedAt timestamp when admin approves
    if (status === "active" && oldStatus !== "active") {
      promotion.approvedAt = new Date();
    }

    await promotion.save();

    console.log(
      `🔄 [ADMIN] Promotion ${promotionId} status changed from ${oldStatus} to ${status}`
    );

    res.json({
      message: `Promotion status updated from ${oldStatus} to ${status}`,
      promotion: {
        id: promotion.id,
        businessId: promotion.businessId,
        status: promotion.status,
        approvedAt: promotion.approvedAt,
        createdAt: promotion.createdAt,
      },
    });
  } catch (error) {
    console.error("Error changing promotion status:", error);
    res.status(500).json({ message: error.message });
  }
};
const toggleBusinessAutoApprove = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { autoApprovePromotions } = req.body;

    const business = await Business.findByPk(businessId);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    business.autoApprovePromotions = autoApprovePromotions;
    await business.save();

    console.log(
      `🔄 [ADMIN] Business ${businessId} auto-approve set to ${autoApprovePromotions}`
    );

    res.json({
      message: `Business auto-approve ${
        autoApprovePromotions ? "enabled" : "disabled"
      }`,
      business,
    });
  } catch (error) {
    console.error("Error toggling business auto-approve:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  changePromotionStatus,
  toggleBusinessAutoApprove,
  getAllBusinesses,

  updateBusinessStatus,

  getAllPromotions,
  deletePromotion,
  getAdminDashboard,
  uploadTemplateImage,
  getAllTemplates,
  deleteTemplate,
};
