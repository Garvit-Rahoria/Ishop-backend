/**
 * Ensure default admin account exists.
 * Username: Admin
 * Password: admin123
 *
 * Usage: node scripts/ensureAdmin.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const cryptr = require("cryptr");
const userModel = require("../models/userModel");

const ADMIN_NAME = "Admin";
const ADMIN_EMAIL = "admin@swoo.com";
const ADMIN_PASSWORD = "admin123";

async function main() {
    if (!process.env.SECRET_KEY) {
        console.error("❌ SECRET_KEY missing in .env");
        process.exit(1);
    }
    if (!process.env.MONGODB_URL) {
        console.error("❌ MONGODB_URL missing in .env");
        process.exit(1);
    }

    const Cryptr = new cryptr(process.env.SECRET_KEY);
    await mongoose.connect(process.env.MONGODB_URL);

    let user = await userModel.findOne({
        $or: [{ email: ADMIN_EMAIL }, { name: ADMIN_NAME }],
    });

    if (user) {
        user.name = ADMIN_NAME;
        user.email = ADMIN_EMAIL;
        user.password = Cryptr.encrypt(ADMIN_PASSWORD);
        user.role = "admin";
        user.isVerified = true;
        user.status = true;
        await user.save();
        console.log("✅ Existing admin updated");
    } else {
        user = await userModel.create({
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: Cryptr.encrypt(ADMIN_PASSWORD),
            role: "admin",
            isVerified: true,
            status: true,
        });
        console.log("✅ Admin user created");
    }

    console.log(`   Username: ${ADMIN_NAME}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Role:     ${user.role}`);

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error("❌", err.message);
    try {
        await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
});
