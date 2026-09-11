const multer = require("multer");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_FILE_SIZE_MB = 5;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: jpg, png, webp, gif, svg`), false);
    }
};

// Single image upload — field name passed at call site
const uploadSingle = (fieldName) =>
    multer({
        storage,
        fileFilter,
        limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
    }).single(fieldName);

// Multiple images — e.g. product gallery
const uploadMultiple = (fieldName, maxCount = 10) =>
    multer({
        storage,
        fileFilter,
        limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
    }).array(fieldName, maxCount);

module.exports = { uploadSingle, uploadMultiple };
