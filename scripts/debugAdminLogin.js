require("dotenv").config();
const mongoose = require("mongoose");
const cryptr = require("cryptr");
const userModel = require("../models/userModel");

(async () => {
    await mongoose.connect(process.env.MONGODB_URL);
    const users = await userModel
        .find({
            $or: [
                { name: /^Admin$/i },
                { email: "admin@swoo.com" },
                { email: "admin" },
                { role: "admin" },
            ],
        })
        .select("name email role isVerified");
    console.log("admins", JSON.stringify(users, null, 2));

    let full = await userModel.findOne({
        $or: [{ email: "admin@swoo.com" }, { name: "Admin" }],
    });

    if (!full) {
        console.log("NO_ADMIN — creating...");
        const Cryptr = new cryptr(process.env.SECRET_KEY);
        full = await userModel.create({
            name: "Admin",
            email: "admin@swoo.com",
            password: Cryptr.encrypt("admin123"),
            role: "admin",
            isVerified: true,
            status: true,
        });
    }

    const Cryptr = new cryptr(process.env.SECRET_KEY);
    let pass = "";
    try {
        pass = Cryptr.decrypt(full.password);
    } catch (e) {
        pass = "DECRYPT_FAIL:" + e.message;
    }

    console.log(
        JSON.stringify(
            {
                name: full.name,
                email: full.email,
                role: full.role,
                verified: full.isVerified,
                passMatch: pass === "admin123",
                decrypted: pass === "admin123" ? "admin123" : pass,
            },
            null,
            2
        )
    );

    // simulate login lookup
    const identifier = "Admin";
    let user = null;
    if (identifier.toLowerCase() === "admin") {
        user = await userModel.findOne({
            $or: [
                { name: /^Admin$/i },
                { email: "admin@swoo.com" },
                { email: "admin" },
            ],
        });
    }
    console.log("loginLookup", !!user, user?.email, user?.role);

    await mongoose.disconnect();
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
