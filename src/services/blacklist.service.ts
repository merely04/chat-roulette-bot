import _ from "lodash";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { PartialDeep } from "type-fest";

export const createService = (prisma: PrismaClient) =>
  Object.assign(prisma.blacklist, {
    upsertByUserId: <T extends Prisma.BlacklistArgs>(
      userId: number,
      args?: PartialDeep<
        Pick<Prisma.BlacklistUpsertArgs, "create" | "update" | "include">
      >,
      select?: Prisma.SelectSubset<T, Prisma.BlacklistArgs>
    ) => {
      const query = {
        where: {
          userId,
        },
        create: {
          userId,
        },
        update: {},
      };

      return prisma.blacklist.upsert<T & typeof query>(
        _.merge(query, args, select)
      );
    },
  });
