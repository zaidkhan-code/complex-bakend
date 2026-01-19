const User = require("../models/User");
const Role = require("../models/Role");
// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admin users can access this resource" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check if user is super admin
const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.user.isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Only super admin can access this resource" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 🔥 SuperAdmin bypass
      if (user.isSuperAdmin) {
        return next();
      }

      // ❗ IMPORTANT: role is lowercase (association alias)
      if (!user.role || !user.role.permissions) {
        return res.status(403).json({
          message: "Role or permissions not assigned",
        });
      }

      const permissions = user.role.permissions;

      // permissions example:
      // {
      //   users: ["view", "edit"],
      //   businesses: ["view", "edit"],
      // }

      if (
        !permissions[module] ||
        !Array.isArray(permissions[module]) ||
        !permissions[module].includes(action)
      ) {
        return res.status(403).json({
          message: `Access denied: ${module} ${action}`,
        });
      }

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
};

// Helper function to check if user has specific permission
const checkUserPermission = async (userId, module, action) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ["id", "isSuperAdmin"],
      include: [
        {
          model: Role,
          as: "Roles",
          through: { attributes: [] },
          attributes: ["id", "name"],
        },
      ],
    });

    if (!user) {
      console.log(`User not found: ${userId}`);
      return false;
    }

    // SuperAdmin can do everything
    if (user.isSuperAdmin) {
      return true;
    }

    // Check if any of user's roles has the required permission
    if (user.Roles && user.Roles.length > 0) {
      for (const role of user.Roles) {
        if (role.Permissions && role.Permissions.length > 0) {
          const hasPermission = role.Permissions.some(
            (perm) => perm.module === module && perm.action === action,
          );
          if (hasPermission) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
};

// Get user permissions
const getUserPermissions = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ["id", "isSuperAdmin"],
    });

    if (!user) {
      console.log(`User not found: ${userId}`);
      return null;
    }

    // SuperAdmin has all permissions
    if (user.isSuperAdmin) {
      return {
        isSuperAdmin: true,
        roles: ["superadmin"],
        permissions: ["all"],
      };
    }

    const permissions = {};
    const roles = [];

    if (user.Roles && user.Roles.length > 0) {
      for (const role of user.Roles) {
        roles.push(role.name);

        if (role.Permissions && role.Permissions.length > 0) {
          for (const perm of role.Permissions) {
            if (!permissions[perm.module]) {
              permissions[perm.module] = [];
            }
            permissions[perm.module].push(perm.action);
          }
        }
      }
    }

    return {
      isSuperAdmin: false,
      roles,
      permissions,
    };
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return null;
  }
};

module.exports = {
  isAdmin,
  isSuperAdmin,
  checkPermission,
  checkUserPermission,
  getUserPermissions,
};
