const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [
        {
            _id: false,
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            },
            qty: {
                type: Number,
                default: 1
            }
        }
    ]
});

const cartModel = mongoose.model("cart",cartSchema);
module.exports = cartModel;