const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const brandModel = require("../models/brandModel");
const colorModel = require("../models/colorModel");
const orderModel = require("../models/orderModel");

const getDashboardStats = async (req, res) => {
    try {
        const [
            users,
            products,
            categories,
            brands,
            colors,
            orders,
            recentOrders,
            recentProducts,
            paidOrders,
            pendingOrders,
            codOrders,
            onlineOrders,
        ] = await Promise.all([
            userModel.countDocuments(),
            productModel.countDocuments(),
            categoryModel.countDocuments(),
            brandModel.countDocuments(),
            colorModel.countDocuments(),
            orderModel.countDocuments(),
            orderModel
                .find()
                .populate("user", "name email")
                .populate("items.product_id", "name thumbnail")
                .sort({ createdAt: -1, _id: -1 })
                .limit(8)
                .lean(),
            productModel
                .find()
                .select("name thumbnail final_price orginal_price stock status createdAt")
                .sort({ createdAt: -1, _id: -1 })
                .limit(8)
                .lean(),
            orderModel.countDocuments({ paymentStatus: "paid" }),
            orderModel.countDocuments({ orderStatus: "placed" }),
            orderModel.countDocuments({ paymentMethod: "cod" }),
            orderModel.countDocuments({ paymentMethod: "online" }),
        ]);

        const revenueAgg = await orderModel.aggregate([
            {
                $match: {
                    $or: [
                        { paymentStatus: "paid" },
                        { paymentMethod: "cod", orderStatus: { $ne: "cancelled" } },
                    ],
                },
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]);

        const revenue = revenueAgg[0]?.total || 0;

        return res.status(200).json({
            success: true,
            message: "Dashboard stats",
            data: {
                counts: {
                    users,
                    products,
                    categories,
                    brands,
                    colors,
                    orders,
                    paidOrders,
                    pendingOrders,
                    codOrders,
                    onlineOrders,
                    revenue,
                },
                recentOrders,
                recentProducts,
            },
        });
    } catch (error) {
        console.error("getDashboardStats error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load dashboard",
        });
    }
};

module.exports = { getDashboardStats };
