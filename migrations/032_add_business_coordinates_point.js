module.exports = {
  up: async (queryInterface) => {
    // Intentionally left as a no-op.
    // We only store `lat`/`lng` on Businesses now. Radius logic can be added later.
  },

  down: async (queryInterface) => {
    // no-op
  },
};
