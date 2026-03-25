/**
 * Calculate promotion price based on selected locations and schedule.
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
}) => {
  try {
    let baseCost = 0;
    let stateCost = 0;
    let timezoneCost = 0;

    // Check if Eastern timezone is selected
    const hasEasternTimezone = timezones.some((tz) =>
      tz.toLowerCase().includes("eastern")
    );

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
