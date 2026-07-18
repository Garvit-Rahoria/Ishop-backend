const { syncCart, addToCart } = require("../controllers/cartController");
const { protect } = require("../middleware/auth");
const cartRouter = require("express").Router();

cartRouter.post("/sync",   protect, syncCart);
cartRouter.post("/add",    protect, addToCart);

module.exports = cartRouter;
