import { Context } from "~/bot/types";
import { Menu } from "@grammyjs/menu";
import { logHandle } from "~/bot/helpers/logging";
import { mainKeyboard } from "~/bot/keyboards/index";
import { nodesService, usersService } from "~/services";

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

    // const node = await nodesService.findFirst({
    //   where: {
    //     id: user.nodeId,
    //   },
    //   include: {
    //     users: true,
    //   },
    // });
    // if (!node) {
    //   return;
    // }

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

    const beforeLanguageCode = user.languageCode ?? "en";
    if (
      companion.languageCode &&
      companion.languageCode !== beforeLanguageCode
    ) {
      ctx.i18n.useLocale(companion.languageCode.toString());
    }

    await ctx.api.sendMessage(
      companionTelegramId,
      `${ctx.t("companion.finished")}. ${ctx.t("companion.left")}`,
      {
        reply_markup: mainKeyboard,
      }
    );

    ctx.i18n.useLocale(beforeLanguageCode);

    await ctx.reply(ctx.t("companion.finished"), {
      reply_markup: mainKeyboard,
    });
  }
);
