import bcrypt from "bcrypt";
import { prisma } from "./config/prisma";

async function main() {
  const password = await bcrypt.hash("Password123", 10);

  const operations = await prisma.team.create({
    data: {
      name: "Operations",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@test.com",
      password,
    },
  });

  const lead = await prisma.user.create({
    data: {
      name: "Lead User",
      email: "lead@test.com",
      password,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Member User",
      email: "member@test.com",
      password,
    },
  });

  await prisma.membership.createMany({
    data: [
      {
        userId: admin.id,
        teamId: operations.id,
        role: "ADMIN",
      },
      {
        userId: lead.id,
        teamId: operations.id,
        role: "LEAD",
      },
      {
        userId: member.id,
        teamId: operations.id,
        role: "MEMBER",
      },
    ],
  });

  console.log("Seed completed");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
  