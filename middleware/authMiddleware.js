const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user/business from token
      if (decoded.type === 'business') {
        req.business = await Business.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });
        
        if (!req.business) {
          return res.status(401).json({ message: 'Not authorized, business not found' });
        }
        
        if (req.business.isBlocked) {
          return res.status(403).json({ message: 'Account is blocked' });
        }
      } else {
        req.user = await User.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });
        
        if (!req.user) {
          return res.status(401).json({ message: 'Not authorized, user not found' });
        }
        
        if (req.user.isBlocked) {
          return res.status(403).json({ message: 'Account is blocked' });
        }
      }
      
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

// Business only middleware
const businessOnly = (req, res, next) => {
  if (req.business) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Business account required.' });
  }
};

// User only middleware
const userOnly = (req, res, next) => {
  if (req.user && req.user.role === 'user') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. User account required.' });
  }
};

// Generate JWT Token
const generateToken = (id, type = 'user') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = { protect, adminOnly, businessOnly, userOnly, generateToken };