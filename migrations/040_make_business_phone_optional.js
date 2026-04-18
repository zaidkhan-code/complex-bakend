'use strict';

/**
 * Migration: Make business phone number optional
 * 
 * This migration changes the phone column in Businesses table
 * from NOT NULL to allow NULL values.
 * 
 * Run with: node scripts/migrate.js
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('[MIGRATION] Making business phone number optional...');
    
    try {
      await queryInterface.changeColumn('Businesses', 'phone', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      
      console.log('[MIGRATION] ✅ Successfully made phone column nullable');
    } catch (error) {
      console.error('[MIGRATION] ❌ Error making phone column nullable:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('[MIGRATION] Rolling back: Making business phone required again...');
    
    try {
      await queryInterface.changeColumn('Businesses', 'phone', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      });
      
      console.log('[MIGRATION] ✅ Successfully rolled back phone column to NOT NULL');
    } catch (error) {
      console.error('[MIGRATION] ❌ Error rolling back phone column:', error);
      throw error;
    }
  },
};
