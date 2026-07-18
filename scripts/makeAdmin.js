/**
 * makeAdmin.js — One-time script to promote an existing user to admin role.
 *
 * Usage (run from server/ directory):
 *   node scripts/makeAdmin.js <email>
 *
 * Example:
 *   node scripts/makeAdmin.js garvitrahoria2004@gmail.com
 *
 * The user must already exist and be verified.
 * This script NEVER exposes passwords or tokens.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const userModel = require("../models/userModel");

const email = process.argv[2];

if (!email) {
    console.error("Usage: node scripts/makeAdmin.js <email>");
    process.exit(1);
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ DB connected");

        const user = await userModel.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            console.error(`❌ No user found with email: ${email}`);
            process.exit(1);
        }

        if (!user.isVerified) {
            console.error(`❌ User ${email} is not verified. Verify email first.`);
            process.exit(1);
        }

        if (user.role === "admin" || user.role === "superAdmin") {
            console.log(`ℹ️  User ${email} already has role: ${user.role}. No change needed.`);
            process.exit(0);
        }

        user.role = "admin";
        await user.save();

        console.log(`✅ User ${email} promoted to admin.`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ⚠️  User must logout and login again to get a new token with admin role.`);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

run();
