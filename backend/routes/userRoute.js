import express from "express";
import {
  signin,
  signup,
  logout,
  updateUserInfo,
  checkSession,
  changePassword,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/register", signup);
userRouter.post("/login", signin);
userRouter.post("/logout", authMiddleware, logout);
userRouter.get("/checkSession", checkSession);
userRouter.patch("/changePassword", authMiddleware, changePassword);
userRouter.patch("/updateUserInfo", authMiddleware, updateUserInfo);

export default userRouter;
