
const cryptr = require('cryptr');
const Cryptr = new cryptr(process.env.SECRET_KEY);
const sendOtpMail = require("../utils/sendOtpMail")
const userModel = require("../models/userModel");
const orderModel = require("../models/orderModel");
const { sendBadRequest, sendCreated, sendNotFound, sendServerError, sendConflict, sendSuccess, sendOk } = require("../utils/response");
const generateToken = require('../utils/generateOtp');

const isProd = process.env.NODE_ENV === "production";
const authCookieOptions = {
    httpOnly: true,
    // localhost HTTP pe secure cookies set nahi hote
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
};
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return sendBadRequest(res, "Name, email and password are required");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const userExists = await userModel.findOne({ email: normalizedEmail });

        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const encryptedPass = Cryptr.encrypt(password);

        let userRecord = null;

        if (userExists) {
            // If already registered and verified, prompt login
            if (userExists.isVerified) {
                return sendConflict(res, "User with this email already exists. Please login.");
            }
            // If registered but not verified yet, refresh details & generate fresh OTP!
            userExists.name = name;
            userExists.password = encryptedPass;
            userExists.otp = otp;
            userExists.otpExpire = otpExpire;
            await userExists.save();
            userRecord = userExists;
        } else {
            userRecord = await userModel.create({
                name,
                email: normalizedEmail,
                password: encryptedPass,
                otp: otp,
                otpExpire: otpExpire,
            });
        }

        const mailResult = await sendOtpMail(normalizedEmail, otp);

        const successMessage = mailResult.success
            ? "User Registered Successfully! An OTP has been sent to your email."
            : `User Registered! (Email delivery failed: ${mailResult.message}). Dev OTP: ${otp}`;

        return sendCreated(res, successMessage, {
            id: userRecord._id,
            name: userRecord.name,
            email: userRecord.email,
            devOtp: mailResult.success ? undefined : otp,
            emailSent: mailResult.success,
        });

    } catch (error) {
        const message = error?.message || "Internal Server Error";
        console.error("Register error:", error);
        return sendServerError(res, message);
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return sendBadRequest(res, "Email and OTP are required");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await userModel.findOne({ email: normalizedEmail });
        if (!user) {
            return sendConflict(res, "User not found");
        }
        if (user.isVerified) {
            return sendBadRequest(res, "Email is already verified. Please login.");
        }
        if (String(user.otp).trim() !== String(otp).trim()) {
            return sendBadRequest(res, "Invalid OTP. Please check the 6-digit code.");
        }
        if (user.otpExpire && user.otpExpire < Date.now()) {
            return sendBadRequest(res, "OTP has expired. Please click Resend OTP.");
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();

        // Auto-login: generate token + set cookie
        const token = generateToken(user._id);
        res.cookie('jwt', token, authCookieOptions);

        return sendSuccess(res, "Email verified successfully! Welcome to Swoo Tech Mart.", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });

    } catch (error) {
        console.error("verifyEmail error:", error);
        return sendServerError(res, error.message);
    }
};

const resetOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return sendBadRequest(res, "Email is required to resend OTP");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await userModel.findOne({ email: normalizedEmail });
        if (!user) {
            return sendConflict(res, "User not found");
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        user.otp = otp;
        user.otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        const mailResult = await sendOtpMail(normalizedEmail, otp);

        const successMessage = mailResult.success
            ? "New OTP sent to your email successfully!"
            : `New OTP generated. (Email delivery failed: ${mailResult.message}). Dev OTP: ${otp}`;

        return sendSuccess(res, successMessage, {
            devOtp: mailResult.success ? undefined : otp,
            emailSent: mailResult.success,
        });
    } catch (error) {
        console.error("resetOtp error:", error);
        return sendServerError(res, error.message);
    }
};

const login = async (req, res) => {
    try {
        const { email, password, username } = req.body;
        const identifier = String(email || username || "").trim();

        if (!identifier || !password) {
            return sendBadRequest(res, "email/username and password are required");
        }

        let user = null;

        // Allow admin portal login with username "Admin"
        if (identifier.toLowerCase() === "admin") {
            user = await userModel.findOne({
                $or: [
                    { name: /^Admin$/i },
                    { email: "admin@swoo.com" },
                    { email: "admin" },
                ],
            });
        }

        if (!user) {
            user = await userModel.findOne({ email: identifier.toLowerCase() });
        }

        if (!user) {
            return sendBadRequest(res, "User not found");
        }

        if (user.isVerified === false) {
            return sendBadRequest(res, "Your email is not verified yet. Please enter the OTP to verify.", {
                requiresVerification: true,
                email: user.email,
            });
        }

        if (user.status === false) {
            return sendBadRequest(res, "Your account has been deactivated. Please contact support.");
        }

        let isPasswordMatch = false;

        try {
            if (user.password) {
                const decryptedPass = Cryptr.decrypt(user.password);
                if (decryptedPass === password) {
                    isPasswordMatch = true;
                }
            }
        } catch (decryptErr) {
            console.warn("Password decryption failed for:", user.email, decryptErr.message);
        }

        // Fallback: If password was saved in plain text
        if (!isPasswordMatch && user.password === password) {
            isPasswordMatch = true;
            try {
                user.password = Cryptr.encrypt(password);
                await user.save();
            } catch (_) {}
        }
        if (!isPasswordMatch) {
            return sendBadRequest(res, "Wrong Password");
        }

        const token = generateToken(user._id);
        res.cookie("jwt", token, authCookieOptions);

        return sendSuccess(res, "User Login Successfully!", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });
    } catch (error) {
        const message = error?.message || "Internal Server Error";
        sendServerError(res, message);
        console.log(error, message);
    }
};
const getMe = async (req, res) => {
    try {
        res.status(200).json({
            message: "User Find",
            success: true,
            user: req.user
        })

    } catch (error) {
        return sendServerError(res, error)
    }
}
const logout = async (req, res) => {
    try {

        res.clearCookie("jwt", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            path: "/",
        });

        return sendSuccess(res, "User Logout Successfully!");

    } catch (error) {
        return sendServerError(res, error.message);
    }
};





const addAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            fullName,
            mobile,
            pincode,
            addressLine,
            city,
            state,
            country = "India",
        } = req.body;

        if (!fullName || !mobile || !pincode || !addressLine || !city || !state) {
            return res.status(400).json({
                success: false,
                message: "All address fields are required",
            });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        user.addresses.push({
            fullName,
            mobile,
            pincode,
            addressLine,
            city,
            state,
            country: country || "India",
        });

        await user.save();

        return res.status(200).json({
            message: "Address Added Successfully",
            success: true,
            addresses: user.addresses,
            addAddress: user.addresses,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { addressIndex } = req.params;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const idx = parseInt(addressIndex, 10);
        if (isNaN(idx) || idx < 0 || idx >= user.addresses.length) {
            return res.status(400).json({ success: false, message: "Invalid address index" });
        }

        user.addresses.splice(idx, 1);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Address removed successfully",
            addresses: user.addresses,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


// const updateProfile = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const { fullName, email, mobile } = req.body;

//         const user = await userModel.findByIdAndUpdate(
//             userId,
//             { fullName, email, mobile },
//             { new: true }
//         ).select('-password');

//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         res.json({ success: true, message: 'Profile updated!', user });

//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };


const getAllUsers = async (req, res) => {
    try {
        const { q, role, status, isVerified } = req.query;
        const filter = {};

        if (role && role !== "all") {
            filter.role = role;
        }

        if (status && status !== "all") {
            filter.status = status === "true";
        }

        if (isVerified && isVerified !== "all") {
            filter.isVerified = isVerified === "true";
        }

        if (q) {
            const regex = new RegExp(q.trim(), "i");
            filter.$or = [
                { name: regex },
                { email: regex },
                { mobile: regex },
            ];
        }

        const [users, totalUsers, totalActive, totalAdmins, totalVerified] = await Promise.all([
            userModel.find(filter).select("-password -otp -otpExpire").sort({ createdAt: -1 }).lean(),
            userModel.countDocuments(),
            userModel.countDocuments({ status: true }),
            userModel.countDocuments({ role: { $in: ["admin", "superAdmin"] } }),
            userModel.countDocuments({ isVerified: true }),
        ]);

        // Aggregate orders per user to get orderCount & totalSpent
        const userIds = users.map((u) => u._id);
        const orderStats = await orderModel.aggregate([
            { $match: { user: { $in: userIds } } },
            {
                $group: {
                    _id: "$user",
                    orderCount: { $sum: 1 },
                    totalSpent: { $sum: "$totalAmount" },
                },
            },
        ]);

        const statsMap = {};
        orderStats.forEach((s) => {
            statsMap[String(s._id)] = {
                orderCount: s.orderCount || 0,
                totalSpent: s.totalSpent || 0,
            };
        });

        const data = users.map((u) => ({
            ...u,
            orderCount: statsMap[String(u._id)]?.orderCount || 0,
            totalSpent: statsMap[String(u._id)]?.totalSpent || 0,
        }));

        return sendSuccess(res, "Users fetched successfully", data, {
            total: totalUsers,
            totalActive,
            totalAdmins,
            totalVerified,
        });
    } catch (error) {
        console.error("getAllUsers error:", error);
        return sendServerError(res, error.message);
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.findById(id);
        if (!user) return sendNotFound(res, "User not found");

        // Protect admin accounts from status toggle
        if (user.role === "admin" || user.role === "superAdmin") {
            return sendBadRequest(res, "Admin accounts are protected and cannot be deactivated");
        }

        user.status = !user.status;
        await user.save();

        return sendSuccess(res, `User ${user.status ? "activated" : "deactivated"} successfully`, {
            _id: user._id,
            status: user.status,
        });
    } catch (error) {
        return sendServerError(res, error.message);
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!["user", "admin"].includes(role)) {
            return sendBadRequest(res, "Role must be user or admin");
        }

        const user = await userModel.findById(id);
        if (!user) return sendNotFound(res, "User not found");

        // Protect existing admin accounts
        if (user.role === "admin" || user.role === "superAdmin") {
            return sendBadRequest(res, "Admin role is fixed and cannot be changed");
        }

        user.role = role;
        await user.save();

        return sendSuccess(res, `User role updated to ${role}`, user);
    } catch (error) {
        return sendServerError(res, error.message);
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.findById(id);
        if (!user) return sendNotFound(res, "User not found");

        // Protect admin accounts from deletion
        if (user.role === "admin" || user.role === "superAdmin") {
            return sendBadRequest(res, "Admin accounts are protected and cannot be deleted");
        }

        await userModel.findByIdAndDelete(id);

        return sendSuccess(res, "User deleted successfully");
    } catch (error) {
        return sendServerError(res, error.message);
    }
};

module.exports = {
    register, verifyEmail, resetOtp, login, getMe, logout, addAddress, deleteAddress,
    getAllUsers, toggleUserStatus, updateUserRole, deleteUser
};
