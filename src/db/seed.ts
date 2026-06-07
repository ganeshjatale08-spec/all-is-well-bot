import { prisma } from './client';

async function main() {
  console.log('Seeding database...');
  // Add sample contacts or lookup data here
  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
