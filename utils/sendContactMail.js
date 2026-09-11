const nodemailer = require("nodemailer");

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * 1) Admin inbox → visitor's message
 * 2) Visitor email → confirmation that we received it
 */
const sendContactMail = async ({
    firstName,
    lastName,
    email,
    phone,
    country,
    subject,
    message,
    newsletter,
}) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Email is not configured on the server");
    }

    // Gmail app passwords often copied with spaces — strip them
    const emailUser = String(process.env.EMAIL_USER).trim();
    const emailPass = String(process.env.EMAIL_PASS).replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });

    // Fail fast if credentials / Gmail auth broken
    await transporter.verify();

    const fullName = `${firstName} ${lastName}`.trim();
    const safeMessage = escapeHtml(message);
    const safeSubject = escapeHtml(subject) || "—";
    const adminTo = (process.env.CONTACT_TO || emailUser).trim();

    // --- Mail to site owner ---
    const adminResult = await transporter.sendMail({
        from: `"Swoo Tech Mart" <${emailUser}>`,
        to: adminTo,
        replyTo: email,
        subject: subject?.trim()
            ? `[Contact] ${subject.trim()}`
            : `[Contact] Message from ${fullName}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
                <h2 style="margin: 0 0 16px;">New contact form message</h2>
                <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
                    <tr><td style="padding: 6px 0; color: #666;">Name</td><td style="padding: 6px 0;"><b>${escapeHtml(fullName)}</b></td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;">${escapeHtml(email)}</td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Phone</td><td style="padding: 6px 0;">${escapeHtml(phone) || "—"}</td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Country</td><td style="padding: 6px 0;">${escapeHtml(country) || "—"}</td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Subject</td><td style="padding: 6px 0;">${safeSubject}</td></tr>
                    <tr><td style="padding: 6px 0; color: #666;">Newsletter</td><td style="padding: 6px 0;">${newsletter ? "Yes" : "No"}</td></tr>
                </table>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="white-space: pre-wrap; line-height: 1.5;">${safeMessage}</p>
            </div>
        `,
    });

    // --- Confirmation mail to the user ---
    const userResult = await transporter.sendMail({
        from: `"Swoo Tech Mart" <${emailUser}>`,
        to: email,
        subject: "We received your message — Swoo Tech Mart",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
                <div style="background: #0f766e; color: #fff; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 20px;">Thanks for contacting us</h1>
                </div>
                <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0 0 12px;">Hi <b>${escapeHtml(firstName)}</b>,</p>
                    <p style="margin: 0 0 16px; color: #374151; line-height: 1.5;">
                        We got your message and our team will reply soon
                        (usually within 1 business day).
                    </p>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;">
                        Your message
                    </p>
                    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; white-space: pre-wrap; line-height: 1.5; color: #111;">
${safeSubject !== "—" ? `<b>Subject:</b> ${safeSubject}<br/><br/>` : ""}${safeMessage}
                    </div>
                    <p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">
                        — Swoo Tech Mart Support<br/>
                        ${escapeHtml(emailUser)}
                    </p>
                </div>
            </div>
        `,
    });

    console.log("📧 Contact mail → admin:", adminResult.messageId, "accepted:", adminResult.accepted);
    console.log("📧 Contact mail → user:", userResult.messageId, "accepted:", userResult.accepted);

    return {
        adminMessageId: adminResult.messageId,
        userMessageId: userResult.messageId,
    };
};

module.exports = sendContactMail;
