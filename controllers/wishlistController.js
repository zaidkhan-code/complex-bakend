const Wishlist = require("../models/Wishlist");
const Promotion = require("../models/Promotion");
const User = require("../models/User");
const Business = require("../models/Business");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");

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

    // Make sure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }
    console.log(req.user, "user data check please/////////");

    const userId = req.user.id;

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
      where: { userId, promotionId },
    });

    if (existingWishlist) {
      return res.status(400).json({
        success: false,
        message: "Promotion already in wishlist",
      });
    }

    // Create wishlist entry
    const wishlistEntry = await Wishlist.create({
      userId,
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

    // Ensure user auth
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const userId = req.user.id;

    const wishlistEntry = await Wishlist.findOne({
      where: {
        promotionId,
        userId,
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

    // Ensure user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const userId = req.user.id;

    const { count, rows } = await Wishlist.findAndCountAll({
      where: {
        userId,
        status: "active",
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

    // Determine if the requester is a user or business
    const userId = req.user.accountType === "business" ? null : req.user.id;
    const businessId = req.user.accountType === "business" ? req.user.id : null;

    const wishlistEntry = await Wishlist.findOne({
      where: {
        promotionId,
        status: "active",
        ...(userId && { userId }),
        ...(businessId && { businessId }),
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
    if (req.user.accountType !== "business") {
      return res.status(403).json({
        success: false,
        message: "Only business accounts can access this endpoint",
      });
    }

    const businessId = req.user.id;

    // Get count of wishlists for this business's promotions
    const stats = await Wishlist.findAll({
      attributes: ["promotionId"],
      include: [
        {
          model: Promotion,
          as: "Promotion",
          where: { businessId },
          attributes: ["id"],
          required: true,
        },
      ],
      where: { status: "active" },
      raw: true,
    });

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
    // Determine if the requester is a user or business
    const userId = req.user.accountType === "business" ? null : req.user.id;
    const businessId = req.user.accountType === "business" ? req.user.id : null;

    const result = await Wishlist.update(
      { status: "removed" },
      {
        where: {
          ...(userId && { userId }),
          ...(businessId && { businessId }),
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
