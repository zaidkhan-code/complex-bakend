/**
 * Migration: Create Base Tables
 * Description: Creates the initial database schema with User, Business, Promotion, and Template models
 * Direction: UP
 */

module.exports = {
  up: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log("🔄 Creating base tables...");

      // Create Users table
      await queryInterface.createTable("Users", {
        id: {
          type: sequelize.Sequelize.UUID,
          defaultValue: sequelize.Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
        },
        email: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
        },
        phone: {
          type: sequelize.Sequelize.STRING,
        },
        role: {
          type: sequelize.Sequelize.ENUM("customer", "admin"),
          defaultValue: "customer",
        },
        isVerified: {
          type: sequelize.Sequelize.BOOLEAN,
          defaultValue: false,
        },
        createdAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
        updatedAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
      });

      // Create Businesses table
      await queryInterface.createTable("Businesses", {
        id: {
          type: sequelize.Sequelize.UUID,
          defaultValue: sequelize.Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
        },
        email: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
        },
        phone: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
        },
        businessType: {
          type: sequelize.Sequelize.ENUM(
            "small",
            "medium",
            "large",
            "online-ecommerce"
          ),
          defaultValue: "small",
        },
        state: {
          type: sequelize.Sequelize.STRING,
        },
        isBlocked: {
          type: sequelize.Sequelize.BOOLEAN,
          defaultValue: false,
        },
        createdAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
        updatedAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
      });

      // Create Templates table
      await queryInterface.createTable("Templates", {
        id: {
          type: sequelize.Sequelize.UUID,
          defaultValue: sequelize.Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
        },
        image: {
          type: sequelize.Sequelize.STRING,
        },
        description: {
          type: sequelize.Sequelize.TEXT,
        },
        createdAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
        updatedAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
      });

      // Create Promotions table
      await queryInterface.createTable("Promotions", {
        id: {
          type: sequelize.Sequelize.UUID,
          defaultValue: sequelize.Sequelize.UUIDV4,
          primaryKey: true,
        },
        businessId: {
          type: sequelize.Sequelize.UUID,
          allowNull: false,
          references: {
            model: "Businesses",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        templateId: {
          type: sequelize.Sequelize.UUID,
          references: {
            model: "Templates",
            key: "id",
          },
        },
        imageUrl: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
        },
        text: {
          type: sequelize.Sequelize.JSONB,
          defaultValue: [],
        },
        category: {
          type: sequelize.Sequelize.STRING,
        },
        cities: {
          type: sequelize.Sequelize.JSONB,
          defaultValue: [],
        },
        states: {
          type: sequelize.Sequelize.JSONB,
          defaultValue: [],
        },
        runDate: {
          type: sequelize.Sequelize.DATEONLY,
          allowNull: false,
        },
        stopDate: {
          type: sequelize.Sequelize.DATEONLY,
          allowNull: false,
        },
        runTime: {
          type: sequelize.Sequelize.TIME,
          allowNull: false,
        },
        stopTime: {
          type: sequelize.Sequelize.TIME,
          allowNull: false,
        },
        calculatedMonths: {
          type: sequelize.Sequelize.INTEGER,
          defaultValue: 1,
        },
        timezones: {
          type: sequelize.Sequelize.JSONB,
          defaultValue: [],
        },
        price: {
          type: sequelize.Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        views: {
          type: sequelize.Sequelize.INTEGER,
          defaultValue: 0,
        },
        clicks: {
          type: sequelize.Sequelize.INTEGER,
          defaultValue: 0,
        },
        stripePaymentId: {
          type: sequelize.Sequelize.STRING,
        },
        createdAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
        updatedAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
      });

      console.log("✅ Base tables created successfully!");
    } catch (error) {
      console.error("❌ Error creating base tables:", error);
      throw error;
    }
  },

  down: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log("🔄 Dropping base tables...");
      await queryInterface.dropTable("Promotions");
      await queryInterface.dropTable("Businesses");
      await queryInterface.dropTable("Templates");
      await queryInterface.dropTable("Users");
      console.log("✅ Base tables dropped successfully!");
    } catch (error) {
      console.error("❌ Error dropping base tables:", error);
      throw error;
    }
  },
};
