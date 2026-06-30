const { syncCart } = require("../controllers/cartController");
const { protect } = require("../middleware/auth");
const cartRouter = require("express").Router();


cartRouter.post("/sync", protect, syncCart)

module.exports = cartRouter;