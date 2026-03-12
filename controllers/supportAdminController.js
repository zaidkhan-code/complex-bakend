const { Op } = require("sequelize");
const SupportMessage = require("../models/SupportMessage");

const escapeCsvCell = (value) => {
  const cell = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
};

// @desc    List support messages
// @route   GET /api/admin/support-messages
// @access  Admin
const listSupportMessages = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 200);
    const offset = (page - 1) * limit;
    const senderType = req.query.senderType?.toString().trim();
    const search = req.query.search?.toString().trim();

    const where = {};
    if (senderType === "customer" || senderType === "business") {
      where.senderType = senderType;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { subject: { [Op.iLike]: `%${search}%` } },
        { body: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await SupportMessage.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
      messages: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Export support messages CSV
// @route   GET /api/admin/support-messages/export
// @access  Admin
const exportSupportMessagesCsv = async (req, res) => {
  try {
    const senderType = req.query.senderType?.toString().trim();
    const search = req.query.search?.toString().trim();

    const where = {};
    if (senderType === "customer" || senderType === "business") {
      where.senderType = senderType;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { subject: { [Op.iLike]: `%${search}%` } },
        { body: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const rows = await SupportMessage.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    const header = [
      "id",
      "senderType",
      "name",
      "email",
      "subject",
      "body",
      "ipAddress",
      "userAgent",
      "createdAt",
    ];
    const lines = [header.join(",")];
    for (const row of rows) {
      const values = [
        row.id,
        row.senderType,
        row.name,
        row.email,
        row.subject,
        row.body,
        row.ipAddress,
        row.userAgent,
        row.createdAt ? new Date(row.createdAt).toISOString() : "",
      ].map(escapeCsvCell);
      lines.push(values.join(","));
    }

    const csv = lines.join("\n");
    const fileName = `support-messages-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listSupportMessages,
  exportSupportMessagesCsv,
};

