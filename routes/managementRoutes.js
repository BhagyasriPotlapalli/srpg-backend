import express from "express";
import {
  createResource,
  getResources,
  updateResource,
  deleteResource,
} from "../controllers/managementController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateAdmin);

router.post("/create", createResource);
router.get("/", getResources);
router.put("/:id", updateResource);
router.put("/", updateResource);
router.delete("/:id", deleteResource);
router.delete("/", deleteResource);

export default router;
