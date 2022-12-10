import { Prisma, PrismaClient } from "@prisma/client";
import { PartialDeep } from "type-fest";
import _ from "lodash";

export const createService = (prisma: PrismaClient) =>
  Object.assign(prisma.filter, {
    upsertFilterText: <T extends Prisma.FilterArgs>(
      text: string,
      args?: PartialDeep<Pick<Prisma.FilterUpsertArgs, "create" | "update">>,
      select?: Prisma.SelectSubset<T, Prisma.FilterArgs>
    ) => {
      const query = {
        where: {
          text,
        },
        create: {
          text,
        },
        update: {},
      } satisfies Prisma.FilterUpsertArgs;

      return prisma.filter.upsert<T & typeof query>(
        _.merge(query, args, select)
      );
    },
  });
