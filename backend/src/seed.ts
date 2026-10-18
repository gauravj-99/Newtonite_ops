import bcrypt from "bcrypt";
import { prisma } from "./config/prisma";

async function main() {
  const password = await bcrypt.hash("Password123", 10);

  const operations = await prisma.team.upsert({
    where: {
      name: "Operations",
    },
    update: {},
    create: {
      name: "Operations",
    },
  });

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@test.com",
    },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@test.com",
      password,
    },
  });

  const lead = await prisma.user.upsert({
    where: {
      email: "lead@test.com",
    },
    update: {},
    create: {
      name: "Lead User",
      email: "lead@test.com",
      password,
    },
  });

  const member = await prisma.user.upsert({
    where: {
      email: "member@test.com",
    },
    update: {},
    create: {
      name: "Member User",
      email: "member@test.com",
      password,
    },
  });

  const memberships = [
    {
      userId: admin.id,
      teamId: operations.id,
      role: "ADMIN" as const,
    },
    {
      userId: lead.id,
      teamId: operations.id,
      role: "LEAD" as const,
    },
    {
      userId: member.id,
      teamId: operations.id,
      role: "MEMBER" as const,
    },
  ];

  for (const membership of memberships) {
    const existing = await prisma.membership.findFirst({
      where: {
        userId: membership.userId,
        teamId: membership.teamId,
      },
    });

    if (!existing) {
      await prisma.membership.create({
        data: membership,
      });
    }
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });