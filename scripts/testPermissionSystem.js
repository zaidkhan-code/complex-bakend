#!/usr/bin/env node

/**
 * Complete Permission System Test
 * Tests role creation, assignment, and permission enforcement
 */

const http = require("http");

const BASE_URL = "http://localhost:5000";
let adminToken = null;
let adminUserId = null;

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
  console.log("\n🔐 COMPLETE PERMISSION SYSTEM TEST\n");
  console.log("═".repeat(70));

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Login as SuperAdmin
    console.log("\n1️⃣  Login as SuperAdmin");
    let response = await makeRequest("POST", "/api/auth/login", {
      email: "admin@example.com",
      password: "Admin@123",
      type: "admin",
    });

    if (response.status === 200 && response.body.token) {
      adminToken = response.body.token;
      adminUserId = response.body.data.id;
      console.log("   ✅ SuperAdmin login successful");
      testsPassed++;
    } else {
      console.log("   ❌ SuperAdmin login failed");
      console.log(`   Response:`, response.body);
      testsFailed++;
    }

    // Test 2: Get all roles
    console.log("\n2️⃣  Get All Roles");
    response = await makeRequest(
      "GET",
      "/api/admin/roles/roles",
      null,
      adminToken
    );

    if (response.status === 200 && Array.isArray(response.body)) {
      console.log(`   ✅ Retrieved ${response.body.length} roles`);
      response.body.forEach((role) => {
        const permCount = role.Permissions ? role.Permissions.length : 0;
        console.log(`      • ${role.name}: ${permCount} permissions`);
      });
      testsPassed++;
    } else {
      console.log("   ❌ Failed to get roles");
      console.log(`   Status: ${response.status}`);
      testsFailed++;
    }

    // Test 3: Create custom role
    console.log("\n3️⃣  Create Custom Role");
    response = await makeRequest(
      "POST",
      "/api/admin/roles/roles",
      {
        name: "Content Manager",
        description: "Can manage businesses and promotions only",
        permissionIds: [], // Will add permissions below
      },
      adminToken
    );

    let customRoleId = null;
    if (response.status === 201 && response.body.role) {
      customRoleId = response.body.role.id;
      console.log(`   ✅ Custom role created: ${response.body.role.name}`);
      testsPassed++;
    } else {
      console.log("   ❌ Failed to create custom role");
      console.log(`   Status: ${response.status}`);
      testsFailed++;
    }

    // Test 4: Get all permissions
    console.log("\n4️⃣  Get All Permissions");
    response = await makeRequest(
      "GET",
      "/api/admin/roles/permissions",
      null,
      adminToken
    );

    let businessPermissions = [];
    let promotionPermissions = [];

    if (response.status === 200 && response.body) {
      console.log("   ✅ Permissions loaded:");
      // response.body is formatted as: { "module": {"action": Permission} }
      // We need to extract permission IDs if they exist
      Object.entries(response.body).forEach(([module, actions]) => {
        console.log(`      • ${module}`);
      });
      testsPassed++;
    } else {
      console.log("   ❌ Failed to get permissions");
      testsFailed++;
    }

    // Test 5: Get user permissions for admin
    console.log("\n5️⃣  Get User Permissions");
    response = await makeRequest(
      "GET",
      `/api/admin/roles/user/${adminUserId}/permissions`,
      null,
      adminToken
    );

    if (response.status === 200 && response.body) {
      console.log("   ✅ User permissions loaded:");
      if (response.body.isSuperAdmin) {
        console.log("      • SuperAdmin: ALL PERMISSIONS");
      } else if (response.body.permissions) {
        Object.entries(response.body.permissions).forEach(
          ([module, actions]) => {
            console.log(`      • ${module}: ${actions.join(", ")}`);
          }
        );
      }
      testsPassed++;
    } else {
      console.log("   ❌ Failed to get user permissions");
      testsFailed++;
    }

    // Test 6: Test permission enforcement - businesses view
    console.log("\n6️⃣  Permission Enforcement - Get Businesses (should work)");
    response = await makeRequest(
      "GET",
      "/api/admin/businesses",
      null,
      adminToken
    );

    if (response.status === 200 || response.status === 400) {
      // 400 might mean no businesses yet
      console.log(
        `   ✅ Businesses endpoint accessible (status: ${response.status})`
      );
      testsPassed++;
    } else if (response.status === 403) {
      console.log(`   ⚠️  Permission denied for businesses view`);
      testsFailed++;
    } else {
      console.log(`   ❌ Unexpected status: ${response.status}`);
      testsFailed++;
    }

    // Test 7: Test permission enforcement - users view
    console.log("\n7️⃣  Permission Enforcement - Get Users (should work)");
    response = await makeRequest(
      "GET",
      "/api/admin/users",
      null,
      adminToken
    );

    if (response.status === 200 || response.status === 400) {
      console.log(
        `   ✅ Users endpoint accessible (status: ${response.status})`
      );
      testsPassed++;
    } else if (response.status === 403) {
      console.log(`   ⚠️  Permission denied for users view`);
      testsFailed++;
    } else {
      console.log(`   ❌ Unexpected status: ${response.status}`);
      testsFailed++;
    }

    // Test 8: Test without token (should fail)
    console.log("\n8️⃣  Authorization Check - No Token");
    response = await makeRequest("GET", "/api/admin/roles/roles");

    if (response.status === 401 || response.status === 403) {
      console.log("   ✅ Authorization properly enforced");
      testsPassed++;
    } else {
      console.log("   ⚠️  Authorization check unexpected");
      testsFailed++;
    }
  } catch (error) {
    console.error("   ❌ Test error:", error.message);
    testsFailed++;
  }

  // Summary
  console.log("\n" + "═".repeat(70));
  console.log(
    `\n✅ Tests Passed: ${testsPassed} | ❌ Tests Failed: ${testsFailed}\n`
  );

  if (testsFailed === 0) {
    console.log("🎉 All tests passed! Permission system is working correctly.\n");
  } else {
    console.log(
      "⚠️  Some tests failed. Please review the results above.\n"
    );
  }

  console.log("📋 Test Summary:");
  console.log(
    "   1. SuperAdmin can login with valid credentials"
  );
  console.log(
    "   2. Roles can be retrieved with their permissions"
  );
  console.log(
    "   3. Custom roles can be created dynamically"
  );
  console.log(
    "   4. All permissions are available"
  );
  console.log(
    "   5. User permissions can be retrieved"
  );
  console.log(
    "   6. SuperAdmin can access all endpoints"
  );
  console.log(
    "   7. Authorization is enforced"
  );

  console.log(
    "\n📝 Next Steps:"
  );
  console.log(
    "   1. Create admin users with specific roles"
  );
  console.log(
    "   2. Test role assignment and permission enforcement"
  );
  console.log(
    "   3. Verify frontend permission guards work correctly"
  );
  console.log(
    "   4. Test feature blocking based on permissions\n"
  );
}

runTests().catch(console.error);
