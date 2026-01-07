const { calculatePrice } = require("./utils/calculatePrice");

console.log("=== TESTING PRICING CALCULATIONS ===\n");

// Online Store Tests
console.log("--- ONLINE STORE (online-ecommerce) ---\n");

const test1 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  states: ["CA"],
  timezones: [],
  businessType: "online-ecommerce",
});
console.log("Test 1: 1 state, 0 timezones");
console.log("Expected: $10");
console.log("Result:", test1);
console.log("");

const test2 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  states: ["CA", "NY", "TX"],
  timezones: [],
  businessType: "online-ecommerce",
});
console.log("Test 2: 3 states, 0 timezones");
console.log("Expected: $30 ($10 base + $20 additional states)");
console.log("Result:", test2);
console.log("");

const test3 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  states: ["CA"],
  timezones: ["Pacific", "Mountain"],
  businessType: "online-ecommerce",
});
console.log("Test 3: 1 state, 2 timezones (non-Eastern)");
console.log("Expected: $70 ($10 + $60 timezones)");
console.log("Result:", test3);
console.log("");

const test4 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  states: ["CA", "NY"],
  timezones: ["Eastern"],
  businessType: "online-ecommerce",
});
console.log("Test 4: 2 states, 1 timezone (Eastern)");
console.log("Expected: $70 ($10 base + $10 state + $50 Eastern)");
console.log("Result:", test4);
console.log("");

// Physical Location Tests
console.log("--- PHYSICAL LOCATION (small/medium/large) ---\n");

const test5 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  cities: ["NYC", "LA"],
  states: [],
  timezones: [],
  businessType: "small",
});
console.log("Test 5: 2 cities, 0 states, 0 timezones");
console.log("Expected: $10 (Starter plan)");
console.log("Result:", test5);
console.log("");

const test6 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  cities: [],
  states: ["CA"],
  timezones: [],
  businessType: "medium",
});
console.log("Test 6: 1 state, 0 timezones");
console.log("Expected: $20 (no $10 starter)");
console.log("Result:", test6);
console.log("");

const test7 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  cities: [],
  states: ["CA", "NY"],
  timezones: [],
  businessType: "large",
});
console.log("Test 7: 2 states, 0 timezones");
console.log("Expected: $40 (2 × $20)");
console.log("Result:", test7);
console.log("");

const test8 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  cities: [],
  states: [],
  timezones: ["Pacific", "Mountain"],
  businessType: "small",
});
console.log("Test 8: 0 states, 2 timezones (non-Eastern)");
console.log("Expected: $130 ($10 starter + $120 timezones)");
console.log("Result:", test8);
console.log("");

const test9 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-03-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 1,
  cities: [],
  states: ["CA"],
  timezones: ["Eastern"],
  businessType: "medium",
});
console.log("Test 9: 1 state, 1 timezone (Eastern)");
console.log("Expected: $120 ($20 state + $100 Eastern)");
console.log("Result:", test9);
console.log("");

const test10 = calculatePrice({
  runDate: "2026-02-01",
  stopDate: "2026-05-01",
  runTime: "09:00",
  stopTime: "17:00",
  months: 3,
  cities: [],
  states: ["CA", "NY"],
  timezones: ["Pacific", "Mountain"],
  businessType: "large",
});
console.log("Test 10: 2 states, 2 timezones, 3 months");
console.log("Expected: $600 (($40 states + $120 timezones) × 3 months)");
console.log("Result:", test10);
console.log("");

console.log("=== TESTS COMPLETE ===");
