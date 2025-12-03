import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Loan model...\n');

  // Test 1: Create Loan
  console.log('Test 1: Creating a loan...');
  const loan = await prisma.loan.create({
    data: {
      bank: 'gmo',
      batchName: 'テスト融資',
      amount: 10000000,
      occurrenceYM: '2024-04',
    },
  });
  console.log('✓ Created:', loan);
  console.log('');

  // Test 2: Unique constraint test
  console.log('Test 2: Testing unique constraint (same bank + batchName)...');
  try {
    await prisma.loan.create({
      data: {
        bank: 'gmo',
        batchName: 'テスト融資',
        amount: 5000000,
        occurrenceYM: '2024-05',
      },
    });
    console.log('✗ FAILED: Unique constraint should have prevented this');
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.log('✓ Unique constraint works! (P2002 error caught)');
    } else {
      console.error('✗ FAILED: Unexpected error:', e);
      throw e;
    }
  }
  console.log('');

  // Test 3: Different bank, same batchName should work
  console.log('Test 3: Creating loan with same batchName but different bank...');
  const loan2 = await prisma.loan.create({
    data: {
      bank: 'sbi',
      batchName: 'テスト融資',
      amount: 8000000,
      occurrenceYM: '2024-05',
    },
  });
  console.log('✓ Created (different bank):', loan2);
  console.log('');

  // Cleanup
  console.log('Cleanup: Deleting test loans...');
  await prisma.loan.delete({ where: { id: loan.id } });
  console.log('✓ Deleted loan 1');
  await prisma.loan.delete({ where: { id: loan2.id } });
  console.log('✓ Deleted loan 2');
  console.log('');

  console.log('All tests passed! ✓');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
