const colorRouter = require("express").Router()
const { create, read, status, deleteById, update, readById } = require("../controllers/colorController")
const { protect, authorized } = require("../middleware/auth")

const adminGuard = [protect, authorized("admin", "superAdmin")]

colorRouter.post("/create", ...adminGuard, create)
colorRouter.get("/", read)
colorRouter.get("/:id", readById)
colorRouter.patch("/status-update/:id", ...adminGuard, status)
colorRouter.delete("/delete/:id", ...adminGuard, deleteById)
colorRouter.put("/update/:id", ...adminGuard, update)

module.exports = colorRouter;
