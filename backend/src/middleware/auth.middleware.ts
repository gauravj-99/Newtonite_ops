import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AuthRequest, JwtPayload } from "../types/auth.types";
import { AppError } from "../utils/appError";

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return next(new AppError(401, "Authentication token is required"));
    }

    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(new AppError(401, "Authorization header must use Bearer token format"));
    }

    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, "Token expired"));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, "Invalid token"));
    }

    return next(new AppError(401, "Authentication failed"));
  }
};