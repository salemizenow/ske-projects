import { PrismaClient } from '@prisma/client';

// One client per server process (avoids too many connections during `next dev` reloads).
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.prisma = db;
