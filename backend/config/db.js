import mongoose from "mongoose";
import "dotenv/config.js";

export default async function connectDB() {
  await mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => console.log(err));
}
