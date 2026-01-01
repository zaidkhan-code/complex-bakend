/**
 * Check if a promotion is currently active based on date and time
 */
const isPromotionActive = (promotion) => {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);
  
  const { runDate, stopDate, runTime, stopTime, status } = promotion;
  
  if (status !== 'active') return false;
  
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
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get date range for statistics
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0); // Beginning of time
  }
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(now)
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

module.exports = {
  isPromotionActive,
  formatDate,
  getDateRange,
  isValidDateRange
};