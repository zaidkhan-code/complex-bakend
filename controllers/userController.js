const User = require("../models/User");

const Business = require("../models/Business");
const Promotion = require("../models/Promotion");
const { Op } = require("sequelize");

// @desc    Add promotion to wishlist
// @route   POST /api/wishlist
// @access  Private (User)
const addToWishlist = async (req, res) => {
  try {
    const { promotionId } = req.body;

    if (!promotionId) {
      return res.status(400).json({ message: "Promotion ID is required" });
    }

    // Check if promotion exists
    const promotion = await Promotion.findByPk(promotionId);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    const user = await User.findByPk(req.user.id);

    // Check if already in wishlist
    if (user.wishlist.includes(promotionId)) {
      return res.status(400).json({ message: "Promotion already in wishlist" });
    }

    // Add to wishlist
    user.wishlist = [...user.wishlist, promotionId];
    await user.save();

    res.json({ message: "Added to wishlist", wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove promotion from wishlist
// @route   DELETE /api/wishlist/:promotionId
// @access  Private (User)
const removeFromWishlist = async (req, res) => {
  try {
    const { promotionId } = req.params;

    const user = await User.findByPk(req.user.id);

    // Remove from wishlist
    user.wishlist = user.wishlist.filter((id) => id !== promotionId);
    await user.save();

    res.json({ message: "Removed from wishlist", wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private (User)
const getWishlist = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    // Get full promotion details
    const promotions = await Promotion.findAll({
      where: {
        id: {
          [Op.in]: user.wishlist,
        },
      },
    });

    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    const { name, city, state } = req.body;

    if (name) user.name = name;
    if (city) user.city = city;
    if (state) user.state = state;

    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
      state: user.state,
      timezone: user.timezone,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchBusiness = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const businesses = await Business.findAll({
      where: {
        status: "active",
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { businessAddress: { [Op.iLike]: `%${query}%` } },
        ],
      },
      attributes: ["id", "name", "businessAddress", "state"],
      limit: 20,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      count: businesses.length,
      data: businesses,
    });
  } catch (error) {
    console.error("Business search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getUserProfile,
  searchBusiness,
  updateUserProfile,
};
