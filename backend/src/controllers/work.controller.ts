import { NextFunction, Request, Response } from "express";

import {
  approveWorkItem as approveWorkItemService,
  createWorkItem as createWorkItemService,
  getWorkItemActivity,
  getWorkItemById,
  listWorkItems,
  updateWorkItem as updateWorkItemService,
} from "../services/work-item.service";
import { addWorkItemComment } from "../services/comment.service";
import { AppError } from "../utils/appError";

const getAuthenticatedUserId = (req: Request): number => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }
  return req.user.userId;
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
