import _ from "lodash";
import { Composer } from "grammy";
import { or } from "grammy-guard";
import { Role } from "@prisma/client";
import { Context } from "~/bot/types";
import { filtersService, nodesService, usersService } from "~/services";
import { config } from "~/config";
import {
  DEFAULT_LANGUAGE_CODE,
  getGroupChatCommands,
  getPrivateChatAdminCommands,
  getPrivateChatCommands,
} from "~/bot/helpers/bot-commands";
import { isMultipleLocales, i18n } from "~/bot/helpers/i18n";
import { isOwnerUser, isAdminUser } from "~/bot/filters";
import { logHandle } from "~/bot/helpers/logging";
import { controlUserKeyboard } from "~/bot/keyboards";
import { logger } from "~/logger";

export const composer = new Composer<Context>();

const feature = composer
  .chatType("private")
  .filter(or(isOwnerUser, isAdminUser));

feature.use(controlUserKeyboard);

const featureForOwner = composer.chatType("private").filter(isOwnerUser);

featureForOwner.command("admin", logHandle("handle /admin"), async (ctx) => {
  if (!ctx.match) {
    return ctx.reply(
      `Please, pass the Telegram user ID after the command (e.g. <code>/admin ${config.BOT_ADMIN_USER_ID}</code>)`
    );
  }

  const userId = parseInt(ctx.match, 10);

  if (Number.isNaN(userId)) {
    return ctx.reply("Invalid user ID");
  }

  if (userId === config.BOT_ADMIN_USER_ID) {
    return ctx.reply("You're already an administrator");
  }

  let user = await usersService.findByTelegramId(userId, {
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    return ctx.reply("User not found");
  }

  user = await usersService.updateByTelegramId(userId, {
    data: {
      role: user.role === Role.ADMIN ? Role.USER : Role.ADMIN,
    },
  });

  const userRoleLabel =
    user.role === Role.ADMIN ? "an administrator" : "a regular user";

  return Promise.all([
    ctx.reply(`User with ID ${user.id} is now ${userRoleLabel}`),
    ctx.api.sendMessage(userId, `You're ${userRoleLabel} now`),
    user.role === Role.ADMIN
      ? ctx.api.setMyCommands(
          [
            ...getPrivateChatCommands({
              localeCode: DEFAULT_LANGUAGE_CODE,
              includeLanguageCommand: isMultipleLocales,
            }),
            ...getPrivateChatAdminCommands({
              localeCode: DEFAULT_LANGUAGE_CODE,
              includeLanguageCommand: isMultipleLocales,
            }),
          ],
          {
            scope: {
              type: "chat",
              chat_id: Number(userId),
            },
          }
        )
      : ctx.api.deleteMyCommands({
          scope: {
            type: "chat",
            chat_id: Number(userId),
          },
        }),
  ]);
});

feature.command("stats", logHandle("handle /stats"), async (ctx) => {
  const usersCount = await usersService.count();

  const message = `Users count: ${usersCount}`;
  return ctx.reply(message);
});

feature.command("filter", logHandle("handle /filter"), async (ctx) => {
  const filters = await filtersService.findMany();

  const filterWords = ctx.match.trim().toLowerCase();
  if (filterWords) {
    const filter = filters.find((f) => f.text === filterWords);
    if (filter) {
      await filtersService.delete({
        where: {
          id: filter.id,
        },
      });

      return ctx.reply(`<code>${filterWords}</code> removed from filter`);
    }

    await filtersService.upsertFilterText(filterWords);
    return ctx.reply(`<code>${filterWords}</code> added to filter`);
  }

  const wordsList = filters.map((filter) => {
    return `<code>${filter.text}</code>`;
  });

  const message = `
Filters count: ${filters.length}

List:
${wordsList.join(", ")}
  `;
  logger.info(message);
  return ctx.reply(message);
});

feature.command(
  "setcommands",
  logHandle("handle /setcommands"),
  async (ctx) => {
    // set private chat commands
    await ctx.api.setMyCommands(
      getPrivateChatCommands({
        localeCode: DEFAULT_LANGUAGE_CODE,
        includeLanguageCommand: isMultipleLocales,
      }),
      {
        scope: {
          type: "all_private_chats",
        },
      }
    );

    if (isMultipleLocales) {
      const requests = i18n.locales.map((code) =>
        ctx.api.setMyCommands(
          getPrivateChatCommands({
            localeCode: code,
            includeLanguageCommand: isMultipleLocales,
          }),
          {
            language_code: code,
            scope: {
              type: "all_private_chats",
            },
          }
        )
      );

      await Promise.all(requests);
    }

    // set private chat superadmin commands
    await ctx.api.setMyCommands(
      [
        ...getPrivateChatCommands({
          localeCode: DEFAULT_LANGUAGE_CODE,
          includeLanguageCommand: isMultipleLocales,
        }),
        ...getPrivateChatAdminCommands({
          localeCode: DEFAULT_LANGUAGE_CODE,
          includeLanguageCommand: isMultipleLocales,
        }),
        {
          command: "admin",
          description: "Make user an administrator",
        },
      ],
      {
        scope: {
          type: "chat",
          chat_id: config.BOT_ADMIN_USER_ID,
        },
      }
    );

    const adminUsers = await usersService.findMany({
      where: {
        role: Role.ADMIN,
      },
    });

    if (!_.isEmpty(adminUsers)) {
      const requests = adminUsers.map((adminUser) =>
        ctx.api.setMyCommands(
          [
            ...getPrivateChatCommands({
              localeCode: DEFAULT_LANGUAGE_CODE,
              includeLanguageCommand: isMultipleLocales,
            }),
            ...getPrivateChatAdminCommands({
              localeCode: DEFAULT_LANGUAGE_CODE,
              includeLanguageCommand: isMultipleLocales,
            }),
          ],
          {
            scope: {
              type: "chat",
              chat_id: Number(adminUser.telegramId),
            },
          }
        )
      );

      await Promise.all(requests);
    }

    // set group chat commands
    await ctx.api.setMyCommands(
      getGroupChatCommands({
        localeCode: DEFAULT_LANGUAGE_CODE,
      }),
      {
        scope: {
          type: "all_group_chats",
        },
      }
    );

    return ctx.reply("Commands updated");
  }
);

feature.command("user", logHandle("handle /user"), async (ctx) => {
  if (ctx.match === "") {
    return ctx.reply(
      `Please, pass the Telegram user ID after the command (e.g. <code>/user ${config.BOT_ADMIN_USER_ID}</code>)`
    );
  }

  const userId = parseInt(ctx.match, 10);

  if (Number.isNaN(userId)) {
    return ctx.reply("Invalid user ID");
  }

  const user = await usersService.findByTelegramId(userId, {
    include: {
      blacklist: true,
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });
  if (user === null) {
    return ctx.reply("User not found");
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

  // eslint-disable-next-line no-underscore-dangle
  const messagesCount = user._count.messages;

  ctx.session.controlUser = user;

  await ctx.reply(
    `
${ctx.t("statistics.id")}: <code>${user.telegramId}</code>
${ctx.t("statistics.nodes")}: ${nodesCount}
${ctx.t("statistics.messages")}: ${messagesCount}
  `,
    {
      reply_markup: user.role === Role.USER ? controlUserKeyboard : undefined,
    }
  );
});
