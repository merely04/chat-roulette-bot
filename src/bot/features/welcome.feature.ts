import { Composer } from "grammy";
import { Context } from "~/bot/types";
import { mainKeyboard, nodeKeyboard } from "~/bot/keyboards";
import { logHandle } from "~/bot/helpers/logging";
import { filtersService, messagesService } from "~/services";
import { replaceFilterWords } from "~/bot/lib";

export const composer = new Composer<Context>();

const feature = composer.chatType("private");

feature.use(mainKeyboard);
feature.use(nodeKeyboard);

feature.command("start", logHandle("handle /start"), async (ctx) => {
  await ctx.replyWithChatAction("typing");
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

  const beforeLanguageCode = user.languageCode ?? "en";
  if (companion.languageCode && companion.languageCode !== beforeLanguageCode) {
    ctx.i18n.useLocale(companion.languageCode.toString());
  }

  await ctx.api.sendMessage(
    companionTelegramId,
    `
${ctx.t("companion.from", {})}: <code>${companionTelegramId}</code>

${text}
  `,
    {
      reply_markup: nodeKeyboard,
    }
  );

  ctx.i18n.useLocale(beforeLanguageCode);
});
