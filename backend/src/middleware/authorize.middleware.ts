import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { AuthorizationService } from "../services/authorization.service";

const resolveTeamId = (req: Request, paramName: string): number | null => {
  const value =
    req.params[paramName] ??
    req.body?.teamId ??
    req.query?.teamId ??
    req.headers["x-team-id"];

  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

export const requireTeamAccess = (teamIdParam = "teamId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError(401, "Authentication required"));
      }

      const teamId = resolveTeamId(req, teamIdParam);

      if (teamId === null) {
        return next(new AppError(400, "A valid team id is required"));
      }

      await AuthorizationService.assertTeamAccess(userId, teamId);
      (req as Request & { teamId?: number }).teamId = teamId;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireWorkItemAccess = (workItemParam = "workItemId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError(401, "Authentication required"));
      }

      const workItemId = Number(req.params[workItemParam]);

      if (!Number.isInteger(workItemId)) {
        return next(new AppError(400, "A valid work item id is required"));
      }

      const workItem = await prisma.workItem.findUnique({
        where: { id: workItemId },
        select: { teamId: true },
      });

      if (!workItem) {
        return next(new AppError(404, "Work item not found"));
      }

      await AuthorizationService.assertTeamAccess(userId, workItem.teamId);
      (req as Request & { teamId?: number }).teamId = workItem.teamId;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireRole = (allowedRoles: Role | Role[], teamIdParam = "teamId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError(401, "Authentication required"));
      }

      const teamId =
        (req as Request & { teamId?: number }).teamId ??
        resolveTeamId(req, teamIdParam);

      if (teamId === null || !Number.isInteger(teamId)) {
        return next(new AppError(400, "A valid team id is required"));
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const hasAccess = await AuthorizationService.hasAnyRole(userId, teamId, roles);

      if (!hasAccess) {
        return next(
          new AppError(403, `This action requires one of the following roles: ${roles.join(", ")}`)
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireLeadOrAdmin = (teamIdParam = "teamId") => {
  return requireRole([Role.LEAD, Role.ADMIN], teamIdParam);
};
