const productRouter = require("express").Router()
const { create, read, readById, add_images,delete_image,status,deleteById,update //, getById, 
} = require("../controllers/productController")

const fileUploader = require("express-fileupload")
productRouter.post("/create", fileUploader({ createParentPath: true }), create)
productRouter.get("/", read)
productRouter.get("/:id", readById)
productRouter.put("/remove_image/:id", delete_image)
productRouter.post("/add-images/:id",fileUploader({ createParentPath: true }), add_images)
// productRouter.get("/:id", getById)
productRouter.patch("/status-update/:id", status)
productRouter.delete("/delete/:id", deleteById)
productRouter.put("/update/:id", fileUploader({ createParentPath: true }), update)

module.exports = productRouter;