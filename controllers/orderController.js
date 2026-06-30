const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel")
const { sendServerError, sendSuccess } = require("../utils/response");
const Razorpay = require('razorpay');
const crypto = require("crypto");

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
    try {
        const { paymentMethod, address } = req.body;
        const userId = req.user._id;
        // console.log(userId)

        const userCart = await cartModel.findOne({ userId })
            .populate({
                path: "items.productId",
                select: "_id final_price"
            });
        // console.log(userCart)

        const productDetails = userCart.items.map((item) => {
            const { _id, final_price } = item.productId

            return {
                product_id: _id,
                qty: item.qty,
                price: final_price,
                total: (final_price * item.qty)
            }
        });
        const total_Amount = productDetails.reduce((sum, item) => sum + item.total, sum = 0);


        const order = await orderModel.create({
            user: userId,
            items: productDetails,
            shippingAddress: address,
            paymentMethod: "cod",
            totalAmount: total_Amount,
            paymentStatus: "pending"
        })

        if (paymentMethod === "cod") {
            //cod
            res.status(201).json({
                message: "order placed",
                success: true,
                orderId: order._id
            })
        } else if (paymentMethod === "online") {
            // Payment Gateway
            var options = {
                amount: total_Amount * 100,  // Amount is in currency subunits.
                currency: "INR",
                receipt: order._id
            }
            instance.orders.create(options, function (err, razorpayOrder) {
                if (err) {
                    console.log(err)
                    return sendSuccess(res, "Payment Failed")
                }
                order.razorpay_order_id = razorpayOrder.id;
                order.paymentMethod = "online"
                order.save()
                res.status(200).json({
                    message: "Order Create Successfully",
                    success: true,
                    orderId: order._id,
                    payment_order_Id: razorpayOrder.id,
                })
            })
        }

    } catch (error) {
        console.log(error)
        sendServerError(res)
    }
}

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const order = await orderModel.findOne({ razorpay_order_id: razorpay_order_id })
        console.log(order, "order")

        // STEP 1: Create expected signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        // STEP 2: Compare signatures
        if (expectedSignature === razorpay_signature) {

            // Payment Verified
            // Yaha DB me order update karo (paid = true)
            order.razorpay_payment_id = razorpay_payment_id;
            order.paymentStatus = "paid";
            await order.save();


            return res.status(200).json({
                success: true,
                message: "Payment Verified Successfully"
            });


        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid Signature"
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await OrderModel.find()
            .populate("user", "name email") // user details
            .populate("items.productId", "name price thumbnail")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getSingleOrder = async (req, res) => {
    const order = await OrderModel.findById(req.params.id)
        .populate("items.productId")
        .populate("user", "name email");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({ order });
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // ✅ Allowed status list (same as schema)
        const validStatus = [
            "placed",
            "confirmed",
            "shipped",
            "out_for_delivery",
            "delivered",
            "cancelled",
            "returned"
        ];

        // ❌ Invalid status check
        if (!validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status"
            });
        }

        // 🔍 Find order
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // 🔄 Update status
        order.orderStatus = status;

        await order.save();

        res.status(200).json({
            success: true,
            message: "Order status updated",
            order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const cancelOrder = async (req, res) => {
    const order = await OrderModel.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "delivered") {
        return res.status(400).json({ message: "Cannot cancel delivered order" });
    }

    order.orderStatus = "cancelled";
    await order.save();

    res.json({ message: "Order cancelled" });
};

const returnOrder = async (req, res) => {
    const order = await OrderModel.findById(req.params.id);

    if (order.orderStatus !== "delivered") {
        return res.status(400).json({ message: "Only delivered orders can be returned" });
    }

    order.orderStatus = "return";
    await order.save();

    res.json({ message: "Return request placed" });
};

module.exports = {
    createOrder, verifyPayment, getAllOrders, updateOrderStatus, getSingleOrder, cancelOrder, returnOrder
}