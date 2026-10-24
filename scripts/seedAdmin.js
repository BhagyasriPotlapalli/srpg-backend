import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Admin from "../models/Admin.js";
import mongoose from "mongoose";

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@srpg.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
    const adminName = process.env.ADMIN_NAME || "SR PG Admin";

    let admin = await Admin.findOne({ email: adminEmail });

    if (admin) {
      console.log(`Admin account already exists: ${admin.email}`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin = await Admin.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      console.log(`Admin account created successfully: ${admin.email}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
