import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import validator from "validator";
import axios from "axios";
import crypto from "crypto";

import "dotenv/config.js";

function trimInput(input) {
  return typeof input === "string" ? input.trim() : "";
}

export async function signup(req, res) {
  const name = trimInput(req.body.name);
  const email = trimInput(req.body.email);
  const password = trimInput(req.body.password);

  try {
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all fields.",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email!",
      });
    }

    const normalizedEmail = validator.normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email!",
      });
    }

    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists!" });
    }

    if (name.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 3 characters long",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0,
      })
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name,
      email: normalizedEmail,
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
  const email = trimInput(req.body.email);
  const password = trimInput(req.body.password);

  try {
    const normalizedEmail = validator.normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }
    const user = await User.findOne({ email: normalizedEmail });
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

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      githubUsername: user.githubUsername,
    };
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

export async function changePassword(req, res) {
  const user = req.session.user;
  const oldPassword = trimInput(req.body.oldPassword);
  const newPassword = trimInput(req.body.newPassword);
  const confirmPassword = trimInput(req.body.confirmPassword);

  try {
    const dbUser = await User.findById(user._id);
    if (dbUser.githubId) {
      return res.status(403).json({
        success: false,
        message: "Password change not available for GitHub-authenticated users",
      });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, dbUser.password);
    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid old password",
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the old password",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    if (
      !validator.isStrongPassword(newPassword, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0,
      })
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least one uppercase letter, one lowercase letter, and one number",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { password: hashedPassword },
      { new: true }
    ).select("-password");

    req.session.regenerate((err) => {
      if (err) console.error("Failed to regenerate session:", err);
    });

    res.json({
      success: true,
      message: "Password changed successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to change password, please try again",
    });
  }
}

export async function updateUserInfo(req, res) {
  const user = req.session.user;
  const name = trimInput(req.body.name);
  const email = trimInput(req.body.email);

  try {
    const updates = {};

    if (name) {
      if (name.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 3 characters long",
        });
      }
      updates.name = name;
    }

    if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email!",
        });
      }

      const normalizedEmail = validator.normalizeEmail(email);
      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email!",
        });
      }

      const emailExists = await User.findOne({ email: normalizedEmail });
      if (emailExists && user.email !== normalizedEmail)
        return res
          .status(400)
          .json({ success: false, message: "Email already exists!" });

      updates.email = normalizedEmail;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({
        success: false,
        message: "Nothing updated",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, updates, {
      new: true,
    }).select("-password");

    req.session.user = updatedUser;

    res.json({
      success: true,
      message:
        updates.name !== user.name && updates.email !== user.email
          ? "User information updated successfully"
          : updates.name !== user.name
          ? "Name updated successfully"
          : "Email updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update user",
    });
  }
}

export function redirectToGitHubAuth(req, res) {
  const mode = req.query.mode || "login";
  const redirect = req.query.redirect || process.env.FRONT_END_ORIGIN;

  const state = crypto.randomBytes(16).toString("hex");
  req.session.githubState = state;
  req.session.githubRedirect = redirect;

  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${
    process.env.GITHUB_CLIENT_ID
  }&scope=${encodeURIComponent(
    "read:user user:email repo"
  )}&redirect_uri=http://localhost:${
    process.env.PORT
  }/auth/github/callback?mode=${mode}&state=${state}`;
  res.redirect(redirectUri);
}

export async function githubCallback(req, res) {
  const { code, state, error } = req.query;

  const mode = req.query.mode || "login";
  const redirectBack =
    req.session.githubRedirect || process.env.FRONT_END_ORIGIN;

  if (error === "access_denied") {
    console.warn("GitHub OAuth cancelled by user.");
    delete req.session.githubRedirect;
    return res.redirect(redirectBack);
  }

  if (!code || !state || state !== req.session.githubState) {
    console.warn("Invalid GitHub OAuth state.");
    return res.redirect(redirectBack);
  }

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error("Failed to obtain access token");

    const [userResponse, emailsResponse] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const primaryEmail =
      emailsResponse.data.find((email) => email.primary)?.email ||
      emailsResponse.data?.[0]?.email ||
      userResponse.data.email ||
      null;

    if (!primaryEmail) {
      const errorMsg = encodeURIComponent(
        "No valid email found from your GitHub account. Please verify your email on GitHub first"
      );
      return res.redirect(`${redirectBack}?github_error=${errorMsg}`);
    }

    let user;

    if (mode === "login") {
      user = await User.findOne({ githubId: userResponse.data.id });

      if (!user) {
        user = await User.findOne({ email: primaryEmail });

        if (user) {
          user.githubId = userResponse.data.id;
          user.githubUsername = userResponse.data.login;
          user.githubAccessToken = accessToken;
          await user.save();
        } else {
          user = new User({
            name: userResponse.data.name || userResponse.data.login,
            email: primaryEmail,
            githubId: userResponse.data.id,
            githubUsername: userResponse.data.login,
            githubAccessToken: accessToken,
          });
          await user.save();
        }
      } else {
        user.githubAccessToken = accessToken;
        await user.save();
      }

      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        githubUsername: user.githubUsername,
      };
    } else if (mode === "link") {
      const currentUser = req.session.user;
      if (!currentUser) {
        const errorMsg = encodeURIComponent(
          "You must be logged in to link your GitHub account"
        );
        return res.redirect(`${redirectBack}?github_error=${errorMsg}`);
      }

      if (currentUser.githubId) {
        const errorMsg = encodeURIComponent(
          "You already have a GitHub account linked to your account"
        );
        return res.redirect(`${redirectBack}?github_error=${errorMsg}`);
      }

      const existingGitHubUser = await User.findOne({
        githubId: userResponse.data.id,
      });
      if (
        existingGitHubUser &&
        existingGitHubUser._id.toString() !== currentUser._id.toString()
      ) {
        const errorMsg = encodeURIComponent(
          "This GitHub account is already linked to another user"
        );
        return res.redirect(`${redirectBack}?github_error=${errorMsg}`);
      }

      user = await User.findByIdAndUpdate(
        currentUser._id,
        {
          githubId: userResponse.data.id,
          githubUsername: userResponse.data.login,
          githubAccessToken: accessToken,
        },
        { new: true }
      );
      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        githubUsername: user.githubUsername,
      };
    }

    req.session.save((err) => {
      if (err) console.error("Session save error", err);
      const successMsg = encodeURIComponent(
        "GitHub account linked successfully!"
      );
      res.redirect(
        `${
          mode === "login" ? process.env.FRONT_END_ORIGIN : redirectBack
        }?github_success=${successMsg}`
      );
    });
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    const errorMsg = encodeURIComponent(
      error.message || "Failed to authenticate with GitHub. Please try again"
    );
    return res.redirect(`${redirectBack}?github_error=${errorMsg}`);
  } finally {
    delete req.session.githubState;
  }
}

export async function unlinkGitHub(req, res) {
  try {
    const user = await User.findById(req.session.user._id);

    if (!user.githubId) {
      return res.status(400).json({
        success: false,
        message: "No GitHub account linked to your account",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Set a password before unlinking your GitHub account",
      });
    }

    user.githubId = undefined;
    user.githubUsername = undefined;
    user.githubAccessToken = undefined;
    await user.save();

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
    };

    res.json({
      success: true,
      message: "GitHub account unlinked successfully!",
      user: req.session.user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to unlink GitHub account",
    });
  }
}
