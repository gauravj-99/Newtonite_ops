import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode =
    err instanceof AppError ? err.statusCode : 500;

  const message =
    err instanceof AppError && err.isOperational
      ? err.message
      : "Internal server error";

  if (process.env.NODE_ENV !== "test") {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err instanceof AppError && err.details !== undefined
      ? { data: err.details }
      : {}),
  });
};
