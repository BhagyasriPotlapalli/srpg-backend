import express from "express";
import {
  getTenants,
  getFilterOptions,
  updateTenant,
  deleteTenant,
  getVacateReminders,
} from "../controllers/tenantController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateAdmin);

router.get("/vacate-reminders", getVacateReminders);
router.get("/filter-options", getFilterOptions);
router.get("/", getTenants);
router.put("/:id", updateTenant);
router.delete("/:id", deleteTenant);

export default router;
