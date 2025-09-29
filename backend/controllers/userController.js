import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import validator from "validator";

export async function signup(req, res) {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all fields.",
      });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists!" });

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email!",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.json({ success: true, message: "Signed up successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to signup, please try again",
    });
  }
}

export async function signin(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email or Password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    req.session.user = { _id: user._id, name: user.name, email: user.email };
    res.json({ success: true, message: "Logged in successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to login, please try again",
    });
  }
}

export function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: err.message || "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out successfully" });
  });
}

export function checkSession(req, res) {
  const user = req.session.user;
  if (user) return res.json({ success: true, user });
  res.json({ success: false });
}

export async function updateUserInfo(req, res) {
  const user = req.session.user;
  const { name, email } = req.body;

  try {
    const updates = {};

    if (name) {
      updates.name = name;
    }

    if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email!",
        });
      }

      const emailExists = await User.findOne({ email });
      if (emailExists && user.email !== email)
        return res
          .status(400)
          .json({ success: false, message: "Email already exists!" });

      updates.email = email;
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, updates, {
      new: true,
    }).select("-password");

    req.session.user = updatedUser;
    res.json({
      success: true,
      user: updatedUser,
      message: "User information updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update user",
    });
  }
}
