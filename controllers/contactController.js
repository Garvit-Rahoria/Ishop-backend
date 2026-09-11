const sendContactMail = require("../utils/sendContactMail");
const ContactMessage = require("../models/contactMessageModel");
const { sendBadRequest, sendSuccess, sendNotFound } = require("../utils/response");

const submitContact = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            country,
            subject,
            message,
            newsletter,
        } = req.body || {};

        if (!firstName?.trim() || !lastName?.trim()) {
            return sendBadRequest(res, "First name and last name are required");
        }
        if (!email?.trim()) {
            return sendBadRequest(res, "Email is required");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
            return sendBadRequest(res, "Please enter a valid email");
        }
        if (!country?.trim()) {
            return sendBadRequest(res, "Country is required");
        }
        if (!message?.trim()) {
            return sendBadRequest(res, "Message is required");
        }

        const payload = {
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            email: String(email).trim().toLowerCase(),
            phone: phone ? String(phone).trim() : "",
            country: String(country).trim(),
            subject: subject ? String(subject).trim() : "",
            message: String(message).trim(),
            newsletter: Boolean(newsletter),
            isRead: false,
        };

        // Always save for admin Messages module first
        const saved = await ContactMessage.create(payload);

        try {
            await sendContactMail(payload);
        } catch (mailErr) {
            console.error("Contact email failed (message still saved):", mailErr.message);
            return sendSuccess(
                res,
                "Message received! We'll get back to you soon.",
                { id: saved._id, emailSent: false }
            );
        }

        return sendSuccess(res, "Message sent! Check your email for a confirmation.", {
            id: saved._id,
            emailSent: true,
        });
    } catch (error) {
        console.error("Contact form error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send message. Please try again.",
            ...(process.env.NODE_ENV !== "production"
                ? { debug: error?.message }
                : {}),
        });
    }
};

const listMessages = async (req, res) => {
    try {
        const status = String(req.query.status || "all").toLowerCase();
        const filter = {};
        if (status === "unread") filter.isRead = false;
        if (status === "read") filter.isRead = true;

        const [messages, unreadCount, readCount, total] = await Promise.all([
            ContactMessage.find(filter).sort({ createdAt: -1 }).lean(),
            ContactMessage.countDocuments({ isRead: false }),
            ContactMessage.countDocuments({ isRead: true }),
            ContactMessage.countDocuments(),
        ]);

        return res.status(200).json({
            success: true,
            message: "Messages loaded",
            data: messages,
            meta: { unreadCount, readCount, total, status },
        });
    } catch (error) {
        console.error("listMessages:", error);
        return res.status(500).json({ success: false, message: "Failed to load messages" });
    }
};

const markMessageRead = async (req, res) => {
    try {
        const msg = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            { isRead: true, readAt: new Date() },
            { new: true }
        );
        if (!msg) return sendNotFound(res, "Message not found");
        return sendSuccess(res, "Marked as read", msg);
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update message" });
    }
};

const markMessageUnread = async (req, res) => {
    try {
        const msg = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            { isRead: false, readAt: null },
            { new: true }
        );
        if (!msg) return sendNotFound(res, "Message not found");
        return sendSuccess(res, "Marked as unread", msg);
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update message" });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const msg = await ContactMessage.findByIdAndDelete(req.params.id);
        if (!msg) return sendNotFound(res, "Message not found");
        return sendSuccess(res, "Message deleted");
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete message" });
    }
};

module.exports = {
    submitContact,
    listMessages,
    markMessageRead,
    markMessageUnread,
    deleteMessage,
};
