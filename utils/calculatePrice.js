const BASE_PRICE_PER_DAY = parseFloat(process.env.BASE_PRICE_PER_DAY) || 10;

/**
 * Get days in a specific month
 */
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

/**
 * Calculate the number of days between two dates
 */
const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  return diffDays;
};

/**
 * Calculate promotion price based on duration
 * @param {Object} params - Parameters for price calculation
 * @param {Date|string} params.runDate - Start date
 * @param {Date|string} params.stopDate - End date
 * @param {string} params.runTime - Start time (HH:MM format)
 * @param {string} params.stopTime - End time (HH:MM format)
 * @param {number} params.month - Month number (1-12) for month-specific pricing
 * @returns {number} - Calculated price
 */
const calculatePrice = ({ runDate, stopDate, runTime, stopTime, month }) => {
  try {
    const days = calculateDaysBetween(runDate, stopDate);
    
    let price = days * BASE_PRICE_PER_DAY;
    
    // Apply month-specific multiplier if provided
    if (month) {
      const year = new Date(runDate).getFullYear();
      const daysInMonth = getDaysInMonth(year, month);
      
      // Adjust price based on month length (shorter months = slightly higher per-day rate)
      if (daysInMonth === 28 || daysInMonth === 29) {
        price *= 1.1; // 10% increase for February
      } else if (daysInMonth === 30) {
        price *= 1.05; // 5% increase for 30-day months
      }
    }
    
    // Apply time-based adjustments
    const runHour = parseInt(runTime.split(':')[0]);
    const stopHour = parseInt(stopTime.split(':')[0]);
    
    // Peak hours (9 AM - 9 PM) get a 20% premium
    if ((runHour >= 9 && runHour <= 21) || (stopHour >= 9 && stopHour <= 21)) {
      price *= 1.2;
    }
    
    // Discount for longer durations
    if (days >= 30) {
      price *= 0.85; // 15% discount for 30+ days
    } else if (days >= 14) {
      price *= 0.9; // 10% discount for 14-29 days
    } else if (days >= 7) {
      price *= 0.95; // 5% discount for 7-13 days
    }
    
    return Math.round(price * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating price:', error);
    return BASE_PRICE_PER_DAY;
  }
};

module.exports = { calculatePrice, getDaysInMonth, calculateDaysBetween };