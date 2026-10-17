import { Router } from "express";
import { Role } from "@prisma/client";

import { authenticate } from "../middleware/auth.middleware";
import {
  requireLeadOrAdmin,
  requireRole,
  requireTeamAccess,
  requireWorkItemAccess,
} from "../middleware/authorize.middleware";
import {
  approveWorkItem,
  createWorkItem,
  getWorkItem,
  listTeamWorkItems,
  updateWorkItem,
} from "../controllers/work.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/teams/:teamId/items",
  requireTeamAccess("teamId"),
  listTeamWorkItems
);

router.post(
  "/teams/:teamId/items",
  requireTeamAccess("teamId"),
  requireRole([Role.MEMBER, Role.LEAD, Role.ADMIN]),
  createWorkItem
);

router.get("/team/:teamId", requireTeamAccess("teamId"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Team access confirmed",
    teamId: req.params.teamId,
  });
});

router.get("/items/:workItemId", requireWorkItemAccess("workItemId"), getWorkItem);

router.patch(
  "/items/:workItemId",
  requireWorkItemAccess("workItemId"),
  requireRole([Role.MEMBER, Role.LEAD, Role.ADMIN]),
  updateWorkItem
);

router.patch(
  "/items/:workItemId/approve",
  requireWorkItemAccess("workItemId"),
  requireRole([Role.LEAD, Role.ADMIN]),
  approveWorkItem
);

router.get("/admin/:teamId", requireTeamAccess("teamId"), requireLeadOrAdmin("teamId"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin-only team route",
  });
});

export default router;
