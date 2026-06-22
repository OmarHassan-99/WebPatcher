import mongoose from "mongoose";
import "./env.js";

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection failed:", err?.message || err);
    throw err;
  }
}
