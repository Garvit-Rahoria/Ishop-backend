/**
 * Quick live test: send contact mails via Gmail (uses server/.env)
 * Usage: node scripts/testContactMail.js
 */
require("dotenv").config();
const sendContactMail = require("../utils/sendContactMail");

async function main() {
    const toUser = process.env.EMAIL_USER; // send confirmation to same inbox for test
    console.log("EMAIL_USER:", process.env.EMAIL_USER ? "set" : "MISSING");
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "set" : "MISSING");

    try {
        await sendContactMail({
            firstName: "Test",
            lastName: "User",
            email: toUser,
            phone: "9999999999",
            country: "India",
            subject: "Contact mail live test",
            message: "Agar ye mail aa gayi to contact form kaam kar raha hai.",
            newsletter: false,
        });
        console.log("✅ BOTH emails sent successfully to", toUser);
        process.exit(0);
    } catch (err) {
        console.error("❌ SEND FAILED:", err.message);
        if (err.response) console.error(err.response);
        process.exit(1);
    }
}

main();
