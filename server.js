require('dotenv').config()
const express = require("express")
const cors = require("cors")
const cookieParser = require('cookie-parser')
const mongoose = require("mongoose")

const app = express()

// ---------------------------------------------------------------------------
// CORS — reads from FRONTEND_URL and/or CORS_ORIGINS (comma-separated)
// Local dev:   CORS_ORIGINS=http://localhost:3000
// Production:  FRONTEND_URL=https://swoo-techmart-gilt.vercel.app
// ---------------------------------------------------------------------------
const rawOrigins = [
    process.env.FRONTEND_URL  || "",
    process.env.CORS_ORIGINS  || "",
    process.env.ADMIN_URL     || "",
].join(",");

const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...rawOrigins
        .split(",")
        .map((o) => o.trim().replace(/\/+$/, ""))
        .filter(Boolean),
].filter((v, i, a) => v && a.indexOf(v) === i); // deduplicate

console.log("✅ Allowed CORS origins:", allowedOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        const normalizedOrigin = origin ? origin.trim().replace(/\/+$/, "") : undefined;
        // Allow server-to-server / Postman / health-check (no Origin header)
        if (!normalizedOrigin) return callback(null, true);

        if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }

        console.warn("🚫 CORS blocked origin:", origin);
        return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    optionsSuccessStatus: 204,
};

// Apply CORS before everything else — including preflight OPTIONS
app.use(cors(corsOptions));

// Explicit preflight handler for all routes (required for Express 5 + path-to-regexp v8)
app.options(/.*/, cors(corsOptions));

app.use(cookieParser())
app.use(express.static("public"))
app.use(express.json())

app.use("/api/category", require("./routers/categoryRouter"))
app.use("/api/brand",    require("./routers/brandRouter"))
app.use("/api/color",    require("./routers/colorRouter"))
app.use("/api/product",  require("./routers/productRouter"))
app.use("/api/user",     require("./routers/userRouter"))
app.use("/api/cart",     require("./routers/cartRouter"))
app.use("/api/order",    require("./routers/orderRouter"))

// Health check
app.get("/", (req, res) => {
    res.send("API is running ✅")
})

// ---------------------------------------------------------------------------
// Global error handler — always re-injects CORS headers so the browser
// can read the actual error body instead of seeing a CORS failure on 4xx/5xx
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
    const origin = req.headers.origin;
    const normalizedOrigin = origin ? origin.trim().replace(/\/+$/, "") : undefined;
    if (normalizedOrigin && allowedOrigins.includes(normalizedOrigin)) {
        res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
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
