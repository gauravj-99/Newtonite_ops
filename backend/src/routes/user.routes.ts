import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { AuthRequest } from "../types/auth.types";
const router = Router();

router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);

export default router;
