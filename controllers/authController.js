const User = require("../models/User");
const Business = require("../models/Business");
const { generateToken } = require("../middleware/authMiddleware");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

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
    } = req.body;
    console.log(
      `📝 [REGISTER BUSINESS] Request - Name: ${name}, BusinessType: ${businessType}, Categories: ${JSON.stringify(
        categories
      )}`
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
      autoApprovePromotions: false, // Default: admin must approve
    });

    console.log(
      `✅ [REGISTER BUSINESS] Business created - ID: ${business.id}, BusinessType: ${business.businessType}`
    );

    if (business) {
      const responseData = {
        id: business.id,
        name: business.name,
        email: business.email,
        phone: business.phone,
        categories: business.categories,
        businessType: business.businessType,
        personName: business.personName,
        businessAddress: business.businessAddress,
        token: generateToken(business.id, "business"),
      };
      console.log(
        `✅ [REGISTER BUSINESS] Response - BusinessType: ${responseData.businessType}`
      );
      res.status(201).json(responseData);
    }
  } catch (error) {
    console.error(`❌ [REGISTER BUSINESS] Error:`, error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user/business/admin
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, type = "user" } = req.body;
    console.log(`📝 [LOGIN] Attempt - Email: ${email}, Type: ${type}`);

    let account;
    if (type === "business") {
      account = await Business.findOne({ where: { email } });
    } else {
      account = await User.findOne({ where: { email } });
    }

    if (!account) {
      console.log(`❌ [LOGIN] Account not found - Email: ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (account.isBlocked) {
      console.log(`❌ [LOGIN] Account is blocked - Email: ${email}`);
      return res.status(403).json({ message: "Account is blocked" });
    }

    const isMatch = await account.matchPassword(password);

    if (!isMatch) {
      console.log(`❌ [LOGIN] Password mismatch - Email: ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const response = {
      id: account.id,
      email: account.email,
      token: generateToken(account.id, type),
    };

    if (type === "business") {
      response.name = account.name;
      response.phone = account.phone;
      response.category = account.category;
      response.businessType = account.businessType || "small"; // Default to "small" if not set
    } else if (type === "admin") {
      response.fullName = account.fullName;
      response.role = account.role;
    } else {
      response.fullName = account.fullName;
      response.role = account.role;
    }

    console.log(`✅ [LOGIN] Success - Email: ${email}, Type: ${type}`);
    res.json(response);
  } catch (error) {
    console.error(`❌ [LOGIN] Error:`, error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  registerBusiness,
  login,
};
