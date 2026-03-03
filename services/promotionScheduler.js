const { Op } = require("sequelize");
const Promotion = require("../models/Promotion");
const { sequelize } = require("../config/db");
const { getPgBoss } = require("../config/pgBoss");
const {
  getPromotionLifecycleByNow,
} = require("../utils/promotionScheduleUtils");

const JOB_PROMOTION_ACTIVATE = "promotion.schedule.activate";
const JOB_PROMOTION_EXPIRE = "promotion.schedule.expire";

let workersRegistered = false;

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDatabaseNow = async () => {
  try {
    const [rows] = await sequelize.query(
      'SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint AS "nowUtcMs";',
    );
    const nowUtcMs = Number(rows?.[0]?.nowUtcMs);

    if (Number.isFinite(nowUtcMs)) {
      console.log(
        `Database now (UTC): ${new Date(nowUtcMs).toISOString()}`,
        nowUtcMs,
      );
      return new Date(nowUtcMs);
    }

    return new Date();
  } catch (error) {
    return new Date();
  }
};

const clearStoredJobIds = async (promotion) => {
  if (!promotion) return;
  if (!promotion.activationJobId && !promotion.expirationJobId) return;

  promotion.activationJobId = null;
  promotion.expirationJobId = null;
  await promotion.save({
    fields: ["activationJobId", "expirationJobId", "updatedAt"],
  });
};

const cancelJobSafe = async (jobId) => {
  if (!jobId) return;
  const boss = getPgBoss();
  if (!boss) return;

  try {
    await boss.cancel(jobId);
  } catch (error) {
    // Ignore missing/finished jobs.
  }
};

const cancelPromotionJobs = async (
  promotionOrId,
  { clearFields = true } = {},
) => {
  const promotion =
    typeof promotionOrId === "string"
      ? await Promotion.findByPk(promotionOrId)
      : promotionOrId;

  if (!promotion) return null;

  await cancelJobSafe(promotion.activationJobId);
  await cancelJobSafe(promotion.expirationJobId);

  if (clearFields) {
    await clearStoredJobIds(promotion);
  }

  return promotion;
};

const setPromotionActiveNow = async (promotion, now = new Date()) => {
  await Promotion.update(
    { status: "inactive" },
    {
      where: {
        businessId: promotion.businessId,
        status: "active",
        id: { [Op.ne]: promotion.id },
      },
    },
  );

  promotion.status = "active";
  if (!promotion.approvedAt) promotion.approvedAt = now;
  await promotion.save({ fields: ["status", "approvedAt", "updatedAt"] });
};

const setPromotionExpiredNow = async (promotion) => {
  if (promotion.status === "expired") {
    await clearStoredJobIds(promotion);
    return;
  }

  promotion.status = "expired";
  promotion.activationJobId = null;
  promotion.expirationJobId = null;
  await promotion.save({
    fields: ["status", "activationJobId", "expirationJobId", "updatedAt"],
  });
};

const applyImmediateLifecycle = async (promotion, nowInput = null) => {
  if (!promotion?.scheduleEnabled) return promotion;

  const now = toDate(nowInput) || (await getDatabaseNow());
  const { shouldExpire, shouldActivate, shouldDeactivate } =
    getPromotionLifecycleByNow(promotion, now);

  if (shouldExpire) {
    await setPromotionExpiredNow(promotion);
    return promotion;
  }

  if (shouldDeactivate) {
    promotion.status = "inactive";
    await promotion.save({ fields: ["status", "updatedAt"] });
    return promotion;
  }

  if (shouldActivate) {
    await setPromotionActiveNow(promotion, now);
  }

  return promotion;
};

const scheduleJob = async (jobName, promotionId, startAfter) => {
  const boss = getPgBoss();
  if (!boss) {
    console.warn(
      `pg-boss is not available while scheduling ${jobName} for promotion ${promotionId}`,
    );
    return null;
  }

  const existingQueue = await boss.getQueue(jobName);
  if (!existingQueue) {
    await boss.createQueue(jobName);
  }

  const options = {};
  if (startAfter instanceof Date && !Number.isNaN(startAfter.getTime())) {
    options.startAfter = startAfter;
  }

  let jobId = await boss.send(jobName, { promotionId }, options);
  if (!jobId) {
    await boss.createQueue(jobName);
    jobId = await boss.send(jobName, { promotionId }, options);
  }

  if (!jobId) {
    console.warn(
      `Failed to schedule ${jobName} for promotion ${promotionId}. startAfter=${options.startAfter || "immediate"} returned null jobId`,
    );
  }

  return jobId || null;
};

const reschedulePromotionJobs = async (promotionOrId) => {
  const promotion =
    typeof promotionOrId === "string"
      ? await Promotion.findByPk(promotionOrId)
      : promotionOrId;

  if (!promotion) return null;

  await cancelPromotionJobs(promotion, { clearFields: false });

  const scheduleStartAt = toDate(promotion.scheduleStartAt);
  const scheduleEndAt = toDate(promotion.scheduleEndAt);
  if (
    !promotion.scheduleEnabled ||
    !scheduleStartAt ||
    !scheduleEndAt ||
    promotion.status === "expired"
  ) {
    await clearStoredJobIds(promotion);
    return promotion;
  }

  const now = await getDatabaseNow();
  await applyImmediateLifecycle(promotion, now);
  if (promotion.status === "expired") {
    return promotion;
  }

  let activationJobId = null;
  let expirationJobId = null;

  if (scheduleStartAt > now) {
    activationJobId = await scheduleJob(
      JOB_PROMOTION_ACTIVATE,
      promotion.id,
      scheduleStartAt,
    );
    console.log(
      `start ${promotion.id} at ${scheduleStartAt} with job ID ${activationJobId}`,
    );
  }

  if (scheduleEndAt > now) {
    expirationJobId = await scheduleJob(
      JOB_PROMOTION_EXPIRE,
      promotion.id,
      scheduleEndAt,
    );
    console.log(
      `end ${promotion.id} at ${scheduleEndAt} with job ID ${expirationJobId}`,
    );
  } else {
    await setPromotionExpiredNow(promotion);
    return promotion;
  }

  console.log(
    `Scheduled promotion ${promotion.id} with activation job ${activationJobId} and expiration job ${expirationJobId}`,
  );

  promotion.activationJobId = activationJobId;
  promotion.expirationJobId = expirationJobId;
  await promotion.save({
    fields: ["activationJobId", "expirationJobId", "updatedAt"],
  });

  return promotion;
};

const handleActivationJob = async (job) => {
  const promotionId = job?.[0]?.data?.promotionId;
  console.log(`Handling activation job for promotion `, job);
  if (!promotionId) return;

  const promotion = await Promotion.findByPk(promotionId);
  if (!promotion) return;
  if (!promotion.scheduleEnabled) return;

  const now = await getDatabaseNow();
  await applyImmediateLifecycle(promotion, now);
  await reschedulePromotionJobs(promotion);
};

const handleExpirationJob = async (job) => {
  const promotionId = job?.[0]?.data?.promotionId;
  if (!promotionId) return;

  const promotion = await Promotion.findByPk(promotionId);
  if (!promotion) return;
  if (!promotion.scheduleEnabled) return;

  const now = await getDatabaseNow();
  await applyImmediateLifecycle(promotion, now);
  await reschedulePromotionJobs(promotion);
};

const registerPromotionScheduleWorkers = async () => {
  if (workersRegistered) return;

  const boss = getPgBoss();
  if (!boss) {
    console.warn(
      "pg-boss workers not registered because pg-boss is not running",
    );
    return;
  }

  await boss.createQueue(JOB_PROMOTION_ACTIVATE);
  await boss.createQueue(JOB_PROMOTION_EXPIRE);
  await boss.work(JOB_PROMOTION_ACTIVATE, handleActivationJob);
  await boss.work(JOB_PROMOTION_EXPIRE, handleExpirationJob);
  workersRegistered = true;
  console.log("pg-boss promotion workers registered");
};

module.exports = {
  JOB_PROMOTION_ACTIVATE,
  JOB_PROMOTION_EXPIRE,
  registerPromotionScheduleWorkers,
  reschedulePromotionJobs,
  cancelPromotionJobs,
  applyImmediateLifecycle,
};
