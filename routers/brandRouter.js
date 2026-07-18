const brandRouter = require("express").Router();
const { create, read, getById, status, deleteById, update, readById } = require("../controllers/brandController");
const { protect, authorized } = require("../middleware/auth");
const { uploadSingle } = require("../middleware/upload");

const adminGuard = [protect, authorized("admin", "superAdmin")];

brandRouter.post("/create",  ...adminGuard, uploadSingle("image"), create);
brandRouter.get("/",         read);
brandRouter.get("/:id",      readById);
brandRouter.patch("/status-update/:id", ...adminGuard, status);
brandRouter.delete("/delete/:id",       ...adminGuard, deleteById);
brandRouter.put("/update/:id", ...adminGuard, uploadSingle("image"), update);

module.exports = brandRouter;
