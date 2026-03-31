const axios = require("axios");
const FormData = require("form-data");

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dgdfenqsv/image/upload";
const CLOUDINARY_UPLOAD_PRESET =
  process.env.CLOUDINARY_UPLOAD_PRESET || "file upload";
const CLOUDINARY_UPLOAD_TIMEOUT_MS = Number(
  process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || 60000,
);
const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNABORTED",
  "EAI_AGAIN",
]);

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} folder - Folder name in Cloudinary (optional)
 * @param {{ filename?: string, mimeType?: string }} options - File metadata
 * @returns {Promise<Object>} - Cloudinary response with image details
 */
const uploadImageToCloudinary = async (
  fileBuffer,
  folder = "templates",
  options = {},
) => {
  const { filename = "template-image", mimeType = "application/octet-stream" } =
    options || {};

  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const formData = new FormData();

      formData.append("file", fileBuffer, {
        filename,
        contentType: mimeType,
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      if (folder) {
        formData.append("folder", folder);
      }

      const response = await axios.post(CLOUDINARY_URL, formData, {
        headers: formData.getHeaders(),
        timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
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
      lastError = error;
      const errorCode = error?.code;
      const status = error?.response?.status;
      const isRetryable =
        RETRYABLE_CODES.has(errorCode) || status === 429 || status >= 500;

      if (!isRetryable || attempt >= maxAttempts) {
        break;
      }
    }
  }

  const cloudinaryMessage =
    lastError?.response?.data?.error?.message ||
    lastError?.response?.data?.message ||
    lastError?.message ||
    "Failed to upload image to Cloudinary";

  console.error("Cloudinary upload error:", cloudinaryMessage);
  return {
    success: false,
    error: cloudinaryMessage,
  };
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
