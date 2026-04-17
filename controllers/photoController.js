const { Op } = require("sequelize");

const Photo = require("../models/Photo");
const { uploadImageToCloudinary } = require("../utils/cloudinaryUtils");

const normalizeText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const parseBoolean = (value, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
};

const parseSortOrder = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const buildPhotoOrder = () => [["sortOrder", "ASC"], ["createdAt", "DESC"]];

const normalizePhotoPayload = (photo) => {
  const plain = photo?.toJSON ? photo.toJSON() : photo;
  if (!plain) return plain;

  return {
    ...plain,
    description: plain.description || "",
    altText: plain.altText || plain.title || "",
  };
};

const getPublicPhotos = async (req, res) => {
  try {
    const photos = await Photo.findAll({
      where: { isActive: true },
      order: buildPhotoOrder(),
    });

    return res.json({
      photos: photos.map(normalizePhotoPayload),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAdminPhotos = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;
    const where = {};

    const trimmedSearch = normalizeText(search);
    if (trimmedSearch) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${trimmedSearch}%` } },
        { description: { [Op.iLike]: `%${trimmedSearch}%` } },
        { altText: { [Op.iLike]: `%${trimmedSearch}%` } },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const photos = await Photo.findAll({
      where,
      order: buildPhotoOrder(),
    });

    return res.json({
      photos: photos.map(normalizePhotoPayload),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Photo image is required" });
    }

    const title = normalizeText(req.body?.title);
    const description = normalizeText(req.body?.description);
    const altText = normalizeText(req.body?.altText) || title;
    const sortOrder = parseSortOrder(req.body?.sortOrder, 0);
    const isActive = parseBoolean(req.body?.isActive, true);

    if (!title) {
      return res.status(400).json({ message: "Photo title is required" });
    }

    const uploadResult = await uploadImageToCloudinary(
      req.file.buffer,
      "photos",
      {
        filename: req.file.originalname || `${title}.jpg`,
        mimeType: req.file.mimetype || "application/octet-stream",
      },
    );

    if (!uploadResult.success) {
      return res.status(502).json({
        message: uploadResult.error || "Failed to upload photo image",
      });
    }

    const photo = await Photo.create({
      title,
      description,
      altText,
      sortOrder,
      isActive,
      imageUrl: uploadResult.data.url,
      cloudinaryPublicId: uploadResult.data.publicId,
    });

    return res.status(201).json({
      message: "Photo created successfully",
      photo: normalizePhotoPayload(photo),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updatePhoto = async (req, res) => {
  try {
    const photo = await Photo.findByPk(req.params.id);

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    const title = normalizeText(req.body?.title);
    if (!title) {
      return res.status(400).json({ message: "Photo title is required" });
    }

    photo.title = title;
    photo.description = normalizeText(req.body?.description);
    photo.altText = normalizeText(req.body?.altText) || title;
    photo.sortOrder = parseSortOrder(req.body?.sortOrder, photo.sortOrder);
    photo.isActive = parseBoolean(req.body?.isActive, photo.isActive);

    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(
        req.file.buffer,
        "photos",
        {
          filename: req.file.originalname || `${title}.jpg`,
          mimeType: req.file.mimetype || "application/octet-stream",
        },
      );

      if (!uploadResult.success) {
        return res.status(502).json({
          message: uploadResult.error || "Failed to upload photo image",
        });
      }

      photo.imageUrl = uploadResult.data.url;
      photo.cloudinaryPublicId = uploadResult.data.publicId;
    }

    await photo.save();

    return res.json({
      message: "Photo updated successfully",
      photo: normalizePhotoPayload(photo),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deletePhoto = async (req, res) => {
  try {
    const photo = await Photo.findByPk(req.params.id);

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    await photo.destroy();

    return res.json({ message: "Photo deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicPhotos,
  getAdminPhotos,
  createPhoto,
  updatePhoto,
  deletePhoto,
};
