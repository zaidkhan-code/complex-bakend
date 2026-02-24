const User = require("../models/User");
const Business = require("../models/Business");
const Role = require("../models/Role");
const Promotion = require("../models/Promotion");
const PromotionLocation = require("../models/PromotionLocation");
const Template = require("../models/Template");
const { Op } = require("sequelize");
const { uploadImageToCloudinary } = require("../utils/cloudinaryUtils");
const {
  syncPromotionLocations,
  getPromotionLocationAttributes,
} = require("../utils/promotionLocationUtils");

const extractLatLng = (coordinates) => {
  const value = coordinates?.coordinates;
  if (!Array.isArray(value) || value.length < 2) {
    return { lat: null, lng: null };
  }

  const [lng, lat] = value;
  return {
    lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
    lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
  };
};

const buildLegacyLocationShape = (locations = []) => {
  const cities = [];
  const states = [];
  const timezones = [];
  const citySet = new Set();
  const stateSet = new Set();
  const timezoneSet = new Set();

  for (const loc of locations) {
    if (!loc) continue;

    if (loc.type === "city" && loc.city_name) {
      const cityKey = `${loc.city_name}|${loc.state_code || ""}|${loc.country_code || ""}`;
      if (!citySet.has(cityKey)) {
        citySet.add(cityKey);
        const cityCoords = extractLatLng(loc.coordinates);
        cities.push({
          id: loc.id,
          placeId: null,
          name: loc.city_name,
          state_code: loc.state_code || null,
          state_name: loc.state_name || null,
          country_code: loc.country_code || null,
          country_name: null,
          formattedAddress: null,
          lat: cityCoords.lat,
          lng: cityCoords.lng,
        });
      }
    }

    if (loc.type === "state" && loc.state_code) {
      const stateKey = `${loc.state_code}|${loc.country_code || ""}`;
      if (!stateSet.has(stateKey)) {
        stateSet.add(stateKey);
        const stateCoords = extractLatLng(loc.coordinates);
        states.push({
          id: loc.id,
          placeId: null,
          name: loc.state_name || loc.state_code,
          state_code: loc.state_code,
          state_name: loc.state_name || loc.state_code || null,
          country_code: loc.country_code || null,
          country_name: null,
          formattedAddress: null,
          lat: stateCoords.lat,
          lng: stateCoords.lng,
        });
      }
    }

    if (loc.type === "timezone" && loc.timezone) {
      if (!timezoneSet.has(loc.timezone)) {
        timezoneSet.add(loc.timezone);
        timezones.push(loc.timezone);
      }
    }
  }

  return { cities, states, timezones };
};

const normalizePromotionForFrontend = (promotion) => {
  const plain = promotion?.toJSON ? promotion.toJSON() : promotion;
  if (!plain) return plain;

  const legacy = buildLegacyLocationShape(plain.locations || []);
  return {
    ...plain,
    cities:
      Array.isArray(plain.cities) && plain.cities.length
        ? plain.cities
        : legacy.cities,
    states:
      Array.isArray(plain.states) && plain.states.length
        ? plain.states
        : legacy.states,
    timezones:
      Array.isArray(plain.timezones) && plain.timezones.length
        ? plain.timezones
        : legacy.timezones,
  };
};

const getPromotionWithRelations = async (promotionId) => {
  const locationAttributes = await getPromotionLocationAttributes();

  return Promotion.findByPk(promotionId, {
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
        required: false,
      },
      {
        model: PromotionLocation,
        as: "locations",
        attributes: locationAttributes,
        required: false,
      },
    ],
  });
};

const parseDateOnly = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month, day));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
};

const isPromotionPastStopDate = (stopDateValue) => {
  const stopDate = parseDateOnly(stopDateValue);
  if (!stopDate) return false;

  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return stopDate < todayUtc;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeTemplateId = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  return UUID_REGEX.test(normalized) ? normalized : null;
};

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
      where.accountType = role;
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

    const locationAttributes = await getPromotionLocationAttributes();

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
        {
          model: PromotionLocation,
          as: "locations",
          attributes: locationAttributes,
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.json({
      promotions,
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
        "templates",
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

    if (!["inactive", "pending", "active"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be one of: active, inactive, pending",
      });
    }

    const promotion = await Promotion.findByPk(promotionId);

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    if (status === "active" && isPromotionPastStopDate(promotion.stopDate)) {
      return res.status(400).json({
        message:
          "Cannot activate an expired promotion. Extend the end date first, then activate it.",
      });
    }

    const oldStatus = promotion.status;
    promotion.status = status;

    // Set approvedAt timestamp when admin approves (marking inactive as approved)
    if (status === "inactive" && oldStatus == "pending") {
      promotion.approvedAt = new Date();
    }

    await promotion.save();

    console.log(
      `🔄 [ADMIN] Promotion ${promotionId} status changed from ${oldStatus} to ${status}`,
    );

    res.json({
      message: `Promotion status updated from ${oldStatus} to ${status}`,
      promotion: normalizePromotionForFrontend(
        (await getPromotionWithRelations(promotion.id)) || promotion,
      ),
    });
  } catch (error) {
    console.error("Error changing promotion status:", error);
    res.status(500).json({ message: error.message });
  }
};

