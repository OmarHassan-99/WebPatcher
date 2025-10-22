import express from "express";
import {
  signin,
  signup,
  logout,
  updateUserInfo,
  checkSession,
  changePassword,
  redirectToGitHubAuth,
  githubCallback,
  unlinkGitHub,
  deleteAccount,
  setPassword,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/register", signup);
userRouter.post("/login", signin);
userRouter.post("/logout", authMiddleware, logout);
userRouter.get("/checkSession", checkSession);
userRouter.patch("/changePassword", authMiddleware, changePassword);
userRouter.patch("/updateUserInfo", authMiddleware, updateUserInfo);

userRouter.get("/github", redirectToGitHubAuth);
userRouter.get("/github/callback", githubCallback);
userRouter.patch("/github/unlink", authMiddleware, unlinkGitHub);

userRouter.post("/set-password", authMiddleware, setPassword);
userRouter.post("/delete-account", authMiddleware, deleteAccount);

export default userRouter;
