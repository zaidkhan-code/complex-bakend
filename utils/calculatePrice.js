/**
 * Calculate promotion price based on business category and selections
 *
 * PRICING RULES:
 *
 * Online Store (online-ecommerce):
 *   - Base: $10 (includes 1 state)
 *   - Additional states: $10 each
 *   - Timezones: $30 each (Eastern: $50)
 *   - Total = Base + Additional States + Timezones
 *
 * Physical Location (small, medium, large):
 *   - Base: $10 (includes 2 cities) - ONLY if no states selected
 *   - States: $20 each (replaces base when selected)
 *   - Timezones: $60 each (Eastern: $100)
 *   - Total = (Base OR States) + Timezones
 */

const calculatePrice = ({
  runDate,
  stopDate,
  runTime,
  stopTime,
  months,
  cities = [],
  states = [],
  timezones = [],
  businessType = "small", // 'online-ecommerce', 'small', 'medium', 'large'
}) => {
  try {
    const isOnlineStore = businessType === "online-ecommerce";

    let baseCost = 0;
    let stateCost = 0;
    let timezoneCost = 0;

    // Check if Eastern timezone is selected
    const hasEasternTimezone = timezones.some((tz) =>
      tz.toLowerCase().includes("eastern")
    );

    if (isOnlineStore) {
      // ===== ONLINE STORE PRICING =====

      // Base plan: $10 (includes 1 state)
      baseCost = 10;

      // Additional states: $10 each (beyond the first)
      const stateCount = states.length;
      if (stateCount > 1) {
        stateCost = (stateCount - 1) * 10;
      }

      // Timezones: $30 each, Eastern: $50
      if (timezones.length > 0) {
        if (hasEasternTimezone) {
          // Count non-Eastern timezones
          const nonEasternCount = timezones.filter(
            (tz) => !tz.toLowerCase().includes("eastern")
          ).length;
          timezoneCost = nonEasternCount * 30 + 50;
        } else {
          timezoneCost = timezones.length * 30;
        }
      }
    } else {
      // ===== PHYSICAL LOCATION PRICING =====

      const stateCount = states.length;

      if (stateCount > 0) {
        // If states selected: $20 per state (NO base $10)
        stateCost = stateCount * 20;
        baseCost = 0;
      } else {
        // No states: Starter plan $10 (includes 2 cities)
        baseCost = 10;
      }

      // Timezones: $60 each, Eastern: $100
      if (timezones.length > 0) {
        if (hasEasternTimezone) {
          // Count non-Eastern timezones
          const nonEasternCount = timezones.filter(
            (tz) => !tz.toLowerCase().includes("eastern")
          ).length;
          timezoneCost = nonEasternCount * 60 + 100;
        } else {
          timezoneCost = timezones.length * 60;
        }
      }
    }

    // Calculate subtotal (per month)
    const subtotal = baseCost + stateCost + timezoneCost;

    // Calculate total based on months
    const effectiveMonths = months || 1;
    const total = subtotal * effectiveMonths;

    return {
      subtotal,
      total,
      months: effectiveMonths,
      breakdown: {
        baseCost,
        stateCost,
        timezoneCost,
        stateCount: states.length,
        timezoneCount: timezones.length,
        hasEasternTimezone,
      },
    };
  } catch (error) {
    console.error("Error calculating price:", error);
    return {
      subtotal: 10,
      total: 10,
      months: 1,
      breakdown: {
        baseCost: 10,
        stateCost: 0,
        timezoneCost: 0,
      },
    };
  }
};

/**
 * Calculate the number of days between two dates
 */
const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

module.exports = { calculatePrice, calculateDaysBetween };
