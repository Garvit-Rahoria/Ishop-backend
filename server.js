require('dotenv').config()
const express = require("express")
const cors = require("cors")
const cookieParser = require('cookie-parser')
const mongoose = require("mongoose")

const app = express()

// ---------------------------------------------------------------------------
// CORS — read from env, fall back to known production + local origins
// On Render: set CORS_ORIGINS=https://swoo-techmart-gilt.vercel.app,http://localhost:3000
// ---------------------------------------------------------------------------
const rawOrigins =
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    "https://swoo-techmart-gilt.vercel.app,http://localhost:3000";

const allowedOrigins = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);

console.log("✅ Allowed CORS origins:", allowedOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow server-to-server / health-check requests (no origin header)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn("🚫 CORS blocked origin:", origin);
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

// Handle preflight OPTIONS for all routes before anything else
app.options("/(.*)", cors(corsOptions));
app.use(cors(corsOptions));

app.use(cookieParser())
app.use(express.static("public"))
app.use(express.json())

app.use("/api/category", require("./routers/categoryRouter"))
app.use("/api/brand", require("./routers/brandRouter"))
app.use("/api/color", require("./routers/colorRouter"))
app.use("/api/product", require("./routers/productRouter"))
app.use("/api/user", require("./routers/userRouter"))
app.use("/api/cart", require("./routers/cartRouter"))
app.use("/api/order", require("./routers/orderRouter"))

// ✅ Health check
app.get("/", (req, res) => {
    res.send("API is running ✅")
})

// ---------------------------------------------------------------------------
// Global error handler — must be last, always sends CORS headers so browser
// can read the actual error instead of getting a CORS failure on a 500
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    console.error("❌ Server error:", err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("✅ Database Connected")

        const PORT = process.env.PORT || 10000

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server Started on port ${PORT}`)
        })
    })
    .catch((error) => {
        console.log("❌ Database not Connected")
        console.log("❌ Reason:", error.message)
    })
