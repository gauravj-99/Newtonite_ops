import dotenv from "dotenv";

dotenv.config();

const getRequiredEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;

  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env = {
  nodeEnv: getRequiredEnv("NODE_ENV", "development"),
  port: Number(getRequiredEnv("PORT", "5000")),
  databaseUrl: getRequiredEnv("DATABASE_URL", "file:./dev.db"),
  jwtSecret: getRequiredEnv("JWT_SECRET", "development-secret"),
};