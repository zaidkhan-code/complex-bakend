const User = require("../models/User");
const Business = require("../models/Business");
const { generateToken } = require("../middleware/authMiddleware");
const Role = require("../models/Role");
const { sequelize } = require("../config/db");

const parseLatLng = ({ lat, lng }) => {
  const numLat = Number(lat);
  const numLng = Number(lng);

  if (Number.isFinite(numLat) && Number.isFinite(numLng)) {
    return { lat: numLat, lng: numLng };
  }

  return { lat: null, lng: null };
};

const buildGeoPoint = ({ lat, lng }) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  return { type: "Point", coordinates: [Number(lng), Number(lat)] };
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, timezone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      role: "user",
      timezone: timezone || "UTC",
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        token: generateToken(user.id, "user"),
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register new business
// @route   POST /api/auth/register/business
// @access  Public
const registerBusiness = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      categories,
      businessType,
      personName,
      businessAddress,
      placeId,
      lat,
      lng,
      timezone,
    } = req.body;
    console.log(
      `📝 [REGISTER BUSINESS] Request - Name: ${name}, BusinessType: ${businessType}, Categories: ${JSON.stringify(
        categories,
      )}`,
    );

    // Check if business exists
    const businessExists = await Business.findOne({ where: { email } });
    if (businessExists) {
      return res.status(400).json({ message: "Business already exists" });
    }

    // Validate categories (max 2)
    if (!categories || categories.length === 0 || categories.length > 2) {
      return res.status(400).json({
        message: "Please select 1 or 2 business categories",
      });
    }

    const parsedCoords = parseLatLng({ lat, lng });

    // Create business with all fields
    const business = await Business.create({
      name,
      email,
      password,
      phone,
      categories: categories, // Store as JSON array
      businessType: businessType || "small",
      personName: personName || null,
      businessAddress: businessAddress || null,
      placeId: placeId || null,
      lat: parsedCoords.lat,
      lng: parsedCoords.lng,
      coordinates: buildGeoPoint(parsedCoords),
      autoApprovePromotions: false, // Default: admin must approve
      timezone: timezone || "UTC",
    });

    console.log(
      `✅ [REGISTER BUSINESS] Business created - ID: ${business.id}, BusinessType: ${business.businessType}`,
    );

    if (business) {
      // Ensure PostGIS geography is persisted even if the ORM shape isn't accepted by the DB/runtime.
      if (
        Number.isFinite(Number(parsedCoords.lat)) &&
        Number.isFinite(Number(parsedCoords.lng))
      ) {
        try {
          await sequelize.query(
            'UPDATE "Businesses" SET "coordinates" = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography WHERE id = :id;',
            {
              replacements: {
                id: business.id,
                lat: Number(parsedCoords.lat),
                lng: Number(parsedCoords.lng),
              },
              type: sequelize.Sequelize.QueryTypes.UPDATE,
            },
          );
        } catch (e) {
          // Don't fail registration if PostGIS/column isn't ready yet.
        }
      }

      const responseData = {
        ...business?.dataValues,
        token: generateToken(business.id, "business"),
      };
      console.log(
        `✅ [REGISTER BUSINESS] Response - BusinessType: ${responseData.businessType}`,
      );
      res.status(201).json(responseData);
    }
  } catch (error) {
    console.error(`❌ [REGISTER BUSINESS] Error:`, error.message);
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, type = "user" } = req.body;

    let account;

    // =========================
    // BUSINESS LOGIN
    // =========================
    if (type === "business") {
      account = await Business.findOne({ where: { email } });

      if (!account)
        return res.status(401).json({ message: "Invalid credentials" });

      const isMatch = await account.matchPassword(password);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid credentials" });

      const token = generateToken(account.id, "business");

      return res.json({
        ...account?.dataValues,
        token,
      });
    }

    // =========================
    // USER / ADMIN LOGIN
    // =========================
    account = await User.findOne({
      where: { email },
      include:
        type === "admin"
          ? [
              {
                model: Role,
                as: "role",
                attributes: ["id", "name", "permissions"],
              },
            ]
          : [],
    });

    if (!account)
      return res.status(401).json({ message: "Invalid credentials" });

    if (account.status === "blocked")
      return res.status(403).json({ message: "Account is blocked" });

    const isMatch = await account.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(account.id, type);

    // =========================
    // BASE RESPONSE
    // =========================
    const response = {
      id: account.id,
      email: account.email,
      token,
      fullName: account.fullName,
      avatarUrl: account.avatarUrl,
      timezone: account.timezone || "UTC",
    };

    // =========================
    // ADMIN RESPONSE (IMPORTANT)
    // =========================
    if (type === "admin") {
      response.isSuperAdmin = account.isSuperAdmin;

      if (account.isSuperAdmin) {
        response.role = {
          name: "SuperAdmin",
          permissions: "ALL",
        };
      } else {
        response.role = account.role
          ? {
              id: account.role.id,
              name: account.role.name,
              permissions: account.role.permissions,
            }
          : null;
      }
    }

    // =========================
    // NORMAL USER RESPONSE
    // =========================
    if (type === "user") {
      response.role = "user";
    }

    return res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: error?.message });
  }
};

module.exports = {
  registerUser,
  registerBusiness,
  login,
};
