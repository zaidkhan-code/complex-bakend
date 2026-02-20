const PromotionLocation = require("../models/PromotionLocation");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");

let stateNameColumnSupportCache = null;

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const hasStateNameColumn = async () => {
  if (stateNameColumnSupportCache !== null) {
    return stateNameColumnSupportCache;
  }

  try {
    const [rows] = await sequelize.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'PromotionLocations'
        AND column_name = 'state_name'
      LIMIT 1;
    `);

    stateNameColumnSupportCache = Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    stateNameColumnSupportCache = false;
  }

  return stateNameColumnSupportCache;
};

const getPromotionLocationAttributes = async () => {
  const attributes = [
    "id",
    "type",
    "country_code",
    "state_code",
    "state_name",
    "city_name",
    "county_name",
    "state_name",
    "timezone",
    "coordinates",
  ];

  return attributes;
};

const buildPointCoordinates = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [longitude, latitude],
  };
};

const buildPromotionLocationRows = ({
  promotionId,
  cities = [],
  states = [],
  timezones = [],
}) => {
  const rows = [];
  const uniqueKeys = new Set();

  const pushUnique = (row) => {
    const key = [
      row.promotionId,
      row.type,
      row.country_code || "",
      row.state_code || "",
      row.state_name || "",
      row.city_name || "",
      row.timezone || "",
    ].join("|");

    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      rows.push(row);
    }
  };

  for (const stateItem of Array.isArray(states) ? states : []) {
    if (!stateItem) continue;

    const stateCode = normalizeString(
      stateItem.state_code || stateItem.code || stateItem.stateCode,
    ).toUpperCase();
    const stateName = normalizeString(
      stateItem.state_name ||
        stateItem.state ||
        stateItem.name ||
        stateItem.stateName,
    );
    const countryCode = normalizeString(
      stateItem.country_code || stateItem.countryCode,
    ).toUpperCase();
    const coordinates = buildPointCoordinates(stateItem.lat, stateItem.lng);

    if (!stateCode && !countryCode) continue;

    pushUnique({
      promotionId,
      type: "state",
      country_code: countryCode || null,
      state_code: stateCode || null,
      state_name: stateName || null,
      city_name: null,
      county_name: null,
      timezone: null,
      coordinates,
    });
  }

  for (const cityItem of Array.isArray(cities) ? cities : []) {
    if (!cityItem) continue;

    const cityName = normalizeString(cityItem.name || cityItem.city_name);
    const countryCode = normalizeString(
      cityItem.country_code || cityItem.countryCode,
    ).toUpperCase();
    const stateCode = normalizeString(
      cityItem.state_code || cityItem.stateCode,
    ).toUpperCase();
    const stateName = normalizeString(
      cityItem.state_name || cityItem.state || cityItem.stateName,
    );
    const timezone = normalizeString(cityItem.timezone);
    const countyName = normalizeString(cityItem.county_name || cityItem.county);
    const coordinates = buildPointCoordinates(cityItem.lat, cityItem.lng);

    if (!cityName && !timezone && !countryCode && !stateCode) continue;

    pushUnique({
      promotionId,
      type: "city",
      country_code: countryCode || null,
      state_code: stateCode || null,
      state_name: stateName || null,
      city_name: cityName || null,
      county_name: countyName || null,
      timezone: timezone || null,
      coordinates,
    });
  }

  for (const timezoneItem of Array.isArray(timezones) ? timezones : []) {
    const timezoneValue = normalizeString(
      typeof timezoneItem === "string"
        ? timezoneItem
        : timezoneItem?.timezone || timezoneItem?.value || timezoneItem?.name,
    );

    if (!timezoneValue) continue;

    pushUnique({
      promotionId,
      type: "timezone",
      country_code: null,
      state_code: null,
      state_name: null,
      city_name: null,
      county_name: null,
      timezone: timezoneValue,
      coordinates: null,
    });
  }

  return rows;
};

const syncPromotionLocations = async ({
  promotionId,
  cities = [],
  states = [],
  timezones = [],
  transaction,
}) => {
  const rows = buildPromotionLocationRows({
    promotionId,
    cities,
    states,
    timezones,
  });
  const supportsStateName = await hasStateNameColumn();
  const rowsToInsert = supportsStateName
    ? rows
    : rows.map(({ state_name, ...rest }) => rest);

  await PromotionLocation.destroy({ where: { promotionId }, transaction });

  if (rowsToInsert.length) {
    await PromotionLocation.bulkCreate(rowsToInsert, {
      transaction,
      ignoreDuplicates: true,
    });
  }
};

const findPromotionIdsByLocation = async ({
  country_code,
  state,
  city,
  timezone,
}) => {
  const whereParts = [];
  const normalizedCountry = normalizeString(country_code).toUpperCase();
  const normalizedState = normalizeString(state).toUpperCase();
  const normalizedCity = normalizeString(city);
  const normalizedTimezone = normalizeString(timezone);

  if (normalizedCountry) {
    whereParts.push({ country_code: normalizedCountry });
  }

  if (normalizedState) {
    whereParts.push({ state_code: normalizedState });
    if (await hasStateNameColumn()) {
      whereParts.push({ state_name: { [Op.iLike]: normalizedState } });
    }
  }

  if (normalizedCity) {
    whereParts.push({
      city_name: { [Op.iLike]: normalizedCity },
    });
  }

  if (normalizedTimezone) {
    whereParts.push({
      timezone: { [Op.iLike]: normalizedTimezone },
    });
  }

  if (!whereParts.length) {
    return [];
  }

  const rows = await PromotionLocation.findAll({
    attributes: ["promotionId"],
    where: { [Op.or]: whereParts },
    raw: true,
  });

  return [...new Set(rows.map((row) => row.promotionId).filter(Boolean))];
};

module.exports = {
  syncPromotionLocations,
  findPromotionIdsByLocation,
  getPromotionLocationAttributes,
  hasStateNameColumn,
};
