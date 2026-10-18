import { Role } from "@prisma/client";
import { describe, expect, it } from "@jest/globals";

import {
  roleIsAllowed,
  roleMeetsMinimum,
} from "../src/services/authorization.service";

describe("team role authorization utilities", () => {
  it("orders roles for minimum-role checks", () => {
    expect(roleMeetsMinimum(Role.LEAD, Role.MEMBER)).toBe(true);
    expect(roleMeetsMinimum(Role.VIEWER, Role.MEMBER)).toBe(false);
    expect(roleMeetsMinimum(Role.ADMIN, Role.LEAD)).toBe(true);
  });

  it("lets ADMIN bypass normal role allowlists by default", () => {
    expect(roleIsAllowed(Role.ADMIN, [Role.MEMBER])).toBe(true);
    expect(roleIsAllowed(Role.VIEWER, [Role.MEMBER])).toBe(false);
  });

  it("supports exact-role checks for exceptional operations", () => {
    expect(roleIsAllowed(Role.ADMIN, [Role.LEAD], { allowAdmin: false })).toBe(false);
    expect(roleIsAllowed(Role.LEAD, [Role.LEAD], { allowAdmin: false })).toBe(true);
  });
});
