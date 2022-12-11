import { CronJob } from "cron";
import { Bot } from "grammy";
import { Context } from "~/bot/types";
import { nodesService, usersService } from "~/services";
import { logger } from "~/logger";
import { i18n } from "~/bot/i18n";

let isRunning = false;
export const createJob = (bot: Bot<Context>) =>
  new CronJob(
    "*/3 * * * * *",
    async () => {
      if (isRunning) {
        return;
      }

      isRunning = true;

      try {
        const users = await usersService.findMany({
          where: {
            isSearching: true,
            blacklist: null,
          },
          take: 2,
        });

        if (users.length !== 2) {
          throw new Error("Not enough people in the search");
        }

        const [companion1, companion2] = users;

        await usersService.updateMany({
          where: {
            id: {
              in: [companion1.id, companion2.id],
            },
          },
          data: {
            isSearching: false,
          },
        });

        let node = await nodesService.findFirst({
          where: {
            users: {
              some: {
                id: {
                  in: [companion1.id, companion2.id],
                },
              },
            },
          },
          include: {
            users: true,
          },
        });
        if (!node) {
          node = await nodesService.create({
            data: {
              users: {
                connect: [{ id: companion1.id }, { id: companion2.id }],
              },
            },
            include: {
              users: true,
            },
          });
        }

        await usersService.updateMany({
          where: {
            id: {
              in: [companion1.id, companion2.id],
            },
          },
          data: {
            nodeId: node.id,
          },
        });

        const companion1Message = i18n.t(
          companion1.languageCode ?? "en",
          "companion.founded"
        );
        await bot.api.sendMessage(
          companion1.telegramId.toString(),
          `${companion1Message} - <code>${companion2.telegramId}</code>`
        );

        const companion2Message = i18n.t(
          companion2.languageCode ?? "en",
          "companion.founded"
        );
        await bot.api.sendMessage(
          companion2.telegramId.toString(),
          `${companion2Message} - <code>${companion1.telegramId}</code>`
        );
      } catch (e: any) {
        logger.error(e?.message);
      }

      isRunning = false;
    },
    null,
    false,
    "Europe/Moscow"
  );

// const companion = await usersService.findFirst({
//     where: {
//         isSearching: true,
//         blacklist: null,
//         id: {
//             not: user.id,
//         },
//     },
// });
//
// if (!companion) {
//     return;
// }
//
// await usersService.updateMany({
//     where: {
//         id: {
//             in: [user.id, companion.id],
//         },
//     },
//     data: {
//         isSearching: false,
//     },
// });
//
// let node = await nodesService.findFirst({
//     where: {
//         users: {
//             some: {
//                 id: {
//                     in: [user.id, companion.id],
//                 },
//             },
//         },
//     },
//     include: {
//         users: true,
//     },
// });
// if (!node) {
//     node = await nodesService.create({
//         data: {
//             users: {
//                 connect: [{ id: user.id }, { id: companion.id }],
//             },
//         },
//         include: {
//             users: true,
//         },
//     });
//
//     if (node.users.length > 2) {
//         return;
//     }
// }
//
// await usersService.updateMany({
//     where: {
//         id: {
//             in: [user.id, companion.id],
//         },
//     },
//     data: {
//         nodeId: node.id,
//     },
// });
//
// await ctx.editMessageText(
//     `${ctx.t("companion.founded")} - <code>${companion.telegramId}</code>`,
//     {
//         reply_markup: nodeKeyboard,
//     }
// );
//
// const beforeLanguageCode = user.languageCode ?? "en";
// if (
//     companion.languageCode &&
//     companion.languageCode !== beforeLanguageCode
// ) {
//     ctx.i18n.useLocale(companion.languageCode.toString());
// }
//
// await ctx.api.sendMessage(
//     companion.telegramId.toString(),
//     `${ctx.t("companion.founded")} - <code>${user.telegramId}</code>`,
//     {
//         reply_markup: nodeKeyboard,
//     }
// );
//
// ctx.i18n.useLocale(beforeLanguageCode);
