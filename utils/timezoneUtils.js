const DEFAULT_TIMEZONE = "UTC";
const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const isValidTimezone = (timezone) => {
  if (!timezone || typeof timezone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch (error) {
    return false;
  }
};

const normalizeTimezone = (timezone, fallback = DEFAULT_TIMEZONE) => {
  const candidate = String(timezone || "")
    .trim();
  if (isValidTimezone(candidate)) return candidate;
  return isValidTimezone(fallback) ? fallback : DEFAULT_TIMEZONE;
};

const normalizeDateOnly = (value) => {
  if (!value) return null;

  const raw = String(value).trim();
  const match = raw.match(DATE_ONLY_REGEX);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeTime = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  const match = raw.match(TIME_REGEX);
  if (!match) return null;
  const hours = match[1];
  const minutes = match[2];
  const seconds = match[3] || "00";
  return `${hours}:${minutes}:${seconds}`;
};

const getDateTimePartsForTimezone = (date, timezone) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

const getTimezoneOffsetMs = (timezone, date) => {
  const parts = getDateTimePartsForTimezone(date, timezone);
  const asUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtcMs - date.getTime();
};

const zonedDateTimeToUtc = ({ date, time, timezone }) => {
  const normalizedDate = normalizeDateOnly(date);
  const normalizedTime = normalizeTime(time);
  const normalizedTimezone = normalizeTimezone(timezone);

  if (!normalizedDate || !normalizedTime) return null;

  const [year, month, day] = normalizedDate.split("-").map(Number);
  const [hour, minute, second] = normalizedTime.split(":").map(Number);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second || 0);
  const initial = new Date(utcGuess);
  const offsetMs = getTimezoneOffsetMs(normalizedTimezone, initial);
  let result = new Date(utcGuess - offsetMs);

  const adjustedOffsetMs = getTimezoneOffsetMs(normalizedTimezone, result);
  if (adjustedOffsetMs !== offsetMs) {
    result = new Date(utcGuess - adjustedOffsetMs);
  }

  if (Number.isNaN(result.getTime())) return null;
  return result;
};

const buildUtcWindow = ({
  runDate,
  stopDate,
  runTime,
  stopTime,
  timezone,
}) => {
  const normalizedRunDate = normalizeDateOnly(runDate);
  const normalizedStopDate = normalizeDateOnly(stopDate);
  const normalizedRunTime = normalizeTime(runTime);
  const normalizedStopTime = normalizeTime(stopTime);
  const normalizedTimezone = normalizeTimezone(timezone);

  if (
    !normalizedRunDate ||
    !normalizedStopDate ||
    !normalizedRunTime ||
    !normalizedStopTime
  ) {
    return null;
  }

  const startAt = zonedDateTimeToUtc({
    date: normalizedRunDate,
    time: normalizedRunTime,
    timezone: normalizedTimezone,
  });

  const endAt = zonedDateTimeToUtc({
    date: normalizedStopDate,
    time: normalizedStopTime,
    timezone: normalizedTimezone,
  });

  if (!startAt || !endAt) return null;

  return {
    runDate: normalizedRunDate,
    stopDate: normalizedStopDate,
    runTime: normalizedRunTime,
    stopTime: normalizedStopTime,
    timezone: normalizedTimezone,
    startAt,
    endAt,
  };
};

module.exports = {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
  normalizeDateOnly,
  normalizeTime,
  zonedDateTimeToUtc,
  buildUtcWindow,
  isValidTimezone,
};
