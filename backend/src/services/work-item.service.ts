import {
  Priority,
  Prisma,
  Role,
  WorkItemType,
  WorkStatus,
} from "@prisma/client";

import { prisma } from "../config/prisma";
import { AuthorizationService } from "./authorization.service";
import { AppError } from "../utils/appError";

const workItemInclude = {
  team: true,
  assignee: {
    select: { id: true, name: true, email: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.WorkItemInclude;

export interface WorkItemListFilters {
  page?: unknown;
  limit?: unknown;
  search?: unknown;
  status?: unknown;
  priority?: unknown;
  assigneeId?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (value: object, property: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, property);

const parsePositiveInteger = (value: unknown, field: string): number => {
  const parsed =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return parsed;
};

const parsePaginationValue = (
  value: unknown,
  field: string,
  defaultValue: number,
  maximum?: number
): number => {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parsePositiveInteger(value, field);

  if (maximum !== undefined && parsed > maximum) {
    throw new AppError(400, `${field} must not exceed ${maximum}`);
  }

  return parsed;
};

const parseEnum = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  field: string
): T => {
  if (
    typeof value !== "string" ||
    !allowedValues.includes(value as T)
  ) {
    throw new AppError(400, `${field} must be one of: ${allowedValues.join(", ")}`);
  }

  return value as T;
};

const parseOptionalAssignee = (value: unknown): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return parsePositiveInteger(value, "assigneeId");
};

const parseOptionalDate = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new AppError(400, "dueDate must be a valid date string or null");
  }

  return new Date(value);
};

const validateAssignee = async (assigneeId: number | null, teamId: number) => {
  if (assigneeId === null) {
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId: assigneeId,
        teamId,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AppError(400, "Assignee must be a member of the work item's team");
  }
};

const parseCreateInput = (body: unknown) => {
  if (!isRecord(body)) {
    throw new AppError(400, "Request body must be a JSON object");
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new AppError(400, "title is required and must be a non-empty string");
  }

  if (typeof body.description !== "string" || !body.description.trim()) {
    throw new AppError(400, "description is required and must be a non-empty string");
  }

  return {
    title: body.title.trim(),
    description: body.description.trim(),
    type: parseEnum(body.type, Object.values(WorkItemType), "type"),
    priority: parseEnum(body.priority, Object.values(Priority), "priority"),
    assigneeId: parseOptionalAssignee(body.assigneeId),
    dueDate: parseOptionalDate(body.dueDate),
  };
};

const parseUpdateInput = (body: unknown) => {
  if (!isRecord(body) || Object.keys(body).length === 0) {
    throw new AppError(400, "Request body must contain at least one update field");
  }

  if (
    typeof body.version !== "number" ||
    !Number.isSafeInteger(body.version) ||
    body.version < 1
  ) {
    throw new AppError(400, "version is required and must be a positive integer");
  }

  const allowedFields = new Set([
    "version",
    "title",
    "description",
    "type",
    "priority",
    "assigneeId",
    "dueDate",
  ]);

  const unknownFields = Object.keys(body).filter((key) => !allowedFields.has(key));
  if (unknownFields.length > 0) {
    throw new AppError(400, `Unsupported update field(s): ${unknownFields.join(", ")}`);
  }

  const data: Prisma.WorkItemUncheckedUpdateManyInput = {};

  if (hasOwn(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new AppError(400, "title must be a non-empty string");
    }
    data.title = body.title.trim();
  }

  if (hasOwn(body, "description")) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      throw new AppError(400, "description must be a non-empty string");
    }
    data.description = body.description.trim();
  }

  if (hasOwn(body, "type")) {
    data.type = parseEnum(body.type, Object.values(WorkItemType), "type");
  }

  if (hasOwn(body, "priority")) {
    data.priority = parseEnum(body.priority, Object.values(Priority), "priority");
  }

  if (hasOwn(body, "assigneeId")) {
    data.assigneeId = parseOptionalAssignee(body.assigneeId);
  }

  if (hasOwn(body, "dueDate")) {
    data.dueDate = parseOptionalDate(body.dueDate);
  }

  if (Object.keys(data).length === 0) {
    throw new AppError(400, "At least one work item field must be updated");
  }

  return { expectedVersion: body.version as number, data };
};

