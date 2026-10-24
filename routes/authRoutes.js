import express from "express";
import { login, getProfile } from "../controllers/authController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", authenticateAdmin, getProfile);

export default router;
