
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Admin from "../models/Admin.js";

async function resetAdminPassword() {
  try {
    await connectDB();

    const email = "admin@srpg.com";
    const newPassword = process.env.ADMIN_PASSWORD;

    if (!newPassword || newPassword.length < 12) {
      throw new Error(
        "Set ADMIN_PASSWORD to a strong password of at least 12 characters."
      );
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      throw new Error(`Admin not found: ${email}`);
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    await admin.save();

    console.log(`Password reset successfully for ${email}`);
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

resetAdminPassword();
