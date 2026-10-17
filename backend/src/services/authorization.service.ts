import { Role } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";

const ROLE_PRIORITY: Record<Role, number> = {
  VIEWER: 1,
  MEMBER: 2,
  LEAD: 3,
  ADMIN: 4,
};

export class AuthorizationService {
  static async getUserTeamRole(userId: number, teamId: number): Promise<Role | null> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      select: {
        role: true,
      },
    });

    return membership?.role ?? null;
  }

  static async hasAnyRole(userId: number, teamId: number, roles: Role[]): Promise<boolean> {
    const role = await this.getUserTeamRole(userId, teamId);

    if (!role) {
      return false;
    }

    return roles.includes(role);
  }

  static async hasMinimumRole(userId: number, teamId: number, minimumRole: Role): Promise<boolean> {
    const role = await this.getUserTeamRole(userId, teamId);

    if (!role) {
      return false;
    }

    return ROLE_PRIORITY[role] >= ROLE_PRIORITY[minimumRole];
  }

  static async assertTeamAccess(userId: number, teamId: number): Promise<void> {
    const role = await this.getUserTeamRole(userId, teamId);

    if (!role) {
      throw new AppError(403, "You do not belong to this team");
    }
  }

  static async assertAccessToResource(userId: number, teamId: number): Promise<void> {
    await this.assertTeamAccess(userId, teamId);
  }

  static async assertCanApproveWorkItem(userId: number, workItemId: number): Promise<void> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
      select: { teamId: true },
    });

    if (!workItem) {
      throw new AppError(404, "Work item not found");
    }

    await this.assertTeamAccess(userId, workItem.teamId);

    const hasLeadOrAdmin = await this.hasAnyRole(userId, workItem.teamId, [Role.LEAD, Role.ADMIN]);

    if (!hasLeadOrAdmin) {
      throw new AppError(403, "Only LEAD and ADMIN roles can approve work items");
    }
  }

  static async getUserTeamIds(userId: number): Promise<number[]> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { teamId: true },
    });

    return memberships.map((membership) => membership.teamId);
  }
}

export const hasRoleAccess = AuthorizationService.hasAnyRole;
export const hasMinimumRole = AuthorizationService.hasMinimumRole;
export const canAccessResource = AuthorizationService.assertAccessToResource;
