import { Role } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";

export interface TeamMembership {
  teamId: number;
  userId: number;
  role: Role;
}

export interface RoleCheckOptions {
  allowAdmin?: boolean;
}

const ROLE_LEVEL: Record<Role, number> = {
  [Role.VIEWER]: 10,
  [Role.MEMBER]: 20,
  [Role.LEAD]: 30,
  [Role.ADMIN]: 40,
};

export const roleMeetsMinimum = (role: Role, minimumRole: Role): boolean =>
  ROLE_LEVEL[role] >= ROLE_LEVEL[minimumRole];

export const roleIsAllowed = (
  role: Role,
  allowedRoles: readonly Role[],
  options: RoleCheckOptions = {}
): boolean =>
  (options.allowAdmin !== false && role === Role.ADMIN) ||
  allowedRoles.includes(role);

export class AuthorizationService {
  static async getTeamMembership(
    userId: number,
    teamId: number
  ): Promise<TeamMembership | null> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
      select: {
        userId: true,
        teamId: true,
        role: true,
      },
    });

    return membership;
  }

  static async getUserTeamRole(
    userId: number,
    teamId: number
  ): Promise<Role | null> {
    const membership = await this.getTeamMembership(userId, teamId);
    return membership?.role ?? null;
  }

  static async hasTeamAccess(userId: number, teamId: number): Promise<boolean> {
    return (await this.getTeamMembership(userId, teamId)) !== null;
  }

  static async hasAnyRole(
    userId: number,
    teamId: number,
    roles: readonly Role[],
    options: RoleCheckOptions = {}
  ): Promise<boolean> {
    const role = await this.getUserTeamRole(userId, teamId);
    return role !== null && roleIsAllowed(role, roles, options);
  }

  static async hasMinimumRole(
    userId: number,
    teamId: number,
    minimumRole: Role
  ): Promise<boolean> {
    const role = await this.getUserTeamRole(userId, teamId);
    return role !== null && roleMeetsMinimum(role, minimumRole);
  }

  static async assertTeamAccess(userId: number, teamId: number): Promise<Role> {
    const role = await this.getUserTeamRole(userId, teamId);

    if (!role) {
      throw new AppError(403, "You do not belong to this team");
    }

    return role;
  }

  static async assertAnyRole(
    userId: number,
    teamId: number,
    roles: readonly Role[],
    options: RoleCheckOptions = {}
  ): Promise<Role> {
    const role = await this.assertTeamAccess(userId, teamId);

    if (!roleIsAllowed(role, roles, options)) {
      throw new AppError(
        403,
        `This action requires one of the following roles: ${roles.join(", ")}`
      );
    }

    return role;
  }

  static async assertMinimumRole(
    userId: number,
    teamId: number,
    minimumRole: Role
  ): Promise<Role> {
    const role = await this.assertTeamAccess(userId, teamId);

    if (!roleMeetsMinimum(role, minimumRole)) {
      throw new AppError(403, `This action requires the ${minimumRole} role or higher`);
    }

    return role;
  }

  static async assertAccessToResource(
    userId: number,
    teamId: number
  ): Promise<void> {
    await this.assertTeamAccess(userId, teamId);
  }

  static async assertCanApproveWorkItem(
    userId: number,
    workItemId: number
  ): Promise<void> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
      select: { teamId: true },
    });

    if (!workItem) {
      throw new AppError(404, "Work item not found");
    }

    await this.assertAnyRole(userId, workItem.teamId, [Role.LEAD], {
      allowAdmin: false,
    });
  }

  static async getUserTeamIds(userId: number): Promise<number[]> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { teamId: true },
    });

    return memberships.map(({ teamId }) => teamId);
  }
}

export const hasRoleAccess = AuthorizationService.hasAnyRole;
export const hasMinimumRole = AuthorizationService.hasMinimumRole;
export const canAccessResource = AuthorizationService.assertAccessToResource;
