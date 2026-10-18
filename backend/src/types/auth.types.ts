import { Role } from "@prisma/client";
import { Request } from "express";

export interface JwtPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  teamId?: number;
  teamRole?: Role;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}