require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const productModel = require("../models/productModel");

const publicDir = path.join(__dirname, "..", "public");

function localFileFromThumbnail(thumbnail) {
    if (!thumbnail || !String(thumbnail).includes("/uploads/")) return null;
    const relative = decodeURIComponent(String(thumbnail).split("/uploads/")[1]);
    const safeRelative = relative.replace(/^[/\\]+/, "");
    const filePath = path.resolve(publicDir, "uploads", safeRelative);
    const uploadsRoot = path.resolve(publicDir, "uploads") + path.sep;
    return filePath.startsWith(uploadsRoot) ? filePath : null;
}

async function main() {
    const required = [
        "MONGODB_URL",
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });

    await mongoose.connect(process.env.MONGODB_URL);
    const products = await productModel.find({
        thumbnail: { $regex: "/uploads/" },
    });

    let migrated = 0;
    let skipped = 0;
    for (const product of products) {
        const filePath = localFileFromThumbnail(product.thumbnail);
        if (!filePath || !fs.existsSync(filePath)) {
            console.warn(`SKIP ${product.name}: local file not found`);
            skipped++;
            continue;
        }

        const result = await cloudinary.uploader.upload(filePath, {
            folder: "ishop/product",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
        });

        product.thumbnail = result.secure_url;
        product.cloudinary_id = result.public_id;
        await product.save();
        migrated++;
        console.log(`OK ${product.name}`);
    }

    console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped.`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error("Migration failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
