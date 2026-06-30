const userRouter = require("express").Router()
const { register, verifyEmail, resetOtp, login, getMe,logout,addAddress,updateProfile } = require("../controllers/userController")
const { protect } = require("../middleware/auth")

userRouter.post("/register", register)
userRouter.post("/verify-otp", verifyEmail)
userRouter.post("/reset-otp", resetOtp)
userRouter.post("/login", login)
userRouter.get("/get",protect, getMe)
userRouter.post("/logout", logout)
userRouter.post("/addAddress",protect, addAddress)
// userRouter.put('/updateProfile', protect, updateProfile);

module.exports = userRouter;