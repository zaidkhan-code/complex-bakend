const { Op } = require("sequelize");
const Promotion = require("../models/Promotion");
const {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
  normalizeDateOnly,
  normalizeTime,
  buildUtcWindow,
} = require("./timezoneUtils");

const SCHEDULE_CONFLICT_CODE = "SCHEDULE_CONFLICT";
const SCHEDULE_ALLOWED_STATUSES = ["pending", "inactive", "active"];

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return defaultValue;
};

const extractTimezoneCandidate = (value) => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    return String(value.timezone || value.value || value.name || "").trim();
  }
  return "";
};

const resolveScheduleTimezone = ({
  scheduleTimezone,
  ownerTimezone,
  actorTimezone,
}) => {
  const explicitTimezone = extractTimezoneCandidate(scheduleTimezone);
  if (explicitTimezone) {
    return normalizeTimezone(explicitTimezone, DEFAULT_TIMEZONE);
  }

  const actorResolved = extractTimezoneCandidate(actorTimezone);
  if (actorResolved) {
    return normalizeTimezone(actorResolved, DEFAULT_TIMEZONE);
  }

  const ownerResolved = extractTimezoneCandidate(ownerTimezone);
  if (ownerResolved) {
    return normalizeTimezone(ownerResolved, DEFAULT_TIMEZONE);
  }

  return normalizeTimezone(DEFAULT_TIMEZONE);
};

const parseDateTimeInput = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildSchedulePayload = ({
  runDate,
  stopDate,
  runTime,
  stopTime,
  scheduleTimezone,
  scheduleStartAt,
  scheduleEndAt,
}) => {
  const normalizedRunDate = normalizeDateOnly(runDate);
  const normalizedStopDate = normalizeDateOnly(stopDate);
  const normalizedRunTime = normalizeTime(runTime);
  const normalizedStopTime = normalizeTime(stopTime);
  let normalizedScheduleTimezone = normalizeTimezone(
    scheduleTimezone,
    DEFAULT_TIMEZONE,
  );

  if (
    !normalizedRunDate ||
    !normalizedStopDate ||
    !normalizedRunTime ||
    !normalizedStopTime
  ) {
    return null;
  }

  const hasExplicitStartAt =
    scheduleStartAt !== undefined && scheduleStartAt !== null && scheduleStartAt !== "";
  const hasExplicitEndAt =
    scheduleEndAt !== undefined && scheduleEndAt !== null && scheduleEndAt !== "";
  const explicitStartAt = parseDateTimeInput(scheduleStartAt);
  const explicitEndAt = parseDateTimeInput(scheduleEndAt);

  let nextScheduleStartAt = explicitStartAt;
  let nextScheduleEndAt = explicitEndAt;

  if (hasExplicitStartAt || hasExplicitEndAt) {
    if (!nextScheduleStartAt || !nextScheduleEndAt) {
      return null;
    }
  } else {
    const utcWindow = buildUtcWindow({
      runDate: normalizedRunDate,
      stopDate: normalizedStopDate,
      runTime: normalizedRunTime,
      stopTime: normalizedStopTime,
      timezone: normalizedScheduleTimezone,
    });

    if (!utcWindow) {
      return null;
    }

    normalizedScheduleTimezone = utcWindow.timezone;
    nextScheduleStartAt = utcWindow.startAt;
    nextScheduleEndAt = utcWindow.endAt;
  }

  return {
    runDate: normalizedRunDate,
    stopDate: normalizedStopDate,
    runTime: normalizedRunTime,
    stopTime: normalizedStopTime,
    scheduleTimezone: normalizedScheduleTimezone,
    scheduleStartAt: nextScheduleStartAt,
    scheduleEndAt: nextScheduleEndAt,
  };
};

const ensureValidScheduleWindow = (schedulePayload) => {
  if (!schedulePayload?.scheduleStartAt || !schedulePayload?.scheduleEndAt) {
    const error = new Error(
      "Invalid schedule values. Please provide valid start/end date and time.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (schedulePayload.scheduleStartAt >= schedulePayload.scheduleEndAt) {
    const error = new Error("Schedule end must be later than schedule start.");
    error.statusCode = 400;
    throw error;
  }
};

const buildScheduleConflictMessage = (conflictPromotion) => {
  return `Schedule conflict with promotion ${conflictPromotion.id}. Existing schedule (start: ${conflictPromotion.runDate} ${String(
    conflictPromotion.runTime || "",
  ).slice(0, 5)}, end: ${conflictPromotion.stopDate} ${String(
    conflictPromotion.stopTime || "",
  ).slice(0, 5)}) overlaps this request. Please update that promotion schedule first.`;
};

const ensureNoScheduledOverlap = async ({
  businessId,
  scheduleStartAt,
  scheduleEndAt,
  excludePromotionId = null,
}) => {
  const where = {
    businessId,
    scheduleEnabled: true,
    status: { [Op.in]: SCHEDULE_ALLOWED_STATUSES },
    scheduleStartAt: { [Op.lt]: scheduleEndAt },
    scheduleEndAt: { [Op.gt]: scheduleStartAt },
  };

  if (excludePromotionId) {
    where.id = { [Op.ne]: excludePromotionId };
  }

  const conflict = await Promotion.findOne({
    where,
    attributes: [
      "id",
      "runDate",
      "stopDate",
      "runTime",
      "stopTime",
      "scheduleTimezone",
    ],
    order: [["scheduleStartAt", "ASC"]],
  });

  if (!conflict) return;

  const error = new Error(buildScheduleConflictMessage(conflict));
  error.code = SCHEDULE_CONFLICT_CODE;
  error.statusCode = 409;
  error.conflictPromotionId = conflict.id;
  throw error;
};

const getPromotionLifecycleByNow = (promotion, now = new Date()) => {
  if (!promotion?.scheduleEnabled) {
    return {
      shouldExpire: false,
      shouldActivate: false,
      shouldDeactivate: false,
    };
  }

  if (!promotion.scheduleStartAt || !promotion.scheduleEndAt) {
    return {
      shouldExpire: false,
      shouldActivate: false,
      shouldDeactivate: false,
    };
  }

  const startAt = new Date(promotion.scheduleStartAt);
  const endAt = new Date(promotion.scheduleEndAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return {
      shouldExpire: false,
      shouldActivate: false,
      shouldDeactivate: false,
    };
  }

  if (now >= endAt) {
    return {
      shouldExpire: true,
      shouldActivate: false,
      shouldDeactivate: false,
    };
  }

  if (now < startAt) {
    return {
      shouldExpire: false,
      shouldActivate: false,
      shouldDeactivate: promotion.status === "active",
    };
  }

  const isApproved = promotion.status !== "pending";
  const isPaid = promotion.paymentStatus === "completed";

  return {
    shouldExpire: false,
    shouldActivate: isApproved && isPaid && promotion.status !== "active",
    shouldDeactivate: false,
  };
};

module.exports = {
  SCHEDULE_CONFLICT_CODE,
  parseBoolean,
  resolveScheduleTimezone,
  buildSchedulePayload,
  ensureValidScheduleWindow,
  ensureNoScheduledOverlap,
  getPromotionLifecycleByNow,
};
