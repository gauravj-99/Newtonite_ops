import { NextFunction, Request, RequestHandler, Response } from "express";
import { Role } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AuthorizationService, RoleCheckOptions } from "../services/authorization.service";
import { AuthRequest } from "../types/auth.types";
import { AppError } from "../utils/appError";

export type TeamIdResolver = (req: Request) => number | Promise<number>;

export interface TeamAuthorizationOptions extends RoleCheckOptions {
  resolveTeamId: TeamIdResolver;
  roles?: readonly Role[];
  minimumRole?: Role;
}

const authenticatedRequest = (req: Request): AuthRequest =>
  req as AuthRequest;

const parsePositiveId = (value: unknown): number | null => {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const getTeamIdFromRequest = (
  req: Request,
  paramName: string
): number | null => {
  const value =
    req.params[paramName] ??
    req.body?.teamId ??
    req.query?.teamId ??
    req.headers["x-team-id"];
  return parsePositiveId(value);
};

const getAuthenticatedUserId = (req: Request): number => {
  const userId = authenticatedRequest(req).user?.userId;
  if (!userId) {
    throw new AppError(401, "Authentication required");
  }
  return userId;
};

const authorizeResolvedTeam = (
  options: TeamAuthorizationOptions
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const teamId = await options.resolveTeamId(req);

      if (!Number.isSafeInteger(teamId) || teamId < 1) {
        throw new AppError(400, "A valid team id is required");
      }

      const scopedRequest = authenticatedRequest(req);
      let role: Role;

      if (options.minimumRole) {
        role = await AuthorizationService.assertMinimumRole(
          userId,
          teamId,
          options.minimumRole
        );
      } else if (options.roles) {
        role = await AuthorizationService.assertAnyRole(
          userId,
          teamId,
          options.roles,
          options
        );
      } else {
        role = await AuthorizationService.assertTeamAccess(userId, teamId);
      }

      scopedRequest.teamId = teamId;
      scopedRequest.teamRole = role;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const authorizeTeamResource = (
  options: TeamAuthorizationOptions
): RequestHandler => authorizeResolvedTeam(options);

export const requireTeamAccess = (
  teamIdParam = "teamId"
): RequestHandler =>
  authorizeResolvedTeam({
    resolveTeamId: (req) => {
      const teamId = getTeamIdFromRequest(req, teamIdParam);
      if (teamId === null) {
        throw new AppError(400, "A valid team id is required");
      }
      return teamId;
    },
  });

export const requireMinimumRole = (
  minimumRole: Role,
  teamIdParam = "teamId"
): RequestHandler =>
  authorizeResolvedTeam({
    minimumRole,
    resolveTeamId: (req) => {
      const authorizedTeamId = authenticatedRequest(req).teamId;
      const teamId = authorizedTeamId ?? getTeamIdFromRequest(req, teamIdParam);
      if (teamId === null) {
        throw new AppError(400, "A valid team id is required");
      }
      return teamId;
    },
  });

export const requireRole = (
  allowedRoles: Role | readonly Role[],
  teamIdParam = "teamId",
  roleOptions: RoleCheckOptions = {}
): RequestHandler =>
  authorizeResolvedTeam({
    roles: Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles as Role],
    ...roleOptions,
    resolveTeamId: (req) => {
      const authorizedTeamId = authenticatedRequest(req).teamId;
      const teamId = authorizedTeamId ?? getTeamIdFromRequest(req, teamIdParam);
      if (teamId === null) {
        throw new AppError(400, "A valid team id is required");
      }
      return teamId;
    },
  });

export const requireWorkItemAccess = (
  workItemParam = "workItemId"
): RequestHandler =>
  authorizeResolvedTeam({
    resolveTeamId: async (req) => {
      const workItemId = parsePositiveId(req.params[workItemParam]);

      if (workItemId === null) {
        throw new AppError(400, "A valid work item id is required");
      }

      const workItem = await prisma.workItem.findUnique({
        where: { id: workItemId },
        select: { teamId: true },
      });

      if (!workItem) {
        throw new AppError(404, "Work item not found");
      }

      return workItem.teamId;
    },
  });

export const requireLeadOrAdmin = (
  teamIdParam = "teamId"
): RequestHandler =>
  requireRole([Role.LEAD, Role.ADMIN], teamIdParam);
