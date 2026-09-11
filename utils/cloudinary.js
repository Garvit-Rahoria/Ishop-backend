const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CLOUDINARY_CONFIGURED =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== "your_api_key" &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== "your_api_secret";

const PUBLIC_DIR = path.join(__dirname, "..", "public");

function getBackendBaseUrl() {
    const fromEnv = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
    if (fromEnv) {
        // Prefer 127.0.0.1 over localhost so browsers don't hit IPv6/Docker on ::1
        return fromEnv.replace(/^(https?:\/\/)localhost(?=:\d+|\/|$)/i, "$1127.0.0.1");
    }
    const port = process.env.PORT || 5000;
    return `http://127.0.0.1:${port}`;
}

if (!CLOUDINARY_CONFIGURED) {
    console.warn(
        "⚠️  CLOUDINARY credentials not configured.\n" +
        "   Images will be saved locally under /public/uploads.\n" +
        "   For production, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET\n" +
        "   Get credentials at: https://cloudinary.com/console"
    );
} else {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure:     true,
    });
}

/**
 * Save image buffer to local public/uploads when Cloudinary is unavailable.
 */
function saveLocally(buffer, folder) {
    const safeFolder = String(folder || "misc")
        .replace(/[^a-zA-Z0-9/_-]/g, "")
        .replace(/\.\./g, "");
    const dir = path.join(PUBLIC_DIR, "uploads", safeFolder);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.jpg`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicId = `local:${safeFolder}/${filename}`;
    const secure_url = `${getBackendBaseUrl()}/uploads/${safeFolder}/${filename}`;
    return { secure_url, public_id: publicId };
}

/**
 * Upload a file buffer to Cloudinary via upload stream.
 * Falls back to local /public/uploads if Cloudinary is not configured.
 *
 * @param {Buffer} buffer  - File buffer from multer memoryStorage
 * @param {string} folder  - Cloudinary folder (e.g. "ishop/category")
 * @returns {Promise<{secure_url: string, public_id: string}>}
 */
function uploadToCloudinary(buffer, folder) {
    if (!CLOUDINARY_CONFIGURED) {
        return Promise.resolve(saveLocally(buffer, folder));
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
                transformation: [{ quality: "auto", fetch_format: "auto" }],
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }
        );
        stream.end(buffer);
    });
}

/**
 * Delete an image from Cloudinary (or local disk) by public_id.
 *
 * @param {string|null} publicId
 */
async function deleteFromCloudinary(publicId) {
    if (!publicId) return;

    if (String(publicId).startsWith("local:")) {
        const relative = String(publicId).slice("local:".length);
        const filePath = path.join(PUBLIC_DIR, "uploads", relative);
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (err) {
            console.warn("Local image delete failed for", publicId, err.message);
        }
        return;
    }

    if (!CLOUDINARY_CONFIGURED) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.warn("Cloudinary delete failed for", publicId, err.message);
    }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary, CLOUDINARY_CONFIGURED };
