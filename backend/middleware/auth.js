export default async function authMiddleware(req, res, next) {
  const user = req.session.user;
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized access" });
  }
  next();
}
