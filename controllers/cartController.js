const mongoose = require("mongoose");
const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");

// Safely resolve any identifier (ObjectId hex string, slug, or name) to a valid ObjectId
const resolveToObjectId = async (val) => {
    if (!val) return null;
    const str = String(val).trim();
    if (mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str)) {
        return new mongoose.Types.ObjectId(str);
    }
    try {
        const prod = await productModel.findOne({
            $or: [{ slug: str }, { name: str }]
        }).select("_id");
        return prod ? prod._id : null;
    } catch (err) {
        console.warn("resolveToObjectId lookup failed for:", str, err.message);
        return null;
    }
};

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

        let userCart = await cartModel.findOne({ userId });

        if (!userCart) {
            userCart = new cartModel({
                userId,
                items: []
            });
        }

        // Checkout sends replace=true because browser cart is the source of truth
        if (req.body.replace === true) {
            const resolvedItems = [];
            for (const item of localCart) {
                const rawId = item.id || item.productId || item._id;
                const pid = await resolveToObjectId(rawId);
                if (pid) {
                    resolvedItems.push({
                        productId: pid,
                        qty: Math.max(1, Number(item.qty) || 1),
                    });
                }
            }

            userCart.items = resolvedItems;
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

        // Incremental sync
        for (const cartItem of localCart) {
            const rawId = cartItem.id || cartItem.productId || cartItem._id;
            const pid = await resolveToObjectId(rawId);
            const qty = Number(cartItem.qty) || 1;
            if (!pid || qty < 1) continue;

            const existingItem = userCart.items.find((item) => {
                const currentPid = item.productId?._id || item.productId;
                return String(currentPid) === String(pid);
            });

            if (existingItem) {
                existingItem.qty += qty;
            } else {
                userCart.items.push({
                    productId: pid,
                    qty,
                });
            }
        }

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

        const pid = await resolveToObjectId(id);
        if (!pid) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const safeQty = Math.max(1, Number(qty) || 1);

        let userCart = await cartModel.findOne({ userId });

        if (!userCart) {
            userCart = new cartModel({ userId, items: [] });
        }

        const existingItem = userCart.items.find((item) => {
            const currentPid = item.productId?._id || item.productId;
            return String(currentPid) === String(pid);
        });

        if (existingItem) {
            existingItem.qty += safeQty;
        } else {
            userCart.items.push({ productId: pid, qty: safeQty });
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
