const crypto = require("crypto");
const { Op } = require("sequelize");

const User = require("../models/User");
const Business = require("../models/Business");
const { generateToken } = require("../middleware/authMiddleware");
const Role = require("../models/Role");
const {
  sendPasswordResetEmail,
  sendBusinessRegistrationEmails,
} = require("../services/emailService");

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
      return await withTimeout(
        Promise.resolve().then(operation),
        timeoutMs,
        label,
      );
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
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)))
    return null;
  return { type: "Point", coordinates: [Number(lng), Number(lat)] };
};

const PASSWORD_RESET_EXPIRY_MINUTES = Number(
  process.env.PASSWORD_RESET_EXPIRY_MINUTES || 60,
);

const normalizeAccountType = (type) => {
  if (type === "user") return "user";
  if (type === "business") return "business";
  return null;
};

const resolveFrontendBaseUrl = () =>
  process.env.FRONTEND_URL || "http://localhost:8080";

const buildResetUrl = ({ accountType, token }) => {
  const baseUrl = resolveFrontendBaseUrl().replace(/\/+$/, "");
  const path =
    accountType === "business"
      ? "/business/reset-password"
      : "/auth/reset-password";

  return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
};

const buildPasswordResetTokenHash = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getAccountDisplayName = ({ account, accountType }) => {
  if (accountType === "business") {
    return account?.personName || account?.name || "there";
  }
  return account?.fullName || "there";
};

const resolveAccountModel = (accountType) =>
  accountType === "business" ? Business : User;

const findAccountByEmail = async ({ email, accountType }) => {
  const model = resolveAccountModel(accountType);
  const account = await model.findOne({ where: { email } });
  return { account, accountType };
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, timezone } = req.body;

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

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
      `[REGISTER BUSINESS] Request - Name: ${name}, Categories: ${JSON.stringify(
        categories,
      )}`,
    );

    const businessExists = await runDbOperation(
      () => Business.findOne({ where: { email } }),
      "Business lookup",
    );

    if (businessExists) {
      return res.status(400).json({ message: "Business already exists" });
    }

    if (!categories || categories.length === 0 || categories.length > 2) {
      return res.status(400).json({
        message: "Please select 1 or 2 business categories",
      });
    }

    const parsedCoords = parseLatLng({ lat, lng });

    const business = await runDbOperation(
      () =>
        Business.create({
          name,
          email,
          password,
          phone,
          categories,
          personName: personName || null,
          businessAddress: businessAddress || null,
          placeId: placeId || null,
          lat: parsedCoords.lat,
          lng: parsedCoords.lng,
          coordinates: buildGeoPoint(parsedCoords),
          autoApprovePromotions: false,
          timezone: timezone || "UTC",
        }),
      "Business creation",
    );

    console.log(`[REGISTER BUSINESS] Business created - ID: ${business.id}`);

    try {
      const emailResults = await sendBusinessRegistrationEmails({
        business: business?.dataValues,
      });
      console.log(
        "[REGISTER BUSINESS] Registration emails result:",
        emailResults,
      );
    } catch (emailError) {
      console.error(
        `[REGISTER BUSINESS] Failed to send registration emails: ${emailError?.message}`,
      );
    }

    if (business) {
      const responseData = {
        ...business?.dataValues,
        token: generateToken(business.id, "business"),
      };

      console.log(
        `[REGISTER BUSINESS] Response sent for ID: ${responseData.id}`,
      );
      res.status(201).json(responseData);
    }
  } catch (error) {
    console.error(`[REGISTER BUSINESS] Error:`, error.message);

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

// @desc    Login user/business/admin
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, type = "user" } = req.body;

    let account;

    if (type === "business") {
      account = await Business.findOne({ where: { email } });

      if (!account) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isMatch = await account.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(account.id, "business");

      return res.json({
        ...account?.dataValues,
        token,
      });
    }

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

    if (!account) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (account.status === "blocked") {
      return res.status(403).json({ message: "Account is blocked" });
    }

    const isMatch = await account.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(account.id, type);

    const response = {
      id: account.id,
      email: account.email,
      token,
      fullName: account.fullName,
      avatarUrl: account.avatarUrl,
      timezone: account.timezone || "UTC",
    };

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

    if (type === "user") {
      response.role = "user";
    }

    return res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: error?.message });
  }
};

// @desc    Request password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();
    const accountType = normalizeAccountType(req.body?.accountType);

    if (!accountType) {
      return res.status(400).json({
        message: "Account type must be either user or business",
      });
    }

    const { account, accountType: resolvedAccountType } =
      await findAccountByEmail({
        email,
        accountType,
      });

    if (!account) {
      return res.status(200).json({
        message:
          "If that email is registered, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = buildPasswordResetTokenHash(resetToken);
    const resetPasswordExpires = new Date(
      Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000,
    );

    account.resetPasswordToken = resetPasswordToken;
    account.resetPasswordExpires = resetPasswordExpires;
    await account.save({
      fields: ["resetPasswordToken", "resetPasswordExpires"],
    });

    const resetUrl = buildResetUrl({
      accountType: resolvedAccountType,
      token: resetToken,
    });

    try {
      await sendPasswordResetEmail({
        to: account.email,
        displayName: getAccountDisplayName({
          account,
          accountType: resolvedAccountType,
        }),
        accountType: resolvedAccountType,
        resetUrl,
        expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
      });
    } catch (emailError) {
      console.error("Forgot password email error:", emailError?.message);
    }

    return res.status(200).json({
      message:
        "If that email is registered, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: error?.message });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const accountType = normalizeAccountType(req.body?.accountType);
    const password = req.body?.password;

    if (!accountType) {
      return res.status(400).json({
        message: "Account type must be either user or business",
      });
    }

    const model = resolveAccountModel(accountType);
    const tokenHash = buildPasswordResetTokenHash(token);

    const account = await model.findOne({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!account) {
      return res.status(400).json({
        message: "Invalid or expired password reset token",
      });
    }

    account.password = password;
    account.resetPasswordToken = null;
    account.resetPasswordExpires = null;

    await account.save({
      fields: ["password", "resetPasswordToken", "resetPasswordExpires"],
    });

    return res.status(200).json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: error?.message });
  }
};

module.exports = {
  registerUser,
  registerBusiness,
  login,
  forgotPassword,
  resetPassword,
};