export const createWorkItem = async (
  userId: number,
  teamIdValue: unknown,
  body: unknown
) => {
  const teamId = parsePositiveInteger(teamIdValue, "teamId");
  await AuthorizationService.assertTeamAccess(userId, teamId);

  const input = parseCreateInput(body);
  await validateAssignee(input.assigneeId, teamId);

  return prisma.$transaction(async (tx) => {
    const item = await tx.workItem.create({
      data: {
        ...input,
        teamId,
        createdById: userId,
      },
      include: workItemInclude,
    });

    await tx.activityEvent.create({
      data: {
        eventType: "WORK_ITEM_CREATED",
        newValue: item.title,
        actorId: userId,
        workItemId: item.id,
      },
    });

    if (input.assigneeId !== null) {
      await tx.activityEvent.create({
        data: {
          eventType: "WORK_ITEM_ASSIGNED",
          newValue: String(input.assigneeId),
          actorId: userId,
          workItemId: item.id,
        },
      });
    }

    return item;
  });
};

export const getWorkItemById = async (
  userId: number,
  workItemIdValue: unknown
) => {
  const workItemId = parsePositiveInteger(workItemIdValue, "workItemId");
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { id: true, teamId: true },
  });

  if (!workItem) {
    throw new AppError(404, "Work item not found");
  }

  await AuthorizationService.assertTeamAccess(userId, workItem.teamId);

  return prisma.workItem.findFirst({
    where: {
      id: workItemId,
      teamId: workItem.teamId,
    },
    include: workItemInclude,
  });
};

export const listWorkItems = async (
  userId: number,
  teamIdValue: unknown,
  filters: WorkItemListFilters
) => {
  const teamId = parsePositiveInteger(teamIdValue, "teamId");
  await AuthorizationService.assertTeamAccess(userId, teamId);

  const page = parsePaginationValue(filters.page, "page", 1);
  const limit = parsePaginationValue(filters.limit, "limit", 20, 100);

  let search: string | undefined;
  if (filters.search !== undefined) {
    if (typeof filters.search !== "string") {
      throw new AppError(400, "search must be a string");
    }
    search = filters.search.trim();
  }

  const status =
    filters.status === undefined
      ? undefined
      : parseEnum(filters.status, Object.values(WorkStatus), "status");
  const priority =
    filters.priority === undefined
      ? undefined
      : parseEnum(filters.priority, Object.values(Priority), "priority");
  const assigneeId =
    filters.assigneeId === undefined
      ? undefined
      : parsePositiveInteger(filters.assigneeId, "assigneeId");

  const where: Prisma.WorkItemWhereInput = {
    teamId,
    ...(search ? { title: { contains: search } } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(assigneeId !== undefined ? { assigneeId } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.workItem.findMany({
      where,
      include: workItemInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.workItem.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateWorkItem = async (
  userId: number,
  workItemIdValue: unknown,
  body: unknown
) => {
  const workItemId = parsePositiveInteger(workItemIdValue, "workItemId");
  const existing = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { id: true, teamId: true },
  });

  if (!existing) {
    throw new AppError(404, "Work item not found");
  }

  await AuthorizationService.assertTeamAccess(userId, existing.teamId);
  const { expectedVersion, data } = parseUpdateInput(body);

  if (isRecord(body) && hasOwn(body, "assigneeId")) {
    await validateAssignee(
      parseOptionalAssignee(body.assigneeId),
      existing.teamId
    );
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.workItem.findFirst({
      where: { id: workItemId, teamId: existing.teamId },
      select: {
        priority: true,
        assigneeId: true,
        version: true,
      },
    });

    if (!current) {
      throw new AppError(404, "Work item not found");
    }

    const result = await tx.workItem.updateMany({
      where: {
        id: workItemId,
        teamId: existing.teamId,
        version: expectedVersion,
      },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const latestWorkItem = await tx.workItem.findFirst({
        where: {
          id: workItemId,
          teamId: existing.teamId,
        },
        include: workItemInclude,
      });

      if (!latestWorkItem) {
        throw new AppError(404, "Work item not found");
      }

      throw new AppError(
        409,
        "Work item version conflict; refresh and retry your update",
        true,
        { latestWorkItem }
      );
    }

    const events: Prisma.ActivityEventCreateManyInput[] = [];

    if (data.assigneeId !== undefined && data.assigneeId !== current.assigneeId) {
      events.push({
        eventType: "WORK_ITEM_ASSIGNED",
        oldValue: current.assigneeId === null ? null : String(current.assigneeId),
        newValue: data.assigneeId === null ? null : String(data.assigneeId),
        actorId: userId,
        workItemId,
      });
    }

    if (data.priority !== undefined && data.priority !== current.priority) {
      events.push({
        eventType: "PRIORITY_CHANGED",
        oldValue: current.priority,
        newValue: data.priority as Priority,
        actorId: userId,
        workItemId,
      });
    }

    if (events.length > 0) {
      await tx.activityEvent.createMany({ data: events });
    }

    return tx.workItem.findFirst({
      where: {
        id: workItemId,
        teamId: existing.teamId,
      },
      include: workItemInclude,
    });
  });
};

export const claimWorkItem = async (
  userId: number,
  workItemIdValue: unknown
) => {
  const workItemId = parsePositiveInteger(workItemIdValue, "id");
  const item = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { teamId: true },
  });

  if (!item) {
    throw new AppError(404, "Work item not found");
  }

  await AuthorizationService.assertTeamAccess(userId, item.teamId);

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.workItem.updateMany({
      where: {
        id: workItemId,
        teamId: item.teamId,
        assigneeId: null,
      },
      data: {
        assigneeId: userId,
        version: { increment: 1 },
      },
    });

    if (claimed.count === 0) {
      const currentItem = await tx.workItem.findFirst({
        where: { id: workItemId, teamId: item.teamId },
        select: { id: true },
      });

      if (!currentItem) {
        throw new AppError(404, "Work item not found");
      }

      throw new AppError(409, "Work item has already been claimed");
    }

    await tx.activityEvent.create({
      data: {
        eventType: "WORK_ITEM_ASSIGNED",
        oldValue: null,
        newValue: String(userId),
        actorId: userId,
        workItemId,
      },
    });

    return tx.workItem.findFirst({
      where: { id: workItemId, teamId: item.teamId },
      include: workItemInclude,
    });
  });
};

