require("dotenv").config();
const readline = require("readline");
const { connectDB } = require("../config/db");
const User = require("../models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function createSuperAdmin(fullName, email, password) {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    console.log(`❌ User with email ${email} already exists`);
    return false;
  }

  const user = await User.create({
    fullName,
    email,
    password,
    role: "admin", // can leave as admin or superadmin
    accountType: "admin",
    isSuperAdmin: true, // ✅ mark as superadmin
    status: "active",
  });

  console.log("\n✅ SuperAdmin created successfully:");
  console.log(`   ID: ${user.id}`);
  console.log(`   Name: ${user.fullName}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: SuperAdmin`);
  console.log(`   Status: Active`);
  return true;
}

async function main() {
  try {
    await connectDB();
    console.log("✅ Database connected\n");

    const fullName = await question("Full Name: ");
    const email = await question("Email Address: ");
    const password = await question("Password: ");
    const confirmPassword = await question("Confirm Password: ");

    if (password !== confirmPassword) {
      console.log("❌ Passwords do not match");
      rl.close();
      process.exit(1);
    }

    await createSuperAdmin(fullName, email, password);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    rl.close();
    process.exit(1);
  }
}

main();
