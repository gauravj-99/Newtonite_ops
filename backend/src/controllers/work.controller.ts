import { Request, Response } from "express";

import { prisma } from "../config/prisma";

export const getWorkItem = async (req: Request, res: Response) => {
  const workItemId = Number(req.params.workItemId);

  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: {
      team: true,
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: workItem,
  });
};

export const approveWorkItem = async (req: Request, res: Response) => {
  const workItemId = Number(req.params.workItemId);

  const updatedWorkItem = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: "RESOLVED",
    },
  });

  res.status(200).json({
    success: true,
    message: "Work item approved",
    data: updatedWorkItem,
  });
};
