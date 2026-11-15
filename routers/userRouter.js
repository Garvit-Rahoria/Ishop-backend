const userRouter = require("express").Router()
const {
    register,
    verifyEmail,
    resetOtp,
    login,
    getMe,
    logout,
    addAddress,
    deleteAddress,
    getAllUsers,
    toggleUserStatus,
    updateUserRole,
    deleteUser
} = require("../controllers/userController")
const { protect, authorized } = require("../middleware/auth")

userRouter.post("/register", register)
userRouter.post("/verify-otp", verifyEmail)
userRouter.post("/reset-otp", resetOtp)
userRouter.post("/login", login)
userRouter.get("/get", protect, getMe)
userRouter.post("/logout", logout)
userRouter.post("/addAddress", protect, addAddress)
userRouter.delete("/address/:addressIndex", protect, deleteAddress)

// Admin User Management Endpoints
userRouter.get("/all", protect, authorized("admin", "superAdmin"), getAllUsers)
userRouter.patch("/status/:id", protect, authorized("admin", "superAdmin"), toggleUserStatus)
userRouter.patch("/role/:id", protect, authorized("admin", "superAdmin"), updateUserRole)
userRouter.delete("/delete/:id", protect, authorized("admin", "superAdmin"), deleteUser)

module.exports = userRouter;