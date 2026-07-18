const categoryRouter = require("express").Router();
const { create, read, getById, status, deleteById, readById, update } = require("../controllers/categoryController");
const { protect, authorized } = require("../middleware/auth");
const { uploadSingle } = require("../middleware/upload");

// Auth runs first (reads headers only, doesn't need body).
// Upload runs after auth so we don't parse multipart from unauthorized requests.
const adminGuard = [protect, authorized("admin", "superAdmin")];

categoryRouter.post("/create",   ...adminGuard, uploadSingle("image"), create);
categoryRouter.get("/",          read);
categoryRouter.get("/:id",       readById);
categoryRouter.patch("/status-update/:id", ...adminGuard, status);
categoryRouter.delete("/delete/:id",       ...adminGuard, deleteById);
categoryRouter.put("/update/:id", ...adminGuard, uploadSingle("image"), update);

module.exports = categoryRouter;
