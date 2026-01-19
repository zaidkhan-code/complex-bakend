const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Business = require("../models/Business");
const Role = require("../models/Role");
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // =========================
      // BUSINESS AUTH
      // =========================
      if (decoded.type === "business") {
        req.business = await Business.findByPk(decoded.id, {
          attributes: { exclude: ["password"] },
        });

        if (!req.business) {
          return res.status(401).json({ message: "Business not found" });
        }

        if (req.business.isBlocked) {
          return res.status(403).json({ message: "Account is blocked" });
        }

        return next();
      }

      // =========================
      // USER / ADMIN AUTH
      // =========================
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["id", "name", "permissions"],
          },
        ],
      });

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (req.user.status === "blocked" || req.user.status === "suspended") {
        return res
          .status(403)
          .json({ message: "Account is blocked or suspended" });
      }

      next();
    } catch (error) {
      console.error("Auth error:", error.message);

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
      }

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }

      return res.status(401).json({ message: "Not authorized" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.isSuperAdmin || req.user?.role) {
    return next();
  }

  return res.status(403).json({ message: "Admin access only" });
};
// Business only middleware
const businessOnly = (req, res, next) => {
  if (req.business) {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied. Business account required." });
  }
};

// User only middleware
const userOnly = (req, res, next) => {
  if (req.user && req.user.role === "user") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. User account required." });
  }
};

// Generate JWT Token
const generateToken = (id, type = "user") => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

module.exports = { protect, adminOnly, businessOnly, userOnly, generateToken };
