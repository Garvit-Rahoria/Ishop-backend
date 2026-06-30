const colorRouter = require("express").Router()
const { create, read, getById, status, deleteById, update 
   , readById
} = require("../controllers/colorController")

colorRouter.post("/create", create)
colorRouter.get("/", read)
colorRouter.get("/:id", readById)
colorRouter.get("/:id", getById)
colorRouter.patch("/status-update/:id", status)
colorRouter.delete("/delete/:id", deleteById)
colorRouter.put("/update/:id", update)

module.exports = colorRouter;