const cartModel = require("../models/cartModel");

const syncCart = async (req, res) => {
    try {
        const userId = req.user._id;
        let localCart = [];

        try {
            const raw = req.body.localCart;
            localCart = typeof raw === "string" ? JSON.parse(raw || "[]") : (raw || []);
            if (!Array.isArray(localCart)) localCart = [];
        } catch (_) {
            return res.status(400).json({
                success: false,
                message: "Invalid localCart payload",
            });
        }

        if (localCart.length === 0) {
            const userCart = await cartModel.findOne({ userId }).populate({
                path: "items.productId",
                select: "name _id orginal_price final_price discount_percentage price thumbnail stock"
            });

            return res.status(200).json({
                message: "Fetched cart from server",
                success: true,
                cart: userCart ? userCart.items : [],
                imageBaseUrl: ""
            });
        }

        let userCart = await cartModel.findOne({ userId })
            .populate({
                path: "items.productId",
                select: "name _id orginal_price final_price discount_percentage price thumbnail stock"
            });

        if (!userCart) {
            userCart = new cartModel({
                userId,
                items: []
            });
        }

        // Checkout sends replace=true because the browser cart is the source
        // of truth. Without this, every checkout added the same quantities to
        // the existing DB cart and inflated the Razorpay amount.
        if (req.body.replace === true) {
            userCart.items = localCart
                .map(({ id, qty }) => ({
                    productId: id,
                    qty: Math.max(1, Number(qty) || 1),
                }))
                .filter((item) => item.productId);
            await userCart.save();

            const replaced = await cartModel.findOne({ userId }).populate({
                path: "items.productId",
                select: "name _id orginal_price final_price discount_percentage price thumbnail stock"
            });

            return res.status(200).json({
                message: "Cart replaced successfully!",
                success: true,
                cart: replaced ? replaced.items : [],
                imageBaseUrl: ""
            });
        }

        localCart.forEach((cartItem) => {
            const { id, qty } = cartItem;
            if (!id || !qty || qty < 1) return;

            const existingItem = userCart.items.find((item) => {
                const pid = item.productId?._id || item.productId;
                return String(pid) === String(id);
            });

            if (existingItem) {
                existingItem.qty += Number(qty) || 1;
            } else {
                userCart.items.push({
                    productId: id,
                    qty: Number(qty) || 1
                });
            }
        });

        await userCart.save();

        const populated = await cartModel.findOne({ userId }).populate({
            path: "items.productId",
            select: "name _id orginal_price final_price discount_percentage price thumbnail stock"
        });

        return res.status(200).json({
            message: "Cart synced Successfully!",
            success: true,
            cart: populated ? populated.items : [],
            imageBaseUrl: ""
        });

    } catch (error) {
        console.error("syncCart error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to sync cart",
        });
    }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id, qty = 1 } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Product id is required" });
        }

        const safeQty = Math.max(1, Number(qty) || 1);

        let userCart = await cartModel.findOne({ userId });

        if (!userCart) {
            userCart = new cartModel({ userId, items: [] });
        }

        const existingItem = userCart.items.find(
            (item) => item.productId.toString() === id.toString()
        );

        if (existingItem) {
            existingItem.qty += safeQty;
        } else {
            userCart.items.push({ productId: id, qty: safeQty });
        }

        await userCart.save();

        return res.status(200).json({
            success: true,
            message: "Added to cart",
        });
    } catch (error) {
        console.error("addToCart error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    syncCart, addToCart
};
