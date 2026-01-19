#!/usr/bin/env node

/**
 * API Test Script for Role Management System
 * Tests admin login and permissions API
 */

const http = require("http");

const BASE_URL = "http://localhost:5000";

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            body: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body,
          });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("\n🧪 ROLE MANAGEMENT API TESTS\n");
  console.log("═".repeat(60));

  let adminToken = null;

  // Test 1: Health Check
  console.log("\n1️⃣  Health Check");
  try {
    const response = await makeRequest("GET", "/health");
    if (response.status === 200) {
      console.log("   ✅ Server is running");
    } else {
      console.log("   ❌ Server health check failed");
      process.exit(1);
    }
  } catch (error) {
    console.log("   ❌ Cannot connect to server. Make sure it's running:");
    console.log("      npm start");
    process.exit(1);
  }

  // Test 2: Admin Login
  console.log("\n2️⃣  Admin Login");
  try {
    const response = await makeRequest("POST", "/api/auth/login", {
      email: "admin@example.com",
      password: "Admin@123",
      type: "admin",
    });

    if (response.status === 200 && response.body.token) {
      adminToken = response.body.token;
      console.log("   ✅ Login successful");
      console.log(`   Token: ${adminToken.substring(0, 20)}...`);
    } else {
      console.log("   ❌ Login failed");
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.body);
    }
  } catch (error) {
    console.log("   ❌ Login request failed:", error.message);
  }

  if (!adminToken) {
    console.log("\n❌ Cannot continue without valid token");
    process.exit(1);
  }

  // Test 3: Get All Roles
  console.log("\n3️⃣  Get All Roles");
  try {
    const response = await makeRequest(
      "GET",
      "/api/admin/roles/roles",
      null,
      adminToken
    );
    if (response.status === 200 && Array.isArray(response.body)) {
      console.log(`   ✅ Retrieved ${response.body.length} roles`);
      response.body.forEach((role) => {
        const permCount = role.Permissions ? role.Permissions.length : 0;
        console.log(`      • ${role.name} (${permCount} permissions)`);
      });
    } else {
      console.log("   ❌ Get roles failed");
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.body);
    }
  } catch (error) {
    console.log("   ❌ Get roles request failed:", error.message);
  }

  // Test 4: Get All Permissions
  console.log("\n4️⃣  Get All Permissions");
  try {
    const response = await makeRequest(
      "GET",
      "/api/admin/roles/permissions",
      null,
      adminToken
    );
    if (response.status === 200) {
      console.log("   ✅ Retrieved permissions");
      if (response.body && Object.keys(response.body).length > 0) {
        Object.entries(response.body).forEach(([module, actions]) => {
          console.log(`      • ${module}: ${actions.join(", ")}`);
        });
      }
    } else {
      console.log("   ❌ Get permissions failed");
      console.log(`   Status: ${response.status}`);
    }
  } catch (error) {
    console.log("   ❌ Get permissions request failed:", error.message);
  }

  // Test 5: Without Token (Should Fail)
  console.log("\n5️⃣  Authorization Check (No Token)");
  try {
    const response = await makeRequest("GET", "/api/admin/roles");
    if (response.status === 401 || response.status === 403) {
      console.log("   ✅ Authorization properly enforced");
    } else {
      console.log("   ⚠️  Authorization might not be enforced properly");
    }
  } catch (error) {
    console.log("   ❌ Authorization check failed:", error.message);
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("\n✅ API Tests Complete!\n");
  console.log("📝 Notes:");
  console.log("   • Admin token is valid for 7 days");
  console.log('   • Use token in Authorization header: "Bearer <token>"');
  console.log("   • All role management endpoints are protected");
  console.log("\n");
}

runTests().catch(console.error);
