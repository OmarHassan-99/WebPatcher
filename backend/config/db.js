import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import "./env.js";

export default async function connectDB() {
  try {
    let uri = process.env.MONGODB_URI;
    
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log("Connected to MongoDB natively");
    } catch (e) {
      console.log("Native MongoDB connection failed, falling back to MongoMemoryServer...");
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log("Connected to MongoDB (Memory Server)");
    }
  } catch (err) {
    console.error("MongoDB connection failed:", err?.message || err);
    throw err;
  }
}
