const contactRouter = require("express").Router();
const {
    submitContact,
    listMessages,
    markMessageRead,
    markMessageUnread,
    deleteMessage,
} = require("../controllers/contactController");
const { protect, authorized } = require("../middleware/auth");

// Public — website contact form
contactRouter.post("/", submitContact);

// Admin — Messages module
contactRouter.get(
    "/messages",
    protect,
    authorized("admin", "superAdmin"),
    listMessages
);
contactRouter.patch(
    "/messages/:id/read",
    protect,
    authorized("admin", "superAdmin"),
    markMessageRead
);
contactRouter.patch(
    "/messages/:id/unread",
    protect,
    authorized("admin", "superAdmin"),
    markMessageUnread
);
contactRouter.delete(
    "/messages/:id",
    protect,
    authorized("admin", "superAdmin"),
    deleteMessage
);

module.exports = contactRouter;
