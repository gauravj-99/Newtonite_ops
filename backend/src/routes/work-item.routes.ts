import { Router } from "express";

import { claimWorkItem } from "../controllers/work.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireWorkItemAccess } from "../middleware/authorize.middleware";

const router = Router();

router.use(authenticate);

router.post("/:id/claim", requireWorkItemAccess("id"), claimWorkItem);

export default router;
