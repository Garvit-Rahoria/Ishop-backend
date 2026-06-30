const brandRouter = require("express").Router()
const { create, read, getById, status, deleteById,update,
     readById
} = require("../controllers/brandController")

const fileUploader = require("express-fileupload")
brandRouter.post("/create", fileUploader({ createParentPath: true }), create)
brandRouter.get("/", read)
brandRouter.get("/:id", readById)
brandRouter.get("/:id", getById)
brandRouter.patch("/status-update/:id", status)
brandRouter.delete("/delete/:id", deleteById)
brandRouter.put("/update/:id", fileUploader({ createParentPath: true }), update)

module.exports = brandRouter;