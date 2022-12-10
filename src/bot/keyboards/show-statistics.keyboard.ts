import { Menu } from "@grammyjs/menu";
import { Context } from "~/bot/types";
import { logHandle } from "~/bot/helpers/logging";

export const keyboard = new Menu<Context>("statistics");

keyboard.back(
  {
    text: (ctx) => ctx.t("back"),
  },
  logHandle("handle statistics"),
  async (ctx) => {
    await ctx.replyWithChatAction("typing");
    await ctx.editMessageText(ctx.t("main.welcome"));
  }
);
