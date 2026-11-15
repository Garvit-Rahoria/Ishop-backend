const orderRouter = require("express").Router();
const {
    createOrder,
    verifyPayment,
    getAllOrders,
    updateOrderStatus,
    getMyOrders,
    getSingleOrder,
    cancelOrder,
    returnOrder,
    deleteOrder,
} = require("../controllers/orderController");
const { protect, authorized } = require("../middleware/auth");

orderRouter.post("/create", protect, createOrder);
orderRouter.post("/verify", protect, verifyPayment);
orderRouter.get("/my", protect, getMyOrders);
orderRouter.get("/", protect, authorized("admin", "superAdmin"), getAllOrders);
orderRouter.get("/:id", protect, getSingleOrder);
orderRouter.patch("/:id/status", protect, authorized("admin", "superAdmin"), updateOrderStatus);
orderRouter.patch("/:id/cancel", protect, cancelOrder);
orderRouter.patch("/:id/return", protect, returnOrder);
orderRouter.delete("/:id", protect, authorized("admin", "superAdmin"), deleteOrder);

module.exports = orderRouter;
