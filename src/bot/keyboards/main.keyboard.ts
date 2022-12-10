import { Menu } from "@grammyjs/menu";
import { Context } from "~/bot/types";
import { isMultipleLocales } from "~/bot/helpers/i18n";
import { logHandle } from "~/bot/helpers/logging";
import {
  nodeKeyboard,
  searchKeyboard,
  selectLanguageKeyboard,
  showStatisticsKeyboard,
} from "~/bot/keyboards";
import { messagesService, nodesService, usersService } from "~/services";
import { logger } from "~/logger";

export const keyboard = new Menu<Context>("main");

keyboard
  .text(
    {
      text: (ctx) => ctx.t("main.search"),
      payload: "search",
    },
    logHandle("handle /search"),
    async (ctx) => {
      await ctx.replyWithChatAction("typing");

      const { user } = ctx.local;
      if (!user || user.blacklist) {
        return ctx.reply(ctx.t("blocked"));
      }

      const telegramId = Number(user.telegramId);
      await usersService.updateByTelegramId(telegramId, {
        data: {
          isSearching: true,
        },
      });

      await ctx.editMessageText(ctx.t("searching"), {
        reply_markup: searchKeyboard,
      });

      const companion = await usersService.findFirst({
        where: {
          isSearching: true,
          blacklist: undefined,
          id: {
            not: user.id,
          },
        },
      });

      if (!companion) {
        return;
      }

      await usersService.updateMany({
        where: {
          id: {
            in: [user.id, companion.id],
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
                in: [user.id, companion.id],
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
              connect: [{ id: user.id }, { id: companion.id }],
            },
          },
          include: {
            users: true,
          },
        });

        if (node.users.length > 2) {
          return;
        }
      }

      await usersService.updateMany({
        where: {
          id: {
            in: [user.id, companion.id],
          },
        },
        data: {
          nodeId: node.id,
        },
      });

      await ctx.editMessageText(
        `${ctx.t("companion.founded")} - <code>${companion.telegramId}</code>`,
        {
          reply_markup: nodeKeyboard,
        }
      );

      const beforeLanguageCode = user.languageCode ?? "en";
      if (
        companion.languageCode &&
        companion.languageCode !== beforeLanguageCode
      ) {
        ctx.i18n.useLocale(companion.languageCode.toString());
      }

      await ctx.api.sendMessage(
        companion.telegramId.toString(),
        `${ctx.t("companion.founded")} - <code>${user.telegramId}</code>`,
        {
          reply_markup: nodeKeyboard,
        }
      );

      ctx.i18n.useLocale(beforeLanguageCode);
    }
  )
  .row();

keyboard
  .submenu(
    {
      text: (ctx) => ctx.t("main.statistics"),
      payload: "show_statistics",
    },
    "statistics",
    logHandle("handle show statistics"),
    async (ctx) => {
      await ctx.replyWithChatAction("typing");

      const { user } = ctx.local;
      if (!user) {
        return;
      }

      const nodesCount = await nodesService.count({
        where: {
          messages: {
            some: {
              authorId: user.id,
            },
          },
        },
      });

      await ctx.editMessageText(`
${ctx.t("statistics.description")}

${ctx.t("statistics.id")}: <code>${user.telegramId}</code>
${ctx.t("statistics.nodes")}: ${nodesCount}
${ctx.t("statistics.messages")}: ${user.messages?.length}
        `);
    }
  )
  .row();

if (isMultipleLocales) {
  keyboard
    .submenu(
      {
        text: (ctx) => ctx.t("main.change_language"),
        payload: "change_language",
      },
      "language",
      logHandle("handle change language"),
      async (ctx) => {
        await ctx.replyWithChatAction("typing");
        await ctx.editMessageText(ctx.t("language.select"));
      }
    )
    .row();
}

keyboard.register(nodeKeyboard);
keyboard.register(searchKeyboard);
keyboard.register(showStatisticsKeyboard);
keyboard.register(selectLanguageKeyboard);
