import { Menu } from "@grammyjs/menu";
import { Context } from "~/bot/types";
import { logHandle } from "~/bot/helpers/logging";
import { usersService } from "~/services";
import { i18n } from "~/bot/i18n";
import { mainKeyboard } from "~/bot/keyboards/index";

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

    if (!user.isSearching) {
      const companion = user.node?.users?.find((u) => u.id !== user.id);
      if (!companion) {
        return;
      }
      const companionTelegramId = companion.telegramId.toString();

      await usersService.updateMany({
        where: {
          nodeId: user.nodeId,
        },
        data: {
          nodeId: null,
          isSearching: false,
        },
      });

      const companionLanguage = companion.languageCode ?? "en";
      const companionMessage = `
${i18n.t(companionLanguage, "companion.finished")}. ${i18n.t(
        companionLanguage,
        "companion.left"
      )}
    `;

      await ctx.api.sendMessage(companionTelegramId, companionMessage, {
        reply_markup: mainKeyboard,
      });
    } else {
      usersService.updateByTelegramId(telegramId, {
        data: {
          isSearching: false,
        },
      });
    }

    await ctx.editMessageText(ctx.t("main.welcome"));
  }
);
