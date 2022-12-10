import { PrismaClient, Prisma, User } from "@prisma/client";
import { PartialDeep } from "type-fest";
import _ from "lodash";

export const createService = (prisma: PrismaClient) =>
  Object.assign(prisma.node, {});
