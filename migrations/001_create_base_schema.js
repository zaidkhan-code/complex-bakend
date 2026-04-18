const { DataTypes } = require("sequelize");

const normalizeTableName = (entry) => {
  if (typeof entry === "string") return entry.replace(/"/g, "");
  if (entry && typeof entry === "object") {
    return entry.tableName || entry.table_name || entry.name || "";
  }
  return "";
};

const hasColumns = async (queryInterface, tableName, columns) => {
  try {
    const definition = await queryInterface.describeTable(tableName);
    return columns.every((c) => Object.prototype.hasOwnProperty.call(definition, c));
  } catch {
    return false;
  }
};

const createIndexIfColumnsExist = async (queryInterface, tableName, columns, sql) => {
  if (await hasColumns(queryInterface, tableName, columns)) {
    await queryInterface.sequelize.query(sql);
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const rawTables = await queryInterface.showAllTables();
    const tables = new Set(rawTables.map(normalizeTableName));

    const ensureTable = async (tableName, definition) => {
      if (!tables.has(tableName)) {
        await queryInterface.createTable(tableName, definition);
        tables.add(tableName);
      }
    };

    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    } catch {
      // ignore extension permissions errors
    }

    try {
      await queryInterface.sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    } catch {
      // ignore extension permissions errors
    }

    await ensureTable("Roles", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("Users", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      fullName: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      wishlist: { type: DataTypes.ARRAY(DataTypes.UUID), allowNull: false, defaultValue: [] },
      roleId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Roles", key: "id" },
        onDelete: "SET NULL",
      },
      accountType: {
        type: DataTypes.ENUM("user", "business", "admin"),
        allowNull: false,
        defaultValue: "user",
      },
      isSuperAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      avatarUrl: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM("active", "inactive", "blocked", "suspended"),
        allowNull: false,
        defaultValue: "active",
      },
      timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: "UTC" },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("Businesses", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      logoUrl: { type: DataTypes.TEXT, allowNull: true },
      businessType: {
        type: DataTypes.ENUM("small", "medium", "large", "online-ecommerce"),
        allowNull: false,
        defaultValue: "small",
      },
      categories: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      personName: { type: DataTypes.STRING, allowNull: true },
      businessAddress: { type: DataTypes.TEXT, allowNull: true },
      placeId: { type: DataTypes.STRING(255), allowNull: true },
      lat: { type: DataTypes.DOUBLE, allowNull: true },
      lng: { type: DataTypes.DOUBLE, allowNull: true },
      coordinates: { type: DataTypes.GEOGRAPHY("POINT", 4326), allowNull: true },
      state: { type: DataTypes.STRING, allowNull: true },
      timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: "UTC" },
      autoApprovePromotions: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: DataTypes.ENUM("active", "inactive", "blocked", "suspended"),
        allowNull: false,
        defaultValue: "active",
      },
      subscriptionStatus: {
        type: DataTypes.ENUM("active", "expired", "canceled", "none"),
        allowNull: false,
        defaultValue: "none",
      },
      subscriptionStart: { type: DataTypes.DATE, allowNull: true },
      subscriptionEnd: { type: DataTypes.DATE, allowNull: true },
      stripeSubscriptionId: { type: DataTypes.STRING, allowNull: true },
      stripeCustomerId: { type: DataTypes.STRING, allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("Templates", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      defaultImageUrl: { type: DataTypes.STRING, allowNull: true },
      imageUrl: { type: DataTypes.STRING, allowNull: true },
      cloudinaryPublicId: { type: DataTypes.STRING, allowNull: true },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("Promotions", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      businessId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Businesses", key: "id" },
        onDelete: "SET NULL",
      },
      templateId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Templates", key: "id" },
        onDelete: "SET NULL",
      },
      imageUrl: { type: DataTypes.STRING, allowNull: false },
      text: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      backgroundColor: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
      categories: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },
      runDate: { type: DataTypes.DATEONLY, allowNull: false },
      stopDate: { type: DataTypes.DATEONLY, allowNull: false },
      runTime: { type: DataTypes.TIME, allowNull: false },
      stopTime: { type: DataTypes.TIME, allowNull: false },
      scheduleEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      scheduleTimezone: { type: DataTypes.STRING, allowNull: false, defaultValue: "UTC" },
      scheduleStartAt: { type: DataTypes.DATE, allowNull: true },
      scheduleEndAt: { type: DataTypes.DATE, allowNull: true },
      activationJobId: { type: DataTypes.STRING, allowNull: true },
      expirationJobId: { type: DataTypes.STRING, allowNull: true },
      calculatedMonths: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      timezones: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      status: {
        type: DataTypes.ENUM("active", "inactive", "pending", "expired"),
        allowNull: false,
        defaultValue: "pending",
      },
      autoApprove: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      approvedAt: { type: DataTypes.DATE, allowNull: true },
      paymentStatus: {
        type: DataTypes.ENUM("pending", "completed", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      views: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      clicks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      stripePaymentId: { type: DataTypes.STRING, allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("PromotionLocations", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      promotionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Promotions", key: "id" },
        onDelete: "CASCADE",
      },
      type: {
        type: DataTypes.ENUM("country", "state", "city", "county", "timezone"),
        allowNull: false,
      },
      country_code: { type: DataTypes.STRING(5), allowNull: true },
      state_code: { type: DataTypes.STRING(10), allowNull: true },
      state_name: { type: DataTypes.STRING(150), allowNull: true },
      city_name: { type: DataTypes.STRING(150), allowNull: true },
      county_name: { type: DataTypes.STRING(150), allowNull: true },
      timezone: { type: DataTypes.STRING(100), allowNull: true },
      coordinates: { type: DataTypes.GEOGRAPHY("POINT", 4326), allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("Wishlists", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      businessId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Businesses", key: "id" },
        onDelete: "CASCADE",
      },
      promotionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Promotions", key: "id" },
        onDelete: "CASCADE",
      },
      status: {
        type: DataTypes.ENUM("active", "removed"),
        allowNull: false,
        defaultValue: "active",
      },
      savedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("SubscriptionTemplates", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      durationMonths: { type: DataTypes.INTEGER, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      freeCities: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
      freeStates: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      freeTimezones: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("BusinessSubscriptions", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      businessId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Businesses", key: "id" },
        onDelete: "CASCADE",
      },
      subscriptionTemplateId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "SubscriptionTemplates", key: "id" },
        onDelete: "CASCADE",
      },
      startDate: { type: DataTypes.DATE, allowNull: true },
      endDate: { type: DataTypes.DATE, allowNull: true },
      freeCities: { type: DataTypes.INTEGER, allowNull: true },
      freeStates: { type: DataTypes.INTEGER, allowNull: true },
      freeTimezones: { type: DataTypes.INTEGER, allowNull: true },
      status: {
        type: DataTypes.ENUM("active", "expired", "canceled"),
        allowNull: false,
        defaultValue: "active",
      },
      stripeSubscriptionId: { type: DataTypes.STRING, allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("SubscriptionHistories", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      businessId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Businesses", key: "id" },
        onDelete: "CASCADE",
      },
      stripeSubscriptionId: { type: DataTypes.STRING, allowNull: true },
      stripePriceId: { type: DataTypes.STRING, allowNull: true },
      businessType: { type: DataTypes.STRING, allowNull: true },
      months: { type: DataTypes.INTEGER, allowNull: true },
      startDate: { type: DataTypes.DATE, allowNull: true },
      endDate: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM("active", "expired", "canceled"),
        allowNull: false,
        defaultValue: "active",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("SupportMessages", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      senderType: { type: DataTypes.ENUM("customer", "business"), allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false },
      subject: { type: DataTypes.STRING(200), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      ipAddress: { type: DataTypes.STRING(80), allowNull: true },
      userAgent: { type: DataTypes.STRING(500), allowNull: true },
      meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("BusinessTaggings", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      taggerUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      taggerBusinessId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Businesses", key: "id" },
        onDelete: "CASCADE",
      },
      targetPlaceId: { type: DataTypes.STRING(255), allowNull: false },
      targetName: { type: DataTypes.STRING(255), allowNull: false },
      targetAddress: { type: DataTypes.TEXT, allowNull: true },
      targetIconMaskBaseUri: { type: DataTypes.TEXT, allowNull: true },
      targetIconBackgroundColor: { type: DataTypes.STRING(32), allowNull: true },
      targetPrimaryPhotoUrl: { type: DataTypes.TEXT, allowNull: true },
      targetRating: { type: DataTypes.DOUBLE, allowNull: true },
      targetUserRatingsTotal: { type: DataTypes.INTEGER, allowNull: true },
      targetWebsite: { type: DataTypes.TEXT, allowNull: true },
      targetGoogleUrl: { type: DataTypes.TEXT, allowNull: true },
      targetFormattedPhoneNumber: { type: DataTypes.STRING(64), allowNull: true },
      targetInternationalPhoneNumber: { type: DataTypes.STRING(64), allowNull: true },
      targetTypes: { type: DataTypes.JSONB, allowNull: true },
      targetReviews: { type: DataTypes.JSONB, allowNull: true },
      detailsFetchedAt: { type: DataTypes.DATE, allowNull: true },
      targetEmail: { type: DataTypes.STRING(320), allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await ensureTable("BusinessPromotionTemplates", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      businessId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Businesses", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: DataTypes.STRING(150), allowNull: false },
      templateId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Templates", key: "id" },
        onDelete: "SET NULL",
      },
      imageUrl: { type: DataTypes.TEXT, allowNull: false },
      text: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      backgroundColor: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    // Core indexes/constraints for fresh environments and partially initialized DBs.
    await createIndexIfColumnsExist(
      queryInterface,
      "Businesses",
      ["status", "createdAt"],
      'CREATE INDEX IF NOT EXISTS "idx_businesses_status_created" ON "Businesses" ("status", "createdAt");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "Businesses",
      ["coordinates"],
      'CREATE INDEX IF NOT EXISTS "idx_businesses_coordinates_gist" ON "Businesses" USING GIST ("coordinates");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "Businesses",
      ["placeId"],
      'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_businesses_place_id" ON "Businesses" ("placeId") WHERE "placeId" IS NOT NULL;',
    );

    await createIndexIfColumnsExist(
      queryInterface,
      "Promotions",
      ["status"],
      'CREATE INDEX IF NOT EXISTS "idx_promotions_status" ON "Promotions" ("status");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "Promotions",
      ["businessId"],
      'CREATE INDEX IF NOT EXISTS "idx_promotions_business_id" ON "Promotions" ("businessId");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "Promotions",
      ["businessId", "status", "createdAt"],
      'CREATE INDEX IF NOT EXISTS "idx_promotions_business_status_created" ON "Promotions" ("businessId", "status", "createdAt");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "Promotions",
      ["categories"],
      'CREATE INDEX IF NOT EXISTS "idx_promotions_categories_gin" ON "Promotions" USING GIN ("categories");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "Promotions",
      ["timezones"],
      'CREATE INDEX IF NOT EXISTS "idx_promotions_timezones_gin" ON "Promotions" USING GIN ("timezones");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "Promotions",
      ["scheduleEndAt"],
      'CREATE INDEX IF NOT EXISTS "idx_promotions_schedule_end" ON "Promotions" ("scheduleEndAt");',
    );

    await createIndexIfColumnsExist(
      queryInterface,
      "PromotionLocations",
      ["promotionId"],
      'CREATE INDEX IF NOT EXISTS "idx_promotion_locations_promotion_id" ON "PromotionLocations" ("promotionId");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "PromotionLocations",
      ["state_name"],
      'CREATE INDEX IF NOT EXISTS "idx_promotion_locations_state_name" ON "PromotionLocations" ("state_name");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "PromotionLocations",
      ["coordinates"],
      'CREATE INDEX IF NOT EXISTS "idx_coordinates_gist" ON "PromotionLocations" USING GIST ("coordinates");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "PromotionLocations",
      ["promotionId", "type", "country_code", "state_code", "city_name", "timezone"],
      'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_promotion_location" ON "PromotionLocations" ("promotionId", "type", "country_code", "state_code", "city_name", "timezone");',
    );

    await createIndexIfColumnsExist(
      queryInterface,
      "Wishlists",
      ["userId", "promotionId"],
      'CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_promotion" ON "Wishlists" ("userId", "promotionId");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "Wishlists",
      ["businessId", "promotionId"],
      'CREATE UNIQUE INDEX IF NOT EXISTS "unique_business_promotion" ON "Wishlists" ("businessId", "promotionId");',
    );

    await createIndexIfColumnsExist(
      queryInterface,
      "SupportMessages",
      ["createdAt"],
      'CREATE INDEX IF NOT EXISTS "idx_support_messages_created_at" ON "SupportMessages" ("createdAt" DESC);',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "SupportMessages",
      ["senderType"],
      'CREATE INDEX IF NOT EXISTS "idx_support_messages_sender_type" ON "SupportMessages" ("senderType");',
    );

    await createIndexIfColumnsExist(
      queryInterface,
      "BusinessTaggings",
      ["targetPlaceId"],
      'CREATE INDEX IF NOT EXISTS "idx_business_taggings_target_place_id" ON "BusinessTaggings" ("targetPlaceId");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "BusinessTaggings",
      ["createdAt"],
      'CREATE INDEX IF NOT EXISTS "idx_business_taggings_created_at" ON "BusinessTaggings" ("createdAt" DESC);',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "BusinessTaggings",
      ["taggerUserId", "targetPlaceId"],
      'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_business_taggings_user_target" ON "BusinessTaggings" ("taggerUserId", "targetPlaceId") WHERE "taggerUserId" IS NOT NULL;',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "BusinessTaggings",
      ["taggerBusinessId", "targetPlaceId"],
      'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_business_taggings_business_target" ON "BusinessTaggings" ("taggerBusinessId", "targetPlaceId") WHERE "taggerBusinessId" IS NOT NULL;',
    );

    if (await hasColumns(queryInterface, "BusinessTaggings", ["taggerUserId", "taggerBusinessId"])) {
      await queryInterface.sequelize.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_business_taggings_one_tagger'
  ) THEN
    ALTER TABLE "BusinessTaggings"
    ADD CONSTRAINT "chk_business_taggings_one_tagger"
    CHECK (
      (CASE WHEN "taggerUserId" IS NULL THEN 0 ELSE 1 END) +
      (CASE WHEN "taggerBusinessId" IS NULL THEN 0 ELSE 1 END) = 1
    );
  END IF;
END $$;
`);
    }

    await createIndexIfColumnsExist(
      queryInterface,
      "BusinessPromotionTemplates",
      ["businessId"],
      'CREATE INDEX IF NOT EXISTS "idx_business_promotion_templates_business" ON "BusinessPromotionTemplates" ("businessId");',
    );
    await createIndexIfColumnsExist(
      queryInterface,
      "BusinessPromotionTemplates",
      ["businessId", "createdAt"],
      'CREATE INDEX IF NOT EXISTS "idx_business_promotion_templates_business_created" ON "BusinessPromotionTemplates" ("businessId", "createdAt" DESC);',
    );
  },

  down: async () => {
    // no-op: baseline schema migration should not drop production data
  },
};
