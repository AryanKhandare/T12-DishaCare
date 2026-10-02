import { prisma } from "../src/config/database";

async function main() {
  const result = await prisma.reservation.updateMany({
    where: {
      status: "RESERVATION_REQUESTED",
      expiresAt: { lt: new Date() },
    },
    data: {
      status: "TIMEOUT",
    },
  });
  console.log(`Cleaned up ${result.count} stale expired test reservations.`);
  await prisma.$disconnect();
}

main().catch(console.error);