// Run a promotion: set this promotion active and set all other promotions for the same business inactive
const runPromotion = async (req, res) => {
  const { promotionId } = req.params;
  try {
    const promotion = await Promotion.findByPk(promotionId);
    if (!promotion)
      return res.status(404).json({ message: "Promotion not found" });

    if (isPromotionPastStopDate(promotion.stopDate)) {
      return res.status(400).json({
        message:
          "Cannot activate an expired promotion. Extend the end date first, then activate it.",
      });
    }

    promotion.status = "active";
    promotion.approvedAt = promotion.approvedAt || new Date();
    await promotion.save();

    console.log(`✅ [ADMIN] Promotion ${promotionId} is now active`);
    res.json({
      message: "Promotion activated for business",
      promotion: normalizePromotionForFrontend(
        (await getPromotionWithRelations(promotion.id)) || promotion,
      ),
    });
  } catch (error) {
    console.error("Error running promotion:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single promotion (admin)
// @route   GET /api/admin/promotions/:id
// @access  Private (Admin)
const getPromotionById = async (req, res) => {
  try {
    const promotion = await getPromotionWithRelations(req.params.id);

    if (!promotion)
      return res.status(404).json({ message: "Promotion not found" });

    res.json({ promotion: normalizePromotionForFrontend(promotion) });
  } catch (error) {
    console.error("Error fetching promotion:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update promotion (admin)
// @route   PUT /api/admin/promotions/:id
// @access  Private (Admin)
const updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion)
      return res.status(404).json({ message: "Promotion not found" });

    const {
      templateId,
      imageUrl,
      text,
      backgroundColor,
      cities = [],
      states = [],
      timezones = [],
      runDate,
      stopDate,
      runTime,
      metadata,
      stopTime,
      categories = [],
    } = req.body;
    const normalizedTemplateId = normalizeTemplateId(templateId);

    // Basic validation
    if (!runDate || !stopDate || !runTime || !stopTime) {
      return res
        .status(400)
        .json({ message: "Missing schedule or time fields" });
    }

    const wasExpired = promotion.status === "expired";

    if (templateId !== undefined) {
      promotion.templateId = normalizedTemplateId;
    }
    promotion.imageUrl = imageUrl || promotion.imageUrl;
    promotion.text = Array.isArray(text)
      ? text
      : text
        ? [text]
        : promotion.text;
    promotion.backgroundColor = backgroundColor;
    promotion.cities = cities;
    promotion.states = states;
    promotion.timezones = timezones;
    promotion.runDate = runDate;
    promotion.stopDate = stopDate;
    promotion.runTime = runTime;
    promotion.stopTime = stopTime;
    promotion.categories = categories;
    promotion.metadata = metadata;
    await promotion.save();

    try {
      await syncPromotionLocations({
        promotionId: promotion.id,
        cities: promotion.cities || [],
        states: promotion.states || [],
        timezones: promotion.timezones || [],
      });
    } catch (locationError) {
      console.warn(
        "PromotionLocations sync warning (admin update):",
        locationError.message,
      );
    }

    const updatedPromotion = await getPromotionWithRelations(promotion.id);

    console.log(`✅ [ADMIN] Promotion ${promotion.id} updated by admin`);
    res.json({
      message: "Promotion updated",
      promotion: normalizePromotionForFrontend(updatedPromotion || promotion),
    });
  } catch (error) {
    console.error("Error updating promotion:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create promotion for a given business (admin)
// @route   POST /api/admin/businesses/:businessId/promotions
// @access  Private (Admin)
const createPromotionForBusiness = async (req, res) => {
  try {
    const {
      templateId,
      imageUrl,
      text,
      backgroundColor,
      category,
      cities = [],
      states = [],
      timezones = [],
      runDate,
      stopDate,
      runTime,
      metadata,
      categories = [],
      stopTime,
      businessId: requestBusinessId,
    } = req.body;
    const normalizedTemplateId = normalizeTemplateId(templateId);

    const businessId = requestBusinessId || req.params.businessId;

    // Simple validation
    if (!runDate || !stopDate || !runTime || !stopTime) {
      return res
        .status(400)
        .json({ message: "Missing schedule or time fields" });
    }

    const promotion = await Promotion.create({
      templateId: normalizedTemplateId,
      imageUrl,
      text: Array.isArray(text) ? text : text ? [text] : [],
      backgroundColor: backgroundColor || "",
      categories: categories.length ? categories : business.categories || [],
      cities,
      states,
      timezones,
      runDate,
      metadata: { ...metadata, createdBy: "admin" },
      stopDate,
      runTime,
      stopTime,
      price: 0, // Admin does not pay
      status: "inactive", // Admin-created and approved but not active
      autoApprove: true,
      paymentStatus: "completed",
      approvedAt: new Date(),
    });

    try {
      await syncPromotionLocations({
        promotionId: promotion.id,
        cities,
        states,
        timezones,
      });
    } catch (locationError) {
      console.warn(
        "PromotionLocations sync warning (admin create):",
        locationError.message,
      );
    }

    const createdPromotion = await getPromotionWithRelations(promotion.id);
    res.status(201).json({
      promotion: normalizePromotionForFrontend(createdPromotion || promotion),
    });
  } catch (error) {
    console.error("ADMIN CREATE PROMOTION ERROR:", error);
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
      `🔄 [ADMIN] Business ${businessId} auto-approve set to ${autoApprovePromotions}`,
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
const approvePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;

    const promotion = await Promotion.findByPk(promotionId, {
      include: [{ model: Business, as: "business" }],
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    if (promotion.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending promotions can be approved" });
    }

    promotion.status = "inactive"; // Approved but NOT active
    promotion.approvedAt = new Date();
    await promotion.save();

    console.log(`✅ [ADMIN] Promotion ${promotion.id} approved`);
    res.json({ message: "Promotion approved", promotion });
  } catch (error) {
    console.error("Error approving promotion:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------- MAKE USER ADMIN ---------- */
const makeAdmin = async (req, res) => {
  const { userId, roleId } = req.body;

  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const role = await Role.findByPk(roleId);
  if (!role) return res.status(404).json({ message: "Role not found" });

  user.role = "admin";
  user.accountType = "admin";
  user.roleId = role.id;

  await user.save();

  res.json({ message: "User promoted to admin" });
};

/* ---------- UPDATE ADMIN ROLE ---------- */
const updateAdminRole = async (req, res) => {
  try {
    const { roleId, isSuperAdmin } = req.body;
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user || user.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (isSuperAdmin) {
      user.isSuperAdmin = true;
      user.roleId = null;
    } else {
      user.isSuperAdmin = false;
      user.roleId = roleId;
    }

    await user.save();

    // Fetch role to include permissions in response
    let permissions = {};
    if (user.roleId) {
      const role = await Role.findByPk(user.roleId);
      if (role) {
        permissions = role.permissions || {};
      }
    }

    res.json({
      message: "Admin role updated",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        roleId: user.roleId,
        permissions,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------- CREATE ADMIN USER ---------- */
const createAdminUser = async (req, res) => {
  try {
    const { fullName, email, password, roleId, isSuperAdmin } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Check if user exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Create admin user
    const user = await User.create({
      fullName,
      email,
      password,
      role: "admin",
      accountType: "admin",
      isSuperAdmin: isSuperAdmin || false,
      roleId: isSuperAdmin ? null : roleId,
      status: "active",
    });

    // Fetch role permissions if not super admin
    let permissions = {};
    if (!isSuperAdmin && roleId) {
      const role = await Role.findByPk(roleId);
      if (role) {
        permissions = role.permissions || {};
      }
    }

    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        roleId: user.roleId,
        permissions: user?.roleId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------- GET USER PERMISSIONS ---------- */
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      include: { model: Role, attributes: ["id", "name", "permissions"] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let permissions = {};
    if (user.isSuperAdmin) {
      // Super admin has all permissions
      permissions = {};
    } else if (user.roleId && user.Role) {
      permissions = user.Role.permissions || {};
    }

    res.json({
      isSuperAdmin: user.isSuperAdmin,
      roleId: user.roleId,
      permissions,
      role: user.role,
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  changePromotionStatus,
  updateAdminRole,
  makeAdmin,
  toggleBusinessAutoApprove,
  getAllBusinesses,
  approvePromotion,
  updateBusinessStatus,
  getAllPromotions,
  deletePromotion,
  getPromotionById,
  updatePromotion,
  createPromotionForBusiness,
  getAdminDashboard,
  uploadTemplateImage,
  getAllTemplates,
  deleteTemplate,
  createAdminUser,
  getUserPermissions,
  runPromotion,
};
