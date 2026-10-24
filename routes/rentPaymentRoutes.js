import express from "express";
import {
  recordPayment,
  getPayments,
  getRentSummary,
} from "../controllers/rentPaymentController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateAdmin);

router.post("/", recordPayment);
router.get("/", getPayments);
router.get("/summary/:tenantId", getRentSummary);

export default router;
