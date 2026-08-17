import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generatePortalToken } from "./src/lib/portal-token";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"]!,
    connectionTimeoutMillis: 10000,
  }),
});

async function main() {
  const slug = "smoke-" + Date.now().toString(36);

  const org = await prisma.organization.create({
    data: { name: "Smoke Test Org", slug },
  });
  console.log("ORG:", org.id);

  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      firstName: "Smoke",
      lastName: "Client",
      email: `smoke+${slug}@example.com`,
      phone: "+1 555 000 0000",
      dateOfBirth: new Date("1990-01-01"),
      nationality: "IN",
    },
  });
  console.log("CLIENT:", client.id, "isArchived=", client.isArchived);

  const caseRecord = await prisma.case.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      caseType: "WORK_PERMIT",
      title: "Smoke Intake Case",
      description: "created by smoke seed",
    },
  });
  console.log("CASE:", caseRecord.id, "isArchived=", caseRecord.isArchived);

  const token = generatePortalToken(client.id, caseRecord.id, org.id, 30);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://immidesk.vercel.app"}/intake/${token}`;
  console.log("URL:", url);

  const res = await fetch(url, { redirect: "manual" });
  const html = await res.text();
  const ok = res.ok || res.status === 307 || res.status === 308;
  const containsInvalid = html.includes("Link Expired or Invalid");
  console.log("HTTP:", res.status);
  console.log("INVALID_VIEW:", containsInvalid);
  console.log("LOOKS_GOOD:", ok && !containsInvalid && html.length > 1000);
}

main()
  .catch((e) => {
    console.error("SMOKE FAILED:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
