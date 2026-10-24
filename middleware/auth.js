import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { errorResponse } from "../utils/responseUtils.js";

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const isManagementOrTenantPut =
      req.originalUrl.startsWith("/api/management") ||
      (req.originalUrl.startsWith("/api/tenants") && req.method === "PUT");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const msg = isManagementOrTenantPut
        ? "Authentication token is missing or invalid"
        : "Authentication token is required";
      return errorResponse(res, 401, msg);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      const msg = isManagementOrTenantPut
        ? "Authentication token is missing or invalid"
        : "Authentication token is required";
      return errorResponse(res, 401, msg);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      const msg = isManagementOrTenantPut
        ? "Authentication token is missing or invalid"
        : "Invalid or expired token";
      return errorResponse(res, 401, msg);
    }

    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return errorResponse(res, 403, "Admin access only");
    }

    if (admin.role !== "admin") {
      return errorResponse(res, 403, "Admin access only");
    }

    req.user = admin;
    next();
  } catch (error) {
    return errorResponse(res, 500, error.message || "Authentication error");
  }
};
