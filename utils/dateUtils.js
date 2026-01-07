/**
 * Check if a promotion is currently active based on date and time
 */
const isPromotionActive = (promotion) => {
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const { runDate, stopDate, runTime, stopTime, status } = promotion;

  if (status !== "active") return false;

  // Check if current date is within range
  if (currentDate < runDate || currentDate > stopDate) return false;

  // If it's the start date, check if we've reached the start time
  if (currentDate === runDate && currentTime < runTime) return false;

  // If it's the end date, check if we've passed the end time
  if (currentDate === stopDate && currentTime > stopTime) return false;

  return true;
};

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get date range for statistics
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0); // Beginning of time
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(now),
  };
};

/**
 * Validate date range
 */
const isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

/**
 * Calculate number of months between two dates according to business rule:
 * - If the range equals exactly N month boundaries, count as N
 * - If there's any extra day beyond a month boundary it counts as an additional month
 * - Minimum return value is 1
 */
const calculateMonthsFromDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) return 0;

  const addMonths = (d, months) => {
    const nd = new Date(d.getTime());
    const day = nd.getDate();
    nd.setMonth(nd.getMonth() + months);
    // if month overflowed (e.g., Jan 31 + 1 month -> Mar 3), adjust to last day
    if (nd.getDate() < day) {
      nd.setDate(0); // go to last day of previous month
    }
    return nd;
  };

  let months = 0;
  // count how many full month boundaries from start fit inside range
  while (true) {
    const boundary = addMonths(start, months + 1);
    if (boundary <= end) {
      months += 1;
      continue;
    }
    break;
  }

  const lastBoundary = addMonths(start, months);
  if (end > lastBoundary) {
    months += 1;
  }

  if (months < 1) months = 1;
  return months;
};

module.exports = {
  isPromotionActive,
  formatDate,
  getDateRange,
  isValidDateRange,
};
