const path = require("path");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "jest-only-test-secret";
process.env.DATABASE_URL = `file:${path
  .resolve(__dirname, "../test.db")
  .replace(/\\/g, "/")}`;
