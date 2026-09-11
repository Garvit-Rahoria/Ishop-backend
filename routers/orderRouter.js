const orderRouter = require("express").Router()
const { createOrder, verifyPayment, getAllOrders, updateOrderStatus, getMyOrders } = require("../controllers/orderController");
const { protect, authorized } = require("../middleware/auth");

orderRouter.post("/create", protect, createOrder)
orderRouter.post("/verify", protect, verifyPayment)
orderRouter.get("/my", protect, getMyOrders)
orderRouter.get("/", protect, authorized("admin", "superAdmin"), getAllOrders)
orderRouter.patch("/:id/status", protect, authorized("admin", "superAdmin"), updateOrderStatus)

module.exports = orderRouter;