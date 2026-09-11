const dashboardRouter = require("express").Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { protect, authorized } = require("../middleware/auth");

dashboardRouter.get(
    "/",
    protect,
    authorized("admin", "superAdmin"),
    getDashboardStats
);

module.exports = dashboardRouter;
