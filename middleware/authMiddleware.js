const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Business = require("../models/Business");
const Role = require("../models/Role");
const protect = (role) => async (req, res, next) => {
  let token;

  // 1️⃣ Get token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Business auth
    if (decoded.type === "business") {
      const business = await Business.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
      });

      if (!business)
        return res.status(401).json({ message: "Business not found" });
      if (business.isBlocked)
        return res.status(403).json({ message: "Business account is blocked" });

      // Role check
      if (role && role !== "business") {
        return res.status(403).json({ message: `Only ${role} access allowed` });
      }

      req.business = business;
      req.authType = "business";
      return next();
    }

    // 4️⃣ User / Admin auth
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Role, as: "role", attributes: ["id", "name", "permissions"] },
      ],
    });

    if (!user) return res.status(401).json({ message: "User not found" });
    if (["blocked", "suspended"].includes(user.status))
      return res
        .status(403)
        .json({ message: "Account is blocked or suspended" });

    const userType = user.role?.name === "admin" ? "admin" : "user";

    // Role check
    if (role && role !== userType) {
      return res.status(403).json({ message: `Only ${role} access allowed` });
    }

    req.user = user;
    req.authType = userType;

    next();
  } catch (error) {
    console.error("Auth error:", error.message);

    if (error.name === "JsonWebTokenError")
      return res.status(401).json({ message: "Invalid token" });
    if (error.name === "TokenExpiredError")
      return res.status(401).json({ message: "Token expired" });

    return res.status(401).json({ message: "Not authorized" });
  }
};

const generateToken = (id, type = "user") => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

module.exports = { protect, generateToken };
