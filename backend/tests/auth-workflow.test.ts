import bcrypt from "bcrypt";
import { Role, WorkStatus } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";

import app from "../src/app";
import { prisma } from "../src/config/prisma";

describe("authentication, authorization, and work-item concurrency", () => {
  let teamId: number;
  let otherTeamId: number;
  let leadId: number;
  let memberId: number;
  let viewerId: number;
  let outsiderId: number;
  let leadToken: string;
  let memberToken: string;
  let viewerToken: string;
  let outsiderToken: string;
  let workItemId: number;
  let passwordHash: string;

  const createWorkItem = async (overrides: {
    status?: WorkStatus;
    assigneeId?: number | null;
  } = {}) =>
    prisma.workItem.create({
      data: {
        title: "Test operation",
        description: "Integration test item",
        type: "TASK",
        priority: "MEDIUM",
        teamId,
        createdById: memberId,
        status: overrides.status ?? WorkStatus.OPEN,
        assigneeId: overrides.assigneeId ?? null,
      },
    });

  const tokenFor = async (email: string) => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "test-password" });
    expect(response.status).toBe(200);
    return response.body.token as string;
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash("test-password", 4);
  });

  beforeEach(async () => {
    await prisma.activityEvent.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.workItem.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();

    const [lead, member, viewer, outsider] = await Promise.all([
      prisma.user.create({
        data: { name: "Lead Tester", email: "lead@example.test", password: passwordHash },
      }),
      prisma.user.create({
        data: { name: "Member Tester", email: "member@example.test", password: passwordHash },
      }),
      prisma.user.create({
        data: { name: "Viewer Tester", email: "viewer@example.test", password: passwordHash },
      }),
      prisma.user.create({
        data: { name: "Outside Tester", email: "outside@example.test", password: passwordHash },
      }),
    ]);

    leadId = lead.id;
    memberId = member.id;
    viewerId = viewer.id;
    outsiderId = outsider.id;

    const [team, otherTeam] = await Promise.all([
      prisma.team.create({ data: { name: "Test team" } }),
      prisma.team.create({ data: { name: "Other test team" } }),
    ]);
    teamId = team.id;
    otherTeamId = otherTeam.id;

    await prisma.membership.createMany({
      data: [
        { userId: leadId, teamId, role: Role.LEAD },
        { userId: memberId, teamId, role: Role.MEMBER },
        { userId: viewerId, teamId, role: Role.VIEWER },
        { userId: outsiderId, teamId: otherTeamId, role: Role.MEMBER },
      ],
    });

    [leadToken, memberToken, viewerToken, outsiderToken] = await Promise.all([
      tokenFor("lead@example.test"),
      tokenFor("member@example.test"),
      tokenFor("viewer@example.test"),
      tokenFor("outside@example.test"),
    ]);

    const item = await createWorkItem();
    workItemId = item.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("logs in with valid credentials and rejects invalid credentials", async () => {
    const success = await request(app)
      .post("/api/auth/login")
      .send({ email: "member@example.test", password: "test-password" });
    expect(success.status).toBe(200);
    expect(success.body).toMatchObject({
      success: true,
      user: { email: "member@example.test" },
    });
    expect(typeof success.body.token).toBe("string");

    const failure = await request(app)
      .post("/api/auth/login")
      .send({ email: "member@example.test", password: "wrong-password" });
    expect(failure.status).toBe(401);
  });

  it("authenticates protected requests and authorizes team membership", async () => {
    const unauthenticated = await request(app).get("/api/users/me");
    expect(unauthenticated.status).toBe(401);

    const authenticated = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(authenticated.status).toBe(200);
    expect(authenticated.body.user.userId).toBe(memberId);

    const outsiderResponse = await request(app)
      .get(`/api/work/teams/${teamId}/items`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(outsiderResponse.status).toBe(403);
  });

  it("validates workflow transitions and restricts approval to LEAD", async () => {
    const invalid = await request(app)
      .patch(`/api/work/items/${workItemId}/status`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ status: WorkStatus.RESOLVED });
    expect(invalid.status).toBe(400);

    for (const status of [WorkStatus.IN_PROGRESS, WorkStatus.AWAITING_APPROVAL]) {
      const response = await request(app)
        .patch(`/api/work/items/${workItemId}/status`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ status });
      expect(response.status).toBe(200);
    }

    const forbiddenApproval = await request(app)
      .patch(`/api/work/items/${workItemId}/status`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ status: WorkStatus.RESOLVED });
    expect(forbiddenApproval.status).toBe(403);

    const leadApproval = await request(app)
      .patch(`/api/work/items/${workItemId}/status`)
      .set("Authorization", `Bearer ${leadToken}`)
      .send({ status: WorkStatus.RESOLVED });
    expect(leadApproval.status).toBe(200);
    expect(leadApproval.body.data.status).toBe(WorkStatus.RESOLVED);
  });

  it("allows exactly one of two simultaneous claims and records one activity event", async () => {
    const results = await Promise.all([
      request(app)
        .post(`/api/work-items/${workItemId}/claim`)
        .set("Authorization", `Bearer ${memberToken}`),
      request(app)
        .post(`/api/work-items/${workItemId}/claim`)
        .set("Authorization", `Bearer ${leadToken}`),
    ]);

    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await prisma.activityEvent.count({
      where: { workItemId, eventType: "WORK_ITEM_ASSIGNED" },
    })).toBe(1);
  });

  it("uses optimistic locking and returns latest item on version conflict", async () => {
    const firstUpdate = await request(app)
      .patch(`/api/work/items/${workItemId}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ version: 1, title: "Updated title" });
    expect(firstUpdate.status).toBe(200);
    expect(firstUpdate.body.data.version).toBe(2);

    const staleUpdate = await request(app)
      .patch(`/api/work/items/${workItemId}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ version: 1, title: "Stale title" });
    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.body.data.latestWorkItem).toMatchObject({
      id: workItemId,
      title: "Updated title",
      version: 2,
    });
  });

  it("forbids users outside the owning team from reading or claiming items", async () => {
    const read = await request(app)
      .get(`/api/work/items/${workItemId}`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(read.status).toBe(403);

    const claim = await request(app)
      .post(`/api/work-items/${workItemId}/claim`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(claim.status).toBe(403);
  });
});
