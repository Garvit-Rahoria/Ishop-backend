const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        phone: { type: String, default: "" },
        country: { type: String, default: "" },
        subject: { type: String, default: "" },
        message: { type: String, required: true },
        newsletter: { type: Boolean, default: false },
        isRead: { type: Boolean, default: false },
        readAt: { type: Date, default: null },
    },
    { timestamps: true }
);

contactMessageSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
