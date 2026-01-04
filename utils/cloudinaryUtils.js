const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dgdfenqsv/image/upload";

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} folder - Folder name in Cloudinary (optional)
 * @returns {Promise<Object>} - Cloudinary response with image details
 */
const uploadImageToCloudinary = async (fileBuffer, folder = "templates") => {
  try {
    const formData = new FormData();

    // Add file buffer to form data
    formData.append("file", fileBuffer, {
      filename: "template-image",
      contentType: "image/jpeg",
    });
    formData.append("upload_preset", "file upload");
    const response = await axios.post(CLOUDINARY_URL, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    return {
      success: true,
      data: {
        publicId: response.data.public_id,
        url: response.data.secure_url,
        width: response.data.width,
        height: response.data.height,
        format: response.data.format,
        size: response.data.bytes,
        createdAt: response.data.created_at,
      },
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to upload image to Cloudinary",
    };
  }
};

/**
 * Get image URL with transformations
 * @param {string} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - Transformed image URL
 */
const getTransformedUrl = (publicId, options = {}) => {
  const {
    width = 300,
    height = 300,
    crop = "fill",
    quality = "auto",
  } = options;

  return `https://res.cloudinary.com/dgdfenqsv/image/upload/w_${width},h_${height},c_${crop},q_${quality}/${publicId}`;
};

module.exports = {
  uploadImageToCloudinary,
  getTransformedUrl,
  CLOUDINARY_URL,
};
