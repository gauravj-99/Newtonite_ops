import { NextFunction, Request, Response } from "express";

import {
  approveWorkItem as approveWorkItemService,
  claimWorkItem as claimWorkItemService,
  createWorkItem as createWorkItemService,
  getWorkItemActivity,
  getWorkItemById,
  listWorkItems,
  transitionWorkItemStatus as transitionWorkItemStatusService,
  updateWorkItem as updateWorkItemService,
} from "../services/work-item.service";
import { addWorkItemComment } from "../services/comment.service";
import { AppError } from "../utils/appError";
import { AuthRequest } from "../types/auth.types";

const getAuthenticatedUserId = (req: Request): number => {
  const authenticatedRequest = req as AuthRequest;
  if (!authenticatedRequest.user) {
    throw new AppError(401, "Authentication required");
  }
  return authenticatedRequest.user.userId;
};

export const createWorkItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const item = await createWorkItemService(
      getAuthenticatedUserId(req),
      req.params.teamId,
      req.body
    );

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const listTeamWorkItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await listWorkItems(
      getAuthenticatedUserId(req),
      req.params.teamId,
      req.query
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getWorkItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const item = await getWorkItemById(
      getAuthenticatedUserId(req),
      req.params.workItemId
    );

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateWorkItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const item = await updateWorkItemService(
      getAuthenticatedUserId(req),
      req.params.workItemId,
      req.body
    );

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const claimWorkItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const item = await claimWorkItemService(
      getAuthenticatedUserId(req),
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: "Work item claimed",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkItemTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const events = await getWorkItemActivity(
      getAuthenticatedUserId(req),
      req.params.workItemId
    );

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

export const transitionWorkItemStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const item = await transitionWorkItemStatusService(
      getAuthenticatedUserId(req),
      req.params.workItemId,
      req.body
    );

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const comment = await addWorkItemComment(
      getAuthenticatedUserId(req),
      req.params.workItemId,
      req.body?.content
    );

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

export const approveWorkItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updatedWorkItem = await approveWorkItemService(
      getAuthenticatedUserId(req),
      req.params.workItemId
    );

    res.status(200).json({
      success: true,
      message: "Work item approved",
      data: updatedWorkItem,
    });
  } catch (error) {
    next(error);
  }
};
