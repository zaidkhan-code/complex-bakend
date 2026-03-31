// Not Found middleware
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Error Handler middleware
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err?.message || "Server error";

  if (err?.name === "MulterError") {
    statusCode = 400;
    if (err?.code === "LIMIT_FILE_SIZE") {
      message = "File too large. Maximum allowed size is 2MB per image.";
    }
  }
  if (statusCode === 500 && /only image files allowed/i.test(err?.message || "")) {
    statusCode = 400;
  }
  
  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    errors: err.errors || null
  });
};

module.exports = { notFound, errorHandler };
