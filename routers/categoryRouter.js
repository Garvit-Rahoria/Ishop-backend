const categoryRouter = require("express").Router()
const { create, read, getById, status, deleteById, readById, update } = require("../controllers/categoryController")
const fileUploader = require("express-fileupload")
const { protect, authorized } = require("../middleware/auth")

categoryRouter.post("/create", fileUploader({ createParentPath: true }), protect, authorized("admin", "superAdmin"), create)
categoryRouter.get("/", read)
categoryRouter.get("/:id", readById)
categoryRouter.get("/:id", getById)
categoryRouter.patch("/status-update/:id", protect, authorized("admin", "superAdmin"), status)
categoryRouter.delete("/delete/:id", protect, authorized("admin", "superAdmin"), deleteById)
categoryRouter.put("/update/:id", fileUploader({ createParentPath: true }), protect, authorized("admin", "superAdmin"), update)

module.exports = categoryRouter;