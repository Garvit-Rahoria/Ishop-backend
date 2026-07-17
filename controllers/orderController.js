const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");
const { sendServerError, sendSuccess } = require("../utils/response");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Create Order ────────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
    try {
        const { paymentMethod, address } = req.body;
        const userId = req.user._id;

        // 1. Fetch user's DB cart with product prices (server-side, never trust client)
        const userCart = await cartModel.findOne({ userId }).populate({
            path: "items.productId",
            select: "_id final_price stock",
        });

        if (!userCart || userCart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        // 2. Build product details + validate stock
        const productDetails = userCart.items.map((item) => {
            const { _id, final_price, stock } = item.productId;
            if (!stock) {
                throw new Error(`Product ${_id} is out of stock`);
            }
            return {
                product_id: _id,
                qty: item.qty,
                price: final_price,
                total: final_price * item.qty,
            };
        });

        // 3. Server-side total — never use frontend value
        const totalAmount = productDetails.reduce((sum, item) => sum + item.total, 0);

        if (!address || !address.fullName) {
            return res.status(400).json({ success: false, message: "Shipping address is required" });
        }

        // 4. Create order in DB (initial status)
        const order = await orderModel.create({
            user: userId,
            items: productDetails,
            shippingAddress: address,
            paymentMethod,
            totalAmount,
            paymentStatus: "pending",
        });

        // 5. COD — immediately confirmed
        if (paymentMethod === "cod") {
            // Clear DB cart after successful order
            await cartModel.findOneAndUpdate({ userId }, { items: [] });

            return res.status(201).json({
                success: true,
                message: "Order placed successfully",
                orderId: order._id,
            });
        }

        // 6. Online — create Razorpay order
        if (paymentMethod === "online") {
            let razorpayOrder;
            try {
                razorpayOrder = await instance.orders.create({
                    amount: Math.round(totalAmount * 100), // paise, must be integer
                    currency: "INR",
                    receipt: order._id.toString(),        // must be string
                });
            } catch (rzpErr) {
                // Razorpay order creation failed — delete the pending DB order
                await orderModel.findByIdAndDelete(order._id);
                console.error("Razorpay order creation failed:", rzpErr);
                return res.status(502).json({
                    success: false,
                    message: "Payment gateway error. Please try again.",
                });
            }

            // Save Razorpay order ID back to DB order
            order.razorpay_order_id = razorpayOrder.id;
            await order.save();

            return res.status(200).json({
                success: true,
                message: "Razorpay order created",
                orderId: order._id,
                payment_order_Id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
            });
        }

        return res.status(400).json({ success: false, message: "Invalid payment method" });

    } catch (error) {
        console.error("createOrder error:", error);
        return res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};

// ─── Verify Razorpay Payment ─────────────────────────────────────────────────
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing payment details" });
        }

        // 1. HMAC-SHA256 signature verification
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        // 2. Find internal order by Razorpay order ID
        const order = await orderModel.findOne({ razorpay_order_id });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // 3. Idempotency — already verified, return success without re-processing
        if (order.paymentStatus === "paid") {
            return res.status(200).json({
                success: true,
                message: "Payment already verified",
                orderId: order._id,
            });
        }

        // 4. Update order — mark paid
        order.razorpay_payment_id = razorpay_payment_id;
        order.paymentStatus = "paid";
        order.paidAt = new Date();
        await order.save();

        // 5. Clear DB cart after successful payment
        await cartModel.findOneAndUpdate({ userId: order.user }, { items: [] });

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            orderId: order._id,
        });

    } catch (error) {
        console.error("verifyPayment error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Admin: Get All Orders ───────────────────────────────────────────────────
const getAllOrders = async (req, res) => {
    try {
        const orders = await orderModel
            .find()
            .populate("user", "name email")
            .populate("items.product_id", "name final_price thumbnail")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.error("getAllOrders error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Admin: Update Order Status ──────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatus = [
            "placed", "confirmed", "shipped",
            "out_for_delivery", "delivered", "cancelled", "returned",
        ];

        if (!validStatus.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid order status" });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.orderStatus = status;
        if (status === "delivered") order.deliveredAt = new Date();
        await order.save();

        return res.status(200).json({ success: true, message: "Order status updated", order });
    } catch (error) {
        console.error("updateOrderStatus error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get Single Order ────────────────────────────────────────────────────────
const getSingleOrder = async (req, res) => {
    try {
        const order = await orderModel
            .findById(req.params.id)
            .populate("items.product_id")
            .populate("user", "name email");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        return res.status(200).json({ success: true, order });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Cancel Order ────────────────────────────────────────────────────────────
const cancelOrder = async (req, res) => {
    try {
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.orderStatus === "delivered") {
            return res.status(400).json({ success: false, message: "Cannot cancel a delivered order" });
        }
        order.orderStatus = "cancelled";
        await order.save();
        return res.status(200).json({ success: true, message: "Order cancelled" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Return Order ────────────────────────────────────────────────────────────
const returnOrder = async (req, res) => {
    try {
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.orderStatus !== "delivered") {
            return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
        }
        order.orderStatus = "returned";
        await order.save();
        return res.status(200).json({ success: true, message: "Return request placed" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
    getAllOrders,
    updateOrderStatus,
    getSingleOrder,
    cancelOrder,
    returnOrder,
};
