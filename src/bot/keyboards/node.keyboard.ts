import { Context } from "~/bot/types";
import { Menu } from "@grammyjs/menu";
import { logHandle } from "~/bot/helpers/logging";
import { mainKeyboard } from "~/bot/keyboards/index";
import { usersService } from "~/services";
import { i18n } from "~/bot/i18n";

export const keyboard = new Menu<Context>("node");

keyboard.text(
  {
    text: (ctx) => ctx.t("companion.disconnect"),
    payload: "node",
  },
  logHandle("handle disconnect node"),
  async (ctx) => {
    await ctx.replyWithChatAction("typing");

    const { user } = ctx.local;
    if (!user || !user.node) {
      return;
    }

    const companion = user.node.users?.find((u) => u.id !== user.id);
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

    await ctx.reply(ctx.t("companion.finished"), {
      reply_markup: mainKeyboard,
    });
  }
);