const WORKFLOW_TRANSITIONS: Record<WorkStatus, readonly WorkStatus[]> = {
  [WorkStatus.OPEN]: [WorkStatus.IN_PROGRESS],
  [WorkStatus.IN_PROGRESS]: [WorkStatus.AWAITING_APPROVAL],
  [WorkStatus.AWAITING_APPROVAL]: [WorkStatus.RESOLVED],
  [WorkStatus.RESOLVED]: [WorkStatus.CLOSED],
  [WorkStatus.CLOSED]: [],
};

export const transitionWorkItemStatus = async (
  userId: number,
  workItemIdValue: unknown,
  targetStatusValue: unknown
) => {
  const workItemId = parsePositiveInteger(workItemIdValue, "workItemId");
  if (!isRecord(targetStatusValue) || typeof targetStatusValue.status !== "string") {
    throw new AppError(400, "A target status is required");
  }
  const targetStatus = parseEnum(
    targetStatusValue.status,
    Object.values(WorkStatus),
    "status"
  );

  const item = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { id: true, teamId: true },
  });

  if (!item) {
    throw new AppError(404, "Work item not found");
  }

  await AuthorizationService.assertTeamAccess(userId, item.teamId);

  return prisma.$transaction(async (tx) => {
    const current = await tx.workItem.findFirst({
      where: { id: workItemId, teamId: item.teamId },
      select: { status: true },
    });

    if (!current) {
      throw new AppError(404, "Work item not found");
    }

    if (!WORKFLOW_TRANSITIONS[current.status].includes(targetStatus)) {
      throw new AppError(
        400,
        `Invalid work item status transition: ${current.status} -> ${targetStatus}`
      );
    }

    if (
      current.status === WorkStatus.AWAITING_APPROVAL &&
      targetStatus === WorkStatus.RESOLVED
    ) {
      const membership = await tx.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: item.teamId,
          },
        },
        select: { role: true },
      });
      if (membership?.role !== Role.LEAD) {
        throw new AppError(403, "Only a LEAD can approve a work item");
      }
    }

    const updated = await tx.workItem.updateMany({
      where: {
        id: workItemId,
        teamId: item.teamId,
        status: current.status,
      },
      data: {
        status: targetStatus,
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new AppError(409, "Work item status changed concurrently; retry the request");
    }

    await tx.activityEvent.create({
      data: {
        eventType: "STATUS_CHANGED",
        oldValue: current.status,
        newValue: targetStatus,
        actorId: userId,
        workItemId,
      },
    });

    return tx.workItem.findFirst({
      where: { id: workItemId, teamId: item.teamId },
      include: workItemInclude,
    });
  });
};

export const approveWorkItem = async (userId: number, workItemIdValue: unknown) =>
  transitionWorkItemStatus(userId, workItemIdValue, {
    status: WorkStatus.RESOLVED,
  });

export const getWorkItemActivity = async (
  userId: number,
  workItemIdValue: unknown
) => {
  const workItemId = parsePositiveInteger(workItemIdValue, "workItemId");
  const item = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { teamId: true },
  });

  if (!item) {
    throw new AppError(404, "Work item not found");
  }

  await AuthorizationService.assertTeamAccess(userId, item.teamId);

  return prisma.activityEvent.findMany({
    where: { workItemId },
    include: {
      actor: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};
