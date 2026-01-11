/**
 * Create Admin User Script
 * File: bakend/scripts/createAdmin.js
 *
 * Usage:
 * node bakend/scripts/createAdmin.js
 *
 * This script provides an interactive CLI to create admin users
 * You can either use prompts or pass arguments directly
 *
 * Examples:
 * node bakend/scripts/createAdmin.js
 * node bakend/scripts/createAdmin.js --email admin@example.com --name "Admin User" --password "SecurePass123"
 */

const { sequelize } = require("../config/db");
const User = require("../models/User");
const readline = require("readline");
const path = require("path");

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to prompt user
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }
  return { valid: true };
};

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    const value = args[i + 1];
    if (value) {
      result[key] = value;
    }
  }

  return result;
};

// Main function to create admin
const createAdmin = async () => {
  try {
    // Connect to database
    console.log(`${colors.blue}Connecting to database...${colors.reset}`);
    await sequelize.authenticate();
    await sequelize.sync();
    console.log(`${colors.green}✓ Database connected${colors.reset}\n`);

    // Get command line arguments
    const args = parseArgs();

    let adminData = {
      fullName: args.name || null,
      email: args.email || null,
      password: args.password || null,
    };

    // If arguments provided, validate them
    if (adminData.email && adminData.password && adminData.fullName) {
      console.log(
        `${colors.bold}Creating admin with provided credentials...${colors.reset}\n`
      );
    } else {
      // Interactive mode
      console.log(
        `${colors.bold}${colors.blue}╔════════════════════════════════════════╗${colors.reset}`
      );
      console.log(
        `${colors.bold}${colors.blue}║     Create New Admin User              ║${colors.reset}`
      );
      console.log(
        `${colors.bold}${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`
      );

      // Get full name
      while (!adminData.fullName || adminData.fullName.trim() === "") {
        adminData.fullName = await question(
          `${colors.bold}Full Name:${colors.reset} `
        );
        if (!adminData.fullName.trim()) {
          console.log(
            `${colors.red}✗ Full name cannot be empty${colors.reset}`
          );
        }
      }

      // Get email
      while (!adminData.email || !validateEmail(adminData.email)) {
        adminData.email = await question(
          `${colors.bold}Email:${colors.reset} `
        );
        if (!validateEmail(adminData.email)) {
          console.log(
            `${colors.red}✗ Please enter a valid email address${colors.reset}`
          );
        }
      }

      // Get password
      while (!adminData.password) {
        adminData.password = await question(
          `${colors.bold}Password:${colors.reset} `
        );
        const validation = validatePassword(adminData.password);
        if (!validation.valid) {
          console.log(`${colors.red}✗ ${validation.message}${colors.reset}`);
          adminData.password = null;
        }
      }

      console.log("");
    }

    // Validate email format
    if (!validateEmail(adminData.email)) {
      throw new Error("Invalid email format");
    }

    // Validate password strength
    const passwordValidation = validatePassword(adminData.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Check if admin already exists
    console.log(
      `${colors.yellow}Checking if admin already exists...${colors.reset}`
    );
    const existingAdmin = await User.findOne({
      where: { email: adminData.email },
    });

    if (existingAdmin) {
      console.log(
        `${colors.red}✗ An account with email "${adminData.email}" already exists${colors.reset}`
      );
      process.exit(1);
    }

    // Create admin user
    console.log(`${colors.yellow}Creating admin user...${colors.reset}`);
    const admin = await User.create({
      fullName: adminData.fullName,
      email: adminData.email,
      password: adminData.password,
      role: "admin",
    });

    // Display success message
    console.log("\n");
    console.log(
      `${colors.green}${colors.bold}╔════════════════════════════════════════╗${colors.reset}`
    );
    console.log(
      `${colors.green}${colors.bold}║   Admin User Created Successfully!    ║${colors.reset}`
    );
    console.log(
      `${colors.green}${colors.bold}╚════════════════════════════════════════╝${colors.reset}\n`
    );

    console.log(`${colors.bold}Admin Details:${colors.reset}`);
    console.log(`  ${colors.blue}ID:${colors.reset}       ${admin.id}`);
    console.log(`  ${colors.blue}Name:${colors.reset}     ${admin.fullName}`);
    console.log(`  ${colors.blue}Email:${colors.reset}    ${admin.email}`);
    console.log(`  ${colors.blue}Role:${colors.reset}     ${admin.role}`);
    console.log(`  ${colors.blue}Status:${colors.reset}   Active`);
    console.log("\n");

    console.log(`${colors.bold}Login Credentials:${colors.reset}`);
    console.log(`  ${colors.blue}Email:${colors.reset}    ${adminData.email}`);
    console.log(
      `  ${colors.blue}Password:${colors.reset}  ${adminData.password}`
    );
    console.log("\n");

    console.log(
      `${colors.yellow}⚠️  Note: Save these credentials in a secure location${colors.reset}`
    );
    console.log(
      `${colors.yellow}⚠️  Users can change their password after first login${colors.reset}\n`
    );

    process.exit(0);
  } catch (error) {
    console.error(
      `\n${colors.red}${colors.bold}✗ Error:${colors.reset} ${error.message}`
    );
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Run the script
createAdmin();
