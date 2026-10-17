import { NextFunction, Request, Response } from "express";

import { LoginRequestBody } from "../types/auth.types";
import { loginUser } from "../services/auth.service";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body as Partial<LoginRequestBody>;

    const result = await loginUser(String(email ?? ""), String(password ?? ""));

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};