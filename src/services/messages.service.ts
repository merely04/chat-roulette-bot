import { PrismaClient } from "@prisma/client";

export const createService = (prisma: PrismaClient) =>
  Object.assign(prisma.message, {});
