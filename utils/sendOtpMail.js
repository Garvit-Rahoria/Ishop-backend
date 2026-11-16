const nodemailer = require("nodemailer");

const sendOtpMail = async (toEmail, otp) => {
    console.log(`\n======================================================`);
    console.log(`📩 ATTEMPTING TO SEND OTP EMAIL`);
    console.log(`👤 To: ${toEmail}`);
    console.log(`🔐 OTP Code: [ ${otp} ] (Valid for 10 minutes)`);
    console.log(`======================================================\n`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("⚠️ EMAIL_USER or EMAIL_PASS is missing in server .env");
        return {
            success: false,
            message: "Email credentials not configured in server .env",
            otp,
        };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            connectionTimeout: 5000,
            greetingTimeout: 4000,
            socketTimeout: 6000,
        });

        const mailOptions = {
            from: `"Swoo Tech Mart" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "Verify Your Email - Swoo Tech Mart OTP",
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: #0d9488; color: #ffffff; font-weight: bold; font-size: 20px;">S</div>
                        <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 22px;">Verify Your Email Address</h2>
                        <p style="color: #64748b; font-size: 14px; margin: 0;">Thank you for registering with Swoo Tech Mart!</p>
                    </div>

                    <div style="background: #f0fdfa; border: 1px solid #ccfbf1; padding: 20px; text-align: center; border-radius: 16px; margin: 24px 0;">
                        <p style="color: #0f766e; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Your 6-Digit OTP Code</p>
                        <h1 style="letter-spacing: 8px; color: #0d9488; margin: 0; font-size: 36px; font-weight: 800; font-family: monospace;">${otp}</h1>
                    </div>

                    <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
                        Please enter this code on the verification page to complete your registration. This OTP is valid for <b>10 minutes</b>.
                    </p>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you didn't request this verification code, please ignore this email.</p>
                    </div>
                </div>
            `,
        };

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("SMTP send timeout (8s limit)")), 8000)
        );

        const info = await Promise.race([
            transporter.sendMail(mailOptions),
            timeoutPromise,
        ]);
        console.log("✅ OTP Email sent successfully! Message ID:", info.messageId);
        return {
            success: true,
            message: "OTP Email sent successfully!",
            messageId: info.messageId,
            otp,
        };

    } catch (error) {
        console.error("❌ Email sending failed via Gmail SMTP:", error.message);
        return {
            success: false,
            message: error.message,
            otp,
        };
    }
};

module.exports = sendOtpMail;
