import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 重複チェック（idempotentなseedにするため）
  const tags = ['A勘定', 'B勘定', '内部経費'];
  for (const name of tags) {
    const exists = await prisma.tag.findFirst({ where: { name } });
    if (!exists) {
      await prisma.tag.create({ data: { name } });
    }
  }
}

main()
  .then(() => {
    console.log('Seeded Tag table');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
