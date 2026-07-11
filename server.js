require('dotenv').config()
const express = require("express")
const cors = require("cors")
const cookieParser = require('cookie-parser')
const mongoose = require("mongoose")

const app = express()

app.use(cookieParser())
app.use(express.static("public"))
app.use(express.json())
const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3000";
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server requests (no origin) and listed origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true
}))

app.use("/api/category", require("./routers/categoryRouter"))
app.use("/api/brand", require("./routers/brandRouter"))
app.use("/api/color", require("./routers/colorRouter"))
app.use("/api/product", require("./routers/productRouter"))
app.use("/api/user", require("./routers/userRouter"))
app.use("/api/cart", require("./routers/cartRouter"))
app.use("/api/order", require("./routers/orderRouter"))

// ✅ Health check - Render verify karega
app.get("/", (req, res) => {
    res.send("API is running ✅")
})

mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("✅ Database Connected")

        // ✅ 10000 fallback - Render ke liye
        const PORT = process.env.PORT || 10000

        // ✅ 0.0.0.0 - Render requirement
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server Started on port ${PORT}`)
        })
    })
    .catch((error) => {
        console.log("❌ Database not Connected")
        console.log("❌ Reason:", error.message) // ← Actual error dikhega
    })