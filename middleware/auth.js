var jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const protect = async (req, res, next) => {
    try {
        let token = null;

        // Prefer Authorization (localStorage Bearer) over cookie —
        // stale cookies from another login must not override a fresh admin token
        const authHeader = req.headers.authorization;
        if (authHeader) {
            token = authHeader.startsWith("Bearer ")
                ? authHeader.slice(7)
                : authHeader;
        }

        if (!token && req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token is missing"
            });
        }
        //Verify token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        //find user
        const user = await userModel.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }
        // Attach user to request
        req.user = user;

        next();



    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
            error: error.message
        });
    }
};

// Authorization Middlerware (Role-based)
function authorized(...roles) {
    // admin , superAdmin
    return (req, res, next) => {
        // console.log(roles)
        try {
            if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }
        // console.log(req.user)
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Not Authorized"
            })
        }
        next()
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Server error"
            })
        }
    }

}

module.exports = { protect, authorized };