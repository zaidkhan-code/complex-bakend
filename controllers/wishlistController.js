const Wishlist = require("../models/Wishlist");
const Promotion = require("../models/Promotion");
const Business = require("../models/Business");
const { sequelize } = require("../config/db");

const resolveWishlistOwner = (req) => {
  if (req.authType === "business" && req.business?.id) {
    return {
      accountType: "business",
      ownerField: "businessId",
      ownerId: req.business.id,
      businessId: req.business.id,
      userId: null,
    };
  }

  if (req.authType === "user" && req.user?.id) {
    return {
      accountType: "user",
      ownerField: "userId",
      ownerId: req.user.id,
      userId: req.user.id,
      businessId: null,
    };
  }

  return null;
};

// @desc    Add promotion to wishlist
// @route   POST /api/wishlist
// @access  Private (User or Business)
const addToWishlist = async (req, res) => {
  try {
    const { promotionId } = req.body;

    if (!promotionId) {
      return res.status(400).json({
        success: false,
        message: "Promotion ID is required",
      });
    }

    const owner = resolveWishlistOwner(req);
    if (!owner) {
      return res.status(403).json({
        success: false,
        message: "Only user or business accounts can save promotions",
      });
    }

    // Check if promotion exists
    const promotion = await Promotion.findByPk(promotionId);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    // Check if already in wishlist
    const existingWishlist = await Wishlist.findOne({
      where: {
        promotionId,
        [owner.ownerField]: owner.ownerId,
      },
    });

    if (existingWishlist) {
      if (existingWishlist.status === "removed") {
        await existingWishlist.update({
          status: "active",
          savedAt: new Date(),
        });

        return res.status(200).json({
          success: true,
          message: "Added to wishlist successfully",
          data: existingWishlist,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Promotion already in wishlist",
      });
    }

    // Create wishlist entry
    const wishlistEntry = await Wishlist.create({
      userId: owner.userId,
      businessId: owner.businessId,
      promotionId,
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Added to wishlist successfully",
      data: wishlistEntry,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// @desc    Remove promotion from wishlist
// @route   DELETE /api/wishlist/:promotionId
// @access  Private (User or Business)
// @desc    Remove promotion from wishlist (User only)
// @route   DELETE /api/wishlist/:promotionId
// @access  Private (User)

const removeFromWishlist = async (req, res) => {
  try {
    const { promotionId } = req.params;

    const owner = resolveWishlistOwner(req);
    if (!owner) {
      return res.status(403).json({
        success: false,
        message: "Only user or business accounts can remove saved promotions",
      });
    }

    const wishlistEntry = await Wishlist.findOne({
      where: {
        promotionId,
        status: "active",
        [owner.ownerField]: owner.ownerId,
      },
    });

    if (!wishlistEntry) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found in wishlist",
      });
    }

    // 🔥 Direct delete (Hard delete)
    await wishlistEntry.destroy();

    return res.status(200).json({
      success: true,
      message: "Removed from wishlist successfully",
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// @desc    Get user/business wishlist
// @route   GET /api/wishlist
// @access  Private (User or Business)
const getWishlist = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const owner = resolveWishlistOwner(req);
    if (!owner) {
      return res.status(403).json({
        success: false,
        message: "Only user or business accounts can access wishlist",
      });
    }

    const { count, rows } = await Wishlist.findAndCountAll({
      where: {
        status: "active",
        [owner.ownerField]: owner.ownerId,
      },
      include: [
        {
          model: Promotion,
          as: "Promotion",
          // attributes: [
          //   "id",
          //   "businessId",
          //   "imageUrl",
          //   "text",
          //   "backgroundColor",
          //   "categories",
          // ],
          // include: [
          //   {
          //     model: Business,
          //     as: "business",
          //     attributes: ["id", "name", "businessAddress"],
          //   },
          // ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// @desc    Check if promotion is in wishlist
// @route   GET /api/wishlist/check/:promotionId
// @access  Private (User or Business)
const checkWishlistStatus = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const owner = resolveWishlistOwner(req);

    if (!owner) {
      return res.status(403).json({
        success: false,
        message: "Only user or business accounts can check wishlist status",
      });
    }

    const wishlistEntry = await Wishlist.findOne({
      where: {
        promotionId,
        status: "active",
        [owner.ownerField]: owner.ownerId,
      },
    });

    res.json({
      success: true,
      isInWishlist: !!wishlistEntry,
      data: wishlistEntry || null,
    });
  } catch (error) {
    console.error("Error checking wishlist status:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get wishlist statistics for business
// @route   GET /api/wishlist/stats/business
// @access  Private (Business)
const getWishlistStats = async (req, res) => {
  try {
    const owner = resolveWishlistOwner(req);
    if (!owner || owner.accountType !== "business") {
      return res.status(403).json({
        success: false,
        message: "Only business accounts can access this endpoint",
      });
    }

    const businessId = owner.businessId;

    // Count unique users and businesses that saved promotions
    const uniqueSaves = await Wishlist.findAll({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalSaves"],
        [
          sequelize.fn(
            "COUNT",
            sequelize.fn("DISTINCT", sequelize.col("userId")),
          ),
          "userSaves",
        ],
        [
          sequelize.fn(
            "COUNT",
            sequelize.fn("DISTINCT", sequelize.col("businessId")),
          ),
          "businessSaves",
        ],
      ],
      include: [
        {
          model: Promotion,
          as: "Promotion",
          where: { businessId },
          attributes: [],
          required: true,
        },
      ],
      where: { status: "active" },
      raw: true,
    });

    res.json({
      success: true,
      data: {
        totalSaves: parseInt(uniqueSaves[0]?.totalSaves) || 0,
        userSaves: parseInt(uniqueSaves[0]?.userSaves) || 0,
        businessSaves: parseInt(uniqueSaves[0]?.businessSaves) || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching wishlist stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get wishlist popularity for promotions
// @route   GET /api/wishlist/popular
// @access  Public
const getPopularPromos = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const popularPromos = await Wishlist.findAll({
      attributes: [
        "promotionId",
        [sequelize.fn("COUNT", sequelize.col("id")), "saveCount"],
      ],
      where: { status: "active" },
      include: [
        {
          model: Promotion,
          as: "Promotion",
          attributes: [
            "id",
            "businessId",
            "imageUrl",
            "text",
            "backgroundColor",
            "categories",
          ],
          include: [
            {
              model: Business,
              as: "Business",
              attributes: ["id", "name", "businessAddress"],
            },
          ],
        },
      ],
      group: ["promotionId", "Promotion.id", "Promotion->Business.id"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
      limit,
      subQuery: false,
      raw: false,
    });

    res.json({
      success: true,
      data: popularPromos,
    });
  } catch (error) {
    console.error("Error fetching popular promos:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Clear entire wishlist
// @route   DELETE /api/wishlist/clear-all
// @access  Private (User or Business)
const clearWishlist = async (req, res) => {
  try {
    const owner = resolveWishlistOwner(req);
    if (!owner) {
      return res.status(403).json({
        success: false,
        message: "Only user or business accounts can clear wishlist",
      });
    }

    const result = await Wishlist.update(
      { status: "removed" },
      {
        where: {
          [owner.ownerField]: owner.ownerId,
          status: "active",
        },
      },
    );

    res.json({
      success: true,
      message: `Cleared ${result[0]} items from wishlist`,
    });
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlistStatus,
  getWishlistStats,
  getPopularPromos,
  clearWishlist,
};
