import express from "express";
import {
  signin,
  signup,
  logout,
  updateUserInfo,
  checkSession,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/register", signup);
userRouter.post("/login", signin);
userRouter.post("/logout", logout);
userRouter.get("/checkSession", checkSession);
userRouter.put("/updateUserInfo", authMiddleware, updateUserInfo);

export default userRouter;
