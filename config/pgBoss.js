const PgBoss = require("pg-boss");

let boss = null;
let isStarted = false;

const startPgBoss = async () => {
  if (isStarted && boss) return boss;

  if (!process.env.DATABASE_URL) {
    console.warn("pg-boss not started: DATABASE_URL is not configured");
    return null;
  }

  const monitorStateIntervalSeconds = Math.max(
    1,
    Number(process.env.PG_BOSS_MONITOR_INTERVAL_SECONDS || 30),
  );

  boss = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    schema: process.env.PG_BOSS_SCHEMA || "pgboss",
    monitorStateIntervalSeconds,
    archiveCompletedAfterSeconds: 24 * 60 * 60,
    deleteAfterDays: 3,
  });

  boss.on("error", (error) => {
    console.error("pg-boss error:", error);
  });

  await boss.start();
  isStarted = true;
  console.log("pg-boss started");
  return boss;
};

const getPgBoss = () => boss;

const stopPgBoss = async () => {
  if (!boss) return;
  try {
    await boss.stop();
    console.log("pg-boss stopped");
  } catch (error) {
    console.error("Failed to stop pg-boss:", error);
  } finally {
    boss = null;
    isStarted = false;
  }
};

module.exports = {
  startPgBoss,
  getPgBoss,
  stopPgBoss,
};
