const nodemailer = require("nodemailer");

const sendOtpMail = async (toEmail, otp) => {
    try {
        // transporter setup (Gmail example)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS, // app password (important)
            },
        });

        const mailOptions = {
            from: `"Ishop Website" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "Verify Your Email - OTP",
            html: `
                <div style="font-family: Arial, sans-serif; padding:20px">
            <h2>Email Verification</h2>
            <p>Your OTP code is:</p>
            <h1 style="letter-spacing:4px">${otp}</h1>
            <p>This OTP is valid for <b>3 minutes</b>.</p>
            <p>If you didn't request this, ignore this email.</p>
        </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return "OTP Email sent Successfully!"

    } catch (error) {
        return "Email sending failed: " + error.message;
    }
}

module.exports = sendOtpMail;