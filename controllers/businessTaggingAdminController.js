const { sequelize } = require("../config/db");

const parsePageParams = (req, defaults = {}) => {
  const page = Math.max(parseInt(req.query.page, 10) || defaults.page || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || defaults.limit || 25, 1),
    200,
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// @desc    List taggers grouped (user/business) for admin
// @route   GET /api/admin/business-tagging/taggers
// @access  Private (Admin)
const listBusinessTaggersForAdmin = async (req, res) => {
  try {
    const { page, limit, offset } = parsePageParams(req, {
      page: 1,
      limit: 25,
    });

    const [countRow] = await sequelize.query(
      `
SELECT
  (SELECT COUNT(*) FROM (SELECT DISTINCT "taggerUserId" FROM "BusinessTaggings" WHERE "taggerUserId" IS NOT NULL) u)::int
  +
  (SELECT COUNT(*) FROM (SELECT DISTINCT "taggerBusinessId" FROM "BusinessTaggings" WHERE "taggerBusinessId" IS NOT NULL) b)::int
  AS "totalTaggers";
`,
      { type: sequelize.Sequelize.QueryTypes.SELECT },
    );

    const totalItems = countRow?.totalTaggers || 0;

    const rows = await sequelize.query(
      `
WITH grouped AS (
  SELECT
    'user'::text AS "taggerType",
    bt."taggerUserId" AS "taggerId",
    COUNT(*)::int AS "taggedBusinesses",
    MAX(bt."createdAt") AS "lastTaggedAt"
  FROM "BusinessTaggings" bt
  WHERE bt."taggerUserId" IS NOT NULL
  GROUP BY bt."taggerUserId"

  UNION ALL

  SELECT
    'business'::text AS "taggerType",
    bt."taggerBusinessId" AS "taggerId",
    COUNT(*)::int AS "taggedBusinesses",
    MAX(bt."createdAt") AS "lastTaggedAt"
  FROM "BusinessTaggings" bt
  WHERE bt."taggerBusinessId" IS NOT NULL
  GROUP BY bt."taggerBusinessId"
)
SELECT
  g.*,
  u."fullName" AS "userFullName",
  u.email AS "userEmail",
  b.name AS "businessName",
  b.email AS "businessEmail"
FROM grouped g
LEFT JOIN "Users" u ON g."taggerType" = 'user' AND u.id = g."taggerId"
LEFT JOIN "Businesses" b ON g."taggerType" = 'business' AND b.id = g."taggerId"
ORDER BY g."lastTaggedAt" DESC NULLS LAST
LIMIT :limit OFFSET :offset;
`,
      {
        replacements: { limit, offset },
        type: sequelize.Sequelize.QueryTypes.SELECT,
      },
    );

    const data = rows.map((row) => {
      if (row.taggerType === "user") {
        return {
          taggerType: "user",
          taggerId: row.taggerId,
          tagger: {
            id: row.taggerId,
            fullName: row.userFullName || "Unknown",
            email: row.userEmail || null,
          },
          taggedBusinesses: row.taggedBusinesses || 0,
          lastTaggedAt: row.lastTaggedAt,
        };
      }

      return {
        taggerType: "business",
        taggerId: row.taggerId,
        tagger: {
          id: row.taggerId,
          name: row.businessName || "Unknown",
          email: row.businessEmail || null,
        },
        taggedBusinesses: row.taggedBusinesses || 0,
        lastTaggedAt: row.lastTaggedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Admin list business taggers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// @desc    List taggings (optionally filtered by tagger) for admin
// @route   GET /api/admin/business-tagging/taggings
// @access  Private (Admin)
const listBusinessTaggingsForAdmin = async (req, res) => {
  try {
    const { page, limit, offset } = parsePageParams(req, {
      page: 1,
      limit: 50,
    });

    const taggerType = req.query.taggerType
      ? String(req.query.taggerType).trim()
      : "";
    const taggerId = req.query.taggerId ? String(req.query.taggerId).trim() : "";
    const q = req.query.q ? String(req.query.q).trim() : "";
    const targetPlaceId = req.query.placeId
      ? String(req.query.placeId).trim()
      : "";

    const whereParts = [];
    const replacements = { limit, offset };

    if (taggerType && taggerId) {
      if (taggerType === "user") {
        whereParts.push('"taggerUserId" = :taggerId');
        replacements.taggerId = taggerId;
      } else if (taggerType === "business") {
        whereParts.push('"taggerBusinessId" = :taggerId');
        replacements.taggerId = taggerId;
      }
    }

    if (targetPlaceId) {
      whereParts.push('"targetPlaceId" = :targetPlaceId');
      replacements.targetPlaceId = targetPlaceId;
    }

    if (q) {
      whereParts.push(
        `("targetName" ILIKE :q OR "targetAddress" ILIKE :q OR "targetPlaceId" ILIKE :q)`,
      );
      replacements.q = `%${q}%`;
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [countRow] = await sequelize.query(
      `
SELECT COUNT(*)::int AS "total"
FROM "BusinessTaggings"
${whereSql};
`,
      {
        replacements,
        type: sequelize.Sequelize.QueryTypes.SELECT,
      },
    );

    const totalItems = countRow?.total || 0;

    const rows = await sequelize.query(
      `
SELECT
  id,
  "taggerUserId",
  "taggerBusinessId",
  "targetPlaceId",
  "targetName",
  "targetAddress",
  "targetIconMaskBaseUri",
  "targetIconBackgroundColor",
  "targetPrimaryPhotoUrl",
  "targetRating",
  "targetUserRatingsTotal",
  "targetWebsite",
  "targetGoogleUrl",
  "targetFormattedPhoneNumber",
  "targetInternationalPhoneNumber",
  "targetEmail",
  "targetTypes",
  "targetReviews",
  "detailsFetchedAt",
  "createdAt"
FROM "BusinessTaggings"
${whereSql}
ORDER BY "createdAt" DESC
LIMIT :limit OFFSET :offset;
`,
      {
        replacements,
        type: sequelize.Sequelize.QueryTypes.SELECT,
      },
    );

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Admin list business taggings error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  listBusinessTaggersForAdmin,
  listBusinessTaggingsForAdmin,
};
