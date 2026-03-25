const User = require("../models/User");
const Business = require("../models/Business");
const { generateToken } = require("../middleware/authMiddleware");
const Role = require("../models/Role");

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`${label} timeout`);
        error.code = "DB_TIMEOUT";
        reject(error);
      }, ms);
    }),
  ]);

const isTransientDbError = (error) =>
  error?.code === "DB_TIMEOUT" ||
  error?.code === "ECONNRESET" ||
  error?.name === "SequelizeConnectionError" ||
  error?.name === "SequelizeConnectionAcquireTimeoutError";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runDbOperation = async (
  operation,
  label,
  { timeoutMs = 8000, retries = 1 } = {},
) => {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(Promise.resolve().then(operation), timeoutMs, label);
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === retries) {
        throw error;
      }
      await sleep(300);
    }
  }

  throw lastError;
};

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
      personName,
      businessAddress,
      placeId,
      lat,
      lng,
      timezone,
    } = req.body;
    console.log(
      `📝 [REGISTER BUSINESS] Request - Name: ${name}, Categories: ${JSON.stringify(
        categories,
      )}`,
    );

    // Check if business exists
    const businessExists = await runDbOperation(
      () => Business.findOne({ where: { email } }),
      "Business lookup",
    );
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
    const business = await runDbOperation(
      () =>
        Business.create({
        name,
        email,
        password,
        phone,
        categories: categories, // Store as JSON array
        personName: personName || null,
        businessAddress: businessAddress || null,
        placeId: placeId || null,
        lat: parsedCoords.lat,
        lng: parsedCoords.lng,
        coordinates: buildGeoPoint(parsedCoords),
        autoApprovePromotions: false, // Default: admin must approve
        timezone: timezone || "UTC",
        }),
      "Business creation",
    );

    console.log(
      `✅ [REGISTER BUSINESS] Business created - ID: ${business.id}`,
    );

    if (business) {
      const responseData = {
        ...business?.dataValues,
        token: generateToken(business.id, "business"),
      };
      console.log(
        `✅ [REGISTER BUSINESS] Response sent for ID: ${responseData.id}`,
      );
      res.status(201).json(responseData);
    }
  } catch (error) {
    console.error(`❌ [REGISTER BUSINESS] Error:`, error.message);
    if (
      error?.code === "DB_TIMEOUT" ||
      error?.code === "ECONNRESET" ||
      error?.name === "SequelizeConnectionError" ||
      error?.name === "SequelizeConnectionAcquireTimeoutError"
    ) {
      return res.status(503).json({
        message:
          "Database connection is unstable right now. Please try again in a few seconds.",
      });
    }
    if (error?.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: (error.errors || []).map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        })),
      });
    }
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
