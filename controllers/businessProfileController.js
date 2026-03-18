const { Op } = require("sequelize");
const Business = require("../models/Business");
const { uploadImageToCloudinary } = require("../utils/cloudinaryUtils");

const parseCategories = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 2);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 2);
      }
    } catch (_) {
      // ignore parse failure and fallback to comma split
    }

    return trimmed
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 2);
  }

  return undefined;
};

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const buildGeoPoint = ({ lat, lng }) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  return { type: "Point", coordinates: [Number(lng), Number(lat)] };
};

const sanitizeBusiness = (business) => {
  if (!business) return null;
  const data = business.toJSON ? business.toJSON() : business;
  if (data.password !== undefined) {
    delete data.password;
  }
  return data;
};

const getBusinessProfile = async (req, res) => {
  try {
    const business = await Business.findByPk(req.business.id, {
      attributes: { exclude: ["password"] },
    });

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    return res.json({ business });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateBusinessProfile = async (req, res) => {
  try {
    const business = await Business.findByPk(req.business.id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const {
      name,
      email,
      phone,
      personName,
      businessType,
      businessAddress,
      state,
      timezone,
      categories,
      placeId,
      lat,
      lng,
    } = req.body || {};

    if (email !== undefined) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email is required" });
      }

      const existingBusiness = await Business.findOne({
        where: {
          email: normalizedEmail,
          id: { [Op.ne]: business.id },
        },
      });
      if (existingBusiness) {
        return res.status(400).json({ message: "Email already in use" });
      }

      business.email = normalizedEmail;
    }

    if (name !== undefined) {
      const normalizedName = String(name || "").trim();
      if (!normalizedName) {
        return res.status(400).json({ message: "Business name is required" });
      }
      business.name = normalizedName;
    }

    if (phone !== undefined) {
      const normalizedPhone = String(phone || "").trim();
      if (!normalizedPhone) {
        return res.status(400).json({ message: "Phone is required" });
      }
      business.phone = normalizedPhone;
    }

    if (personName !== undefined) {
      business.personName = String(personName || "").trim() || null;
    }

    if (businessType !== undefined) {
      const nextType = String(businessType || "").trim();
      if (nextType) {
        business.businessType = nextType;
      }
    }

    if (businessAddress !== undefined) {
      business.businessAddress = String(businessAddress || "").trim() || null;
    }

    if (state !== undefined) {
      business.state = String(state || "").trim() || null;
    }

    if (timezone !== undefined) {
      business.timezone = String(timezone || "").trim() || "UTC";
    }

    if (placeId !== undefined) {
      business.placeId = String(placeId || "").trim() || null;
    }

    const normalizedCategories = parseCategories(categories);
    if (normalizedCategories !== undefined) {
      business.categories = normalizedCategories;
    }

    const parsedLat = parseOptionalNumber(lat);
    const parsedLng = parseOptionalNumber(lng);
    if (parsedLat !== undefined) business.lat = parsedLat;
    if (parsedLng !== undefined) business.lng = parsedLng;
    if (parsedLat !== undefined || parsedLng !== undefined) {
      business.coordinates = buildGeoPoint({
        lat: parsedLat !== undefined ? parsedLat : business.lat,
        lng: parsedLng !== undefined ? parsedLng : business.lng,
      });
    }

    if (req.file && req.file.buffer) {
      const cloudinaryResult = await uploadImageToCloudinary(
        req.file.buffer,
        "business-logos",
      );

      if (
        cloudinaryResult?.success &&
        cloudinaryResult?.data &&
        cloudinaryResult.data.url
      ) {
        business.logoUrl = cloudinaryResult.data.url;
      } else {
        return res.status(500).json({
          message: cloudinaryResult?.error || "Failed to upload logo",
        });
      }
    }

    await business.save();

    return res.json({
      message: "Business profile updated successfully",
      business: sanitizeBusiness(business),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  getBusinessProfile,
  updateBusinessProfile,
};
