const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Businesses',
      key: 'id'
    }
  },
  templateId: {
    type: DataTypes.UUID,
    references: {
      model: 'Templates',
      key: 'id'
    }
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  text: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of text objects with content, x, y, color, fontSize'
  },
  category: {
    type: DataTypes.STRING
  },
  city: {
    type: DataTypes.STRING
  },
  state: {
    type: DataTypes.STRING
  },
  runDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  stopDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  runTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  stopTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  month: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 12
    }
  },
  timezone: {
    type: DataTypes.STRING
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending'),
    defaultValue: 'pending'
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  stripePaymentId: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true
});

module.exports = Promotion;