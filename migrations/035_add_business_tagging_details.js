const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    // Keep this migration idempotent and avoid a long-lived explicit transaction.
    const table = await queryInterface.describeTable("BusinessTaggings");

    if (!table.targetIconMaskBaseUri) {
      await queryInterface.addColumn("BusinessTaggings", "targetIconMaskBaseUri", {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Google Places icon_mask_base_uri (cached at tag time)",
      });
    }

    if (!table.targetIconBackgroundColor) {
      await queryInterface.addColumn(
        "BusinessTaggings",
        "targetIconBackgroundColor",
        {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment: "Google Places icon_background_color (cached at tag time)",
        },
      );
    }

    if (!table.targetPrimaryPhotoUrl) {
      await queryInterface.addColumn("BusinessTaggings", "targetPrimaryPhotoUrl", {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Primary photo URL generated from Places photo (cached at tag time)",
      });
    }

    if (!table.targetRating) {
      await queryInterface.addColumn("BusinessTaggings", "targetRating", {
        type: DataTypes.DOUBLE,
        allowNull: true,
        comment: "Google Places rating (cached at tag time)",
      });
    }

    if (!table.targetUserRatingsTotal) {
      await queryInterface.addColumn("BusinessTaggings", "targetUserRatingsTotal", {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Google Places user_ratings_total (cached at tag time)",
      });
    }

    if (!table.targetWebsite) {
      await queryInterface.addColumn("BusinessTaggings", "targetWebsite", {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Google Places website (cached at tag time)",
      });
    }

    if (!table.targetGoogleUrl) {
      await queryInterface.addColumn("BusinessTaggings", "targetGoogleUrl", {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Google Places url (cached at tag time)",
      });
    }

    if (!table.targetFormattedPhoneNumber) {
      await queryInterface.addColumn(
        "BusinessTaggings",
        "targetFormattedPhoneNumber",
        {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "Google Places formatted_phone_number (cached at tag time)",
        },
      );
    }

    if (!table.targetInternationalPhoneNumber) {
      await queryInterface.addColumn(
        "BusinessTaggings",
        "targetInternationalPhoneNumber",
        {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "Google Places international_phone_number (cached at tag time)",
        },
      );
    }

    if (!table.targetTypes) {
      await queryInterface.addColumn("BusinessTaggings", "targetTypes", {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Google Places types array (cached at tag time)",
      });
    }

    if (!table.targetReviews) {
      await queryInterface.addColumn("BusinessTaggings", "targetReviews", {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Google Places reviews array (cached at tag time, trimmed)",
      });
    }

    if (!table.detailsFetchedAt) {
      await queryInterface.addColumn("BusinessTaggings", "detailsFetchedAt", {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When Places details were last cached for this tagging",
      });
    }

    if (!table.targetEmail) {
      await queryInterface.addColumn("BusinessTaggings", "targetEmail", {
        type: DataTypes.STRING(320),
        allowNull: true,
        comment:
          "Optional contact email (NOT provided by Google Places; can be set by admin/manual)",
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("BusinessTaggings");

    const maybeRemove = async (column) => {
      if (table[column]) {
        await queryInterface.removeColumn("BusinessTaggings", column);
      }
    };

    await maybeRemove("targetIconMaskBaseUri");
    await maybeRemove("targetIconBackgroundColor");
    await maybeRemove("targetPrimaryPhotoUrl");
    await maybeRemove("targetRating");
    await maybeRemove("targetUserRatingsTotal");
    await maybeRemove("targetWebsite");
    await maybeRemove("targetGoogleUrl");
    await maybeRemove("targetFormattedPhoneNumber");
    await maybeRemove("targetInternationalPhoneNumber");
    await maybeRemove("targetTypes");
    await maybeRemove("targetReviews");
    await maybeRemove("detailsFetchedAt");
    await maybeRemove("targetEmail");
  },
};

