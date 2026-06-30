require('dotenv').config()
const express = require("express")
const cors = require("cors")
let cookieParser = require('cookie-parser')
const mongoose = require("mongoose")
const app = express();
app.use(cookieParser())
app.use(express.static("public"))
app.use(express.json())
app.use(cors({
    origin: "http://localhost:3000",
    credentials:true
}))

app.use("/api/category",require("./routers/categoryRouter"))
app.use("/api/brand",require("./routers/brandRouter"))
app.use("/api/color",require("./routers/colorRouter"))
app.use("/api/product",require("./routers/productRouter"))
app.use("/api/user",require("./routers/userRouter"))
app.use("/api/cart", require("./routers/cartRouter"))
app.use("/api/order", require("./routers/orderRouter"))

mongoose.connect(process.env.MONGODB_URL).then(
    ()=>{
        console.log("Database Connected")

        app.listen(
            process.env.PORT,
            ()=>{
                console.log("Server Started")
            }
        )
    }

        
).catch(
    (error)=>{
        console.log("Database not Connected")
    }
)