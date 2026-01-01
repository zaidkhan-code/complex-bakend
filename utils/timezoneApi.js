const axios = require('axios');

/**
 * Fetch timezone information for a given location
 * Uses timeapi.io as a free timezone API
 */
const getTimezone = async (city, state) => {
  try {
    // Using a simple timezone mapping for US states as a fallback
    const stateTimezones = {
      'AL': 'America/Chicago', 'AK': 'America/Anchorage', 'AZ': 'America/Phoenix',
      'AR': 'America/Chicago', 'CA': 'America/Los_Angeles', 'CO': 'America/Denver',
      'CT': 'America/New_York', 'DE': 'America/New_York', 'FL': 'America/New_York',
      'GA': 'America/New_York', 'HI': 'Pacific/Honolulu', 'ID': 'America/Denver',
      'IL': 'America/Chicago', 'IN': 'America/Indiana/Indianapolis', 'IA': 'America/Chicago',
      'KS': 'America/Chicago', 'KY': 'America/New_York', 'LA': 'America/Chicago',
      'ME': 'America/New_York', 'MD': 'America/New_York', 'MA': 'America/New_York',
      'MI': 'America/Detroit', 'MN': 'America/Chicago', 'MS': 'America/Chicago',
      'MO': 'America/Chicago', 'MT': 'America/Denver', 'NE': 'America/Chicago',
      'NV': 'America/Los_Angeles', 'NH': 'America/New_York', 'NJ': 'America/New_York',
      'NM': 'America/Denver', 'NY': 'America/New_York', 'NC': 'America/New_York',
      'ND': 'America/Chicago', 'OH': 'America/New_York', 'OK': 'America/Chicago',
      'OR': 'America/Los_Angeles', 'PA': 'America/New_York', 'RI': 'America/New_York',
      'SC': 'America/New_York', 'SD': 'America/Chicago', 'TN': 'America/Chicago',
      'TX': 'America/Chicago', 'UT': 'America/Denver', 'VT': 'America/New_York',
      'VA': 'America/New_York', 'WA': 'America/Los_Angeles', 'WV': 'America/New_York',
      'WI': 'America/Chicago', 'WY': 'America/Denver'
    };
    
    // Return timezone based on state code
    if (state && stateTimezones[state.toUpperCase()]) {
      return stateTimezones[state.toUpperCase()];
    }
    
    // Default to US Eastern if no match found
    return 'America/New_York';
  } catch (error) {
    console.error('Error fetching timezone:', error.message);
    return 'America/New_York'; // Default fallback
  }
};

/**
 * Convert time to specific timezone
 */
const convertToTimezone = (date, timezone) => {
  try {
    return new Date(date).toLocaleString('en-US', { timeZone: timezone });
  } catch (error) {
    console.error('Error converting timezone:', error.message);
    return date;
  }
};

module.exports = { getTimezone, convertToTimezone };