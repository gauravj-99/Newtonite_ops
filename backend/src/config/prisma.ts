import { PrismaClient } from "@prisma/client";
import { env } from "./env";

export const prisma = new PrismaClient({
  log:
    env.nodeEnv === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});
