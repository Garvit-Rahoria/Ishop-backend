const productRouter = require("express").Router();
const { create, read, readById, add_images, delete_image, status, deleteById, update } = require("../controllers/productController");
const { protect, authorized } = require("../middleware/auth");
const { uploadSingle, uploadMultiple } = require("../middleware/upload");

const adminGuard = [protect, authorized("admin", "superAdmin")];

productRouter.post("/create",             ...adminGuard, uploadSingle("thumbnail"),    create);
productRouter.get("/",                    read);
productRouter.get("/:id",                 readById);
productRouter.post("/add-images/:id",     ...adminGuard, uploadMultiple("images", 10), add_images);
productRouter.put("/remove_image/:id",    ...adminGuard, delete_image);
productRouter.patch("/status-update/:id", ...adminGuard, status);
productRouter.delete("/delete/:id",       ...adminGuard, deleteById);
productRouter.put("/update/:id",          ...adminGuard, uploadSingle("thumbnail"),    update);

module.exports = productRouter;
