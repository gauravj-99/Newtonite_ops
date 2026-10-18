import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { AuthRequest } from "../types/auth.types";
import { prisma } from "../config/prisma";
const router = Router();

router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const memberships = await prisma.membership.findMany({
        where: { userId: req.user.userId },
        select: {
          role: true,
          team: { select: { id: true, name: true } },
        },
        orderBy: { teamId: "asc" },
      });

      return res.json({
        success: true,
        user: req.user,
        teams: memberships.map(({ team, role }) => ({ ...team, role })),
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
