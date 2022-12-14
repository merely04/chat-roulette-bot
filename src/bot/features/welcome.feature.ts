import { Composer } from "grammy";
import { Context } from "~/bot/types";
import { mainKeyboard, nodeKeyboard } from "~/bot/keyboards";
import { logHandle } from "~/bot/helpers/logging";
import { filtersService, messagesService } from "~/services";
import { replaceFilterWords } from "~/bot/lib";
import { i18n } from "~/bot/i18n";

export const composer = new Composer<Context>();

const feature = composer.chatType("private");

feature.use(nodeKeyboard);
feature.use(mainKeyboard);

feature.command("start", logHandle("handle /start"), async (ctx) => {
  await ctx.reply(ctx.t("main.welcome"), {
    reply_markup: mainKeyboard,
  });
});

feature.on("message", logHandle("handle new message"), async (ctx) => {
  const { user } = ctx.local;
  if (!user || !user.node) {
    return;
  }

  const companion = user.node.users?.find((u) => u.id !== user.id);
  if (!companion) {
    return;
  }
  const companionTelegramId = companion.telegramId.toString();

  let { text } = ctx.message;
  if (!text || text.startsWith("/")) {
    return;
  }

  const filters = await filtersService.findMany();

  filters.forEach((filter) => {
    if (text) {
      text = replaceFilterWords(text, filter.text);
    }
  });

  await messagesService.create({
    data: {
      nodeId: user.node.id,
      authorId: user.id,
    },
  });

  const companionLanguage = companion.languageCode ?? "en";
  const companionMessage = `
${i18n.t(companionLanguage, "companion.from")}: <code>${user.telegramId}</code>

${text}
    `;

  await ctx.api.sendMessage(companionTelegramId, companionMessage, {
    reply_markup: nodeKeyboard,
  });
});
