#!/usr/bin/env node
/**
 * Test script to verify admin role system setup
 * Usage: node bakend/scripts/testAdminSetup.js
 */

const { sequelize } = require("../config/db");

async function testSetup() {
  try {
    console.log("🧪 Testing Admin Role System Setup...\n");

    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // Check if Roles table exists
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    console.log("\n📋 Database Tables:");
    console.log(
      `   Roles table exists: ${tables.includes("Roles") ? "✅" : "❌"}`,
    );
    console.log(
      `   Users table exists: ${tables.includes("Users") ? "✅" : "❌"}`,
    );
    console.log(
      `   SequelizeMeta table exists: ${tables.includes("SequelizeMeta") ? "✅" : "❌"}`,
    );

    if (tables.includes("Roles")) {
      const rolesDesc = await queryInterface.describeTable("Roles");
      console.log("\n📊 Roles Table Schema:");
      console.log(`   - id: ${rolesDesc.id ? "✅" : "❌"}`);
      console.log(`   - name: ${rolesDesc.name ? "✅" : "❌"}`);
      console.log(`   - permissions: ${rolesDesc.permissions ? "✅" : "❌"}`);
      console.log(`   - isSystem: ${rolesDesc.isSystem ? "✅" : "❌"}`);
    }

    if (tables.includes("Users")) {
      const usersDesc = await queryInterface.describeTable("Users");
      console.log("\n👤 Users Table Updates:");
      console.log(`   - roleId: ${usersDesc.roleId ? "✅" : "❌"}`);
      console.log(`   - isSuperAdmin: ${usersDesc.isSuperAdmin ? "✅" : "❌"}`);
      console.log(`   - accountType: ${usersDesc.accountType ? "✅" : "❌"}`);
    }

    // Check for system roles
    if (tables.includes("Roles")) {
      const Role = require("../models/Role");
      const roles = await Role.findAll();
      console.log(`\n🎭 System Roles Created: ${roles.length}`);
      roles.forEach((role) => {
        console.log(
          `   - ${role.name} (System: ${role.isSystem}, ID: ${role.id})`,
        );
      });
    }

    console.log("\n✨ Setup verification complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testSetup();
