const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Wishlists", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      businessId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "Businesses",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      promotionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Promotions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      status: {
        type: DataTypes.ENUM("active", "removed"),
        defaultValue: "active",
      },
      savedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("Wishlists", ["userId"], {
      name: "idx_wishlist_user_id",
    });
    await queryInterface.addIndex("Wishlists", ["businessId"], {
      name: "idx_wishlist_business_id",
    });
    await queryInterface.addIndex("Wishlists", ["promotionId"], {
      name: "idx_wishlist_promotion_id",
    });
    await queryInterface.addIndex("Wishlists", ["status"], {
      name: "idx_wishlist_status",
    });
    await queryInterface.addIndex("Wishlists", ["userId", "promotionId"], {
      name: "unique_user_promotion",
      unique: true,
      where: { userId: { [Sequelize.Op.ne]: null } },
    });
    await queryInterface.addIndex("Wishlists", ["businessId", "promotionId"], {
      name: "unique_business_promotion",
      unique: true,
      where: { businessId: { [Sequelize.Op.ne]: null } },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Wishlists");
  },
};
