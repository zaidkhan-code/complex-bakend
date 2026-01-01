const User = require('../models/User');
const Business = require('../models/Business');
const Promotion = require('../models/Promotion');
const { Op } = require('sequelize');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all businesses
// @route   GET /api/admin/businesses
// @access  Private (Admin)
const getAllBusinesses = async (req, res) => {
  try {
    const { search, category } = req.query;
    
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    const businesses = await Business.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block/Unblock user
// @route   PUT /api/admin/users/:id/block
// @access  Private (Admin)
const toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isBlocked = !user.isBlocked;
    await user.save();
    
    res.json({
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block/Unblock business
// @route   PUT /api/admin/businesses/:id/block
// @access  Private (Admin)
const toggleBusinessBlock = async (req, res) => {
  try {
    const business = await Business.findByPk(req.params.id);
    
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    
    business.isBlocked = !business.isBlocked;
    await business.save();
    
    res.json({
      message: `Business ${business.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        isBlocked: business.isBlocked
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all promotions
// @route   GET /api/admin/promotions
// @access  Private (Admin)
const getAllPromotions = async (req, res) => {
  try {
    const { status, category } = req.query;
    
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (category) {
      where.category = category;
    }
    
    const promotions = await Promotion.findAll({
      where,
      include: [{
        model: Business,
        as: 'business',
        attributes: ['name', 'email', 'category']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(promotions);
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
      return res.status(404).json({ message: 'Promotion not found' });
    }
    
    await promotion.destroy();
    
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalBusinesses = await Business.count();
    const totalPromotions = await Promotion.count();
    const activePromotions = await Promotion.count({ where: { status: 'active' } });
    
    res.json({
      totalUsers,
      totalBusinesses,
      totalPromotions,
      activePromotions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getAllBusinesses,
  toggleUserBlock,
  toggleBusinessBlock,
  getAllPromotions,
  deletePromotion,
  getAdminDashboard
};