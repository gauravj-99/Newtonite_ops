const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const databasePath = path.resolve(__dirname, "../test.db");
const databaseUrl = `file:${databasePath.replace(/\\/g, "/")}`;
const environment = {
  ...process.env,
  NODE_ENV: "test",
  JWT_SECRET: "jest-only-test-secret",
  DATABASE_URL: databaseUrl,
};

const prisma = spawnSync(
  process.execPath,
  [path.resolve(__dirname, "../node_modules/prisma/build/index.js"), "db", "push", "--skip-generate", "--accept-data-loss"],
  { stdio: "inherit", env: environment }
);

if (prisma.error) {
  throw prisma.error;
}
if (prisma.status !== 0) {
  process.exit(prisma.status || 1);
}

const jest = spawnSync(
  process.execPath,
  [path.resolve(__dirname, "../node_modules/jest/bin/jest.js"), "--runInBand"],
  { stdio: "inherit", env: environment }
);

if (jest.error) {
  throw jest.error;
}

try {
  fs.rmSync(databasePath, { force: true });
  fs.rmSync(`${databasePath}-journal`, { force: true });
  fs.rmSync(`${databasePath}-shm`, { force: true });
  fs.rmSync(`${databasePath}-wal`, { force: true });
} catch (error) {
  console.error("Failed to clean up the isolated test database:", error);
  process.exitCode = 1;
}

process.exitCode = jest.status || 0;
