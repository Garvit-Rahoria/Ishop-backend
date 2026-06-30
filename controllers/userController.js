
const cryptr = require('cryptr');
const Cryptr = new cryptr(process.env.SECRET_KEY);
const sendOtpMail = require("../utils/sendOtpMail")
const userModel = require("../models/userModel");
const { sendBadRequest, sendCreated, sendNotFound, sendServerError, sendConflict, sendSuccess, sendOk } = require("../utils/response");
const generateToken = require('../utils/generateOtp');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return sendBadRequest(res, "Name, email and password are required");
        }
        const userExists = await userModel.findOne({ email });
        if (userExists) {
            return sendConflict(res, "User with this email already exists");
        }
        const encryptedPass = Cryptr.encrypt(password);
        const otp = Math.floor(100000 + Math.random() * 900000)
        const newUser = await userModel.create({
            name,
            email,
            password: encryptedPass,
            otp: otp,
            otpExpire: new Date(Date.now() + 3 * 60 * 1000)
        });

        const mailResponse = await sendOtpMail(email, otp);

        return sendCreated(res, "User Registered Successfully!", { id: newUser._id, name: newUser.name, email: newUser.email });

    } catch (error) {
        const message = error?.message || "Internal Server Error"
        sendServerError(res, message)
        console.log(error, message)
    }
}


const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            return sendConflict(res, "User not found")
        }
        if (user.isVerified) {
            return sendBadRequest(res, "Email is already verified");
        }
        if (user.otp !== parseInt(otp)) {
            return sendBadRequest(res, "Invalid OTP")
        }
        if (user.otpExpire < Date.now()) {
            return sendBadRequest(res, "OTP has expired")
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();
        return sendSuccess(res, "Email verified Successfully")

    } catch (error) {
        return sendServerError(res, error)
    }
}

const resetOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            return sendConflict(res, "User not found");
        }
        const otp = Math.floor(100000 + Math.random() * 900000);
        user.otp = otp;
        user.otpExpire = Date.now() + 3 * 60 * 1000;
        await user.save()

        const mailResponse = await sendOtpMail(email, otp);
        console.log(mailResponse)
        return sendSuccess(res, "OTP reset successfully!")
    } catch (error) {
        return sendServerError(res, error)
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return sendBadRequest(res, "email and password are required");
        }
        const user = await userModel.findOne({ email });
        if (!user || user.isVerified === false) {
            return sendBadRequest(res, "User not found");
        }

        const decryptedPass = Cryptr.decrypt(user.password);
        if (decryptedPass !== password) {
            return sendBadRequest(res, "Wrong Password")
        }
        const token = generateToken(user._id)

        res.cookie('jwt', token, {
            maxAge: 30 * 24 * 60 * 60 * 1000,  // 30d
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });


        return sendSuccess(res, "User Login Successfully!", { id: user._id, name: user.name, email: user.email });

    } catch (error) {
        const message = error?.message || "Internal Server Error"
        sendServerError(res, message)
        console.log(error, message)
    }
}
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
            secure: false,
            sameSite: "lax"
        });

        return sendSuccess(res, "User Logout Successfully!");

    } catch (error) {
        return sendServerError(res, error.message);
    }
};





const addAddress = async (req, res) => {
    try {

        
        const userId = req.user._id


        const { fullName, mobile, pincode, addressLine, city, state, country } = req.body
        const user = await userModel.findById({ _id: userId })
        console.log(fullName, mobile, pincode, addressLine, city, state, country)

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            })
        }
        user.addresses.push({
            fullName, mobile, pincode, addressLine, city, state, country
        })


        await user.save()
        res.status(200).json({
            message: "Address Addedd Successfully",
            success: true,
            addresses: user.addresses
        })
        console.log(req.user)
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}


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


module.exports = {
    register, verifyEmail, resetOtp, login, getMe, logout, addAddress
}