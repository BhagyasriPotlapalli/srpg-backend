import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { successResponse, errorResponse } from "../utils/responseUtils.js";

/**
 * Admin Login
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return errorResponse(res, 400, "Email and password are required");
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (!admin) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    if (admin.role !== "admin") {
      return errorResponse(res, 403, "Admin access only");
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return successResponse(res, 200, "Admin login successful", {
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Admin Profile
 * GET /api/auth/me
 */
export const getProfile = async (req, res, next) => {
  try {
    const admin = req.user;

    return successResponse(res, 200, "Admin profile retrieved successfully", {
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
