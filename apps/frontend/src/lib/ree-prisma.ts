import { PrismaClient } from '@prisma/client';

const globalForReePrisma = globalThis as unknown as {
  reePrisma: PrismaClient | undefined;
};

export const reePrisma =
  globalForReePrisma.reePrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForReePrisma.reePrisma = reePrisma;
}
