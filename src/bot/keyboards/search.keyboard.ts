import { Menu } from "@grammyjs/menu";
import { Context } from "~/bot/types";
import { logHandle } from "~/bot/helpers/logging";
import { usersService } from "~/services";

export const keyboard = new Menu<Context>("search");

keyboard.back(
  {
    text: (ctx) => ctx.t("cancel"),
  },
  logHandle("handle cancel search"),
  async (ctx) => {
    await ctx.replyWithChatAction("typing");

    const { user } = ctx.local;
    if (!user) {
      return ctx.reply("User is empty");
    }

    const telegramId = Number(user.telegramId);

    usersService.updateByTelegramId(telegramId, {
      data: {
        isSearching: false,
      },
    });

    await ctx.editMessageText(ctx.t("main.welcome"));
  }
);
