const cartModel = require("../models/cartModel");


const syncCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const localCart = JSON.parse(req.body.localCart) || [];

        if (localCart.length === 0) {
            const userCart = await cartModel.findOne({ userId }).populate({
                path: "items.productId",
                select: "name _id orginal_price final_price discount_percentage price thumbnail"
            });

            return res.status(200).json({
                message: "Fetched cart from server",
                success: true,
                cart: userCart ? userCart.items : [],
                imageBaseUrl: process.env.PRODUCT_IMAGE_BASE_URL || `${process.env.BACKEND_URL || ''}/product`
            });
        }

        let userCart = await cartModel.findOne({ userId })
            .populate({
                path: "items.productId",
                select: "name _id orginal_price final_price discount_percentage price thumbnail stock"
            });

        // if no cart -> create new
        if (!userCart) {
            userCart = new cartModel({
                userId,
                items: []
            });
            
        }

        // Merge local cart into DB cart
        localCart.forEach((cartItem) => {
            const { id, qty } = cartItem;
            const existingItem = userCart.items.find(
                (item) => {
                    return item.productId._id == id
                }
            )

            if (existingItem) {
                existingItem.qty += qty;
            } else {
                userCart.items.push({
                    productId: id,
                    qty
                });
            }
        })

        await userCart.save();

        res.status(200).json({
            message: "Cart synced Successfully!",
            success: true,
            cart: userCart,
            imageBaseUrl: process.env.PRODUCT_IMAGE_BASE_URL || `${process.env.BACKEND_URL || ''}/product`
        });

    } catch (error) {
        console.log(error)
    }
}

const addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id, qty = 1 } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Product id is required" });
        }

        // Find or create cart for this user
        let userCart = await cartModel.findOne({ userId });

        if (!userCart) {
            userCart = new cartModel({ userId, items: [] });
        }

        const existingItem = userCart.items.find(
            (item) => item.productId.toString() === id.toString()
        );

        if (existingItem) {
            existingItem.qty += qty;
        } else {
            userCart.items.push({ productId: id, qty });
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
    syncCart,addToCart
}