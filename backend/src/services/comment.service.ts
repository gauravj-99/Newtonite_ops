import { prisma } from "../config/prisma";
import { AuthorizationService } from "./authorization.service";
import { AppError } from "../utils/appError";

export const addWorkItemComment = async (
  userId: number,
  workItemIdValue: unknown,
  contentValue: unknown
) => {
  const workItemId = Number(workItemIdValue);
  if (!Number.isSafeInteger(workItemId) || workItemId < 1) {
    throw new AppError(400, "workItemId must be a positive integer");
  }

  if (typeof contentValue !== "string" || !contentValue.trim()) {
    throw new AppError(400, "content is required and must be a non-empty string");
  }

  const item = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { id: true, teamId: true },
  });

  if (!item) {
    throw new AppError(404, "Work item not found");
  }

  await AuthorizationService.assertTeamAccess(userId, item.teamId);
  const content = contentValue.trim();

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        content,
        userId,
        workItemId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await tx.activityEvent.create({
      data: {
        eventType: "COMMENT_ADDED",
        newValue: content,
        actorId: userId,
        workItemId,
      },
    });

    return comment;
  });
};
