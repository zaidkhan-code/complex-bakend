const Role = require("../models/Role");
const permissionMap = require("../utils/permissionMap");

/* ---------- CREATE ROLE ---------- */
const createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;

    if (!name || !permissions)
      return res.status(400).json({ message: "Required fields missing" });

    const exists = await Role.findOne({ where: { name } });
    if (exists) return res.status(400).json({ message: "Role already exists" });

    // Validate permissions
    for (const module in permissions) {
      if (!permissionMap[module])
        return res.status(400).json({ message: "Invalid module" });

      for (const action of permissions[module]) {
        if (!permissionMap[module].includes(action))
          return res.status(400).json({ message: "Invalid permission action" });
      }
    }

    const role = await Role.create({ name, permissions });
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------- GET ROLES ---------- */
const getRoles = async (req, res) => {
  const roles = await Role.findAll();
  res.json(roles);
};

/* ---------- UPDATE ROLE ---------- */
const updateRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    if (role.isSystem)
      return res.status(403).json({ message: "System role locked" });

    role.permissions = req.body.permissions;
    await role.save();

    res.json({ message: "Role updated", role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------- DELETE ROLE ---------- */
const deleteRole = async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) return res.status(404).json({ message: "Role not found" });

  if (role.isSystem)
    return res.status(403).json({ message: "System role locked" });

  await role.destroy();
  res.json({ message: "Role deleted" });
};
const getPermission = async (req, res) => {
  try {
    res.json(permissionMap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
module.exports = {
  createRole,
  getRoles,
  updateRole,
  getPermission,
  deleteRole,
};
