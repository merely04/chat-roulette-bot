import { Menu } from "@grammyjs/menu";
import { Role } from "@prisma/client";
import { Context } from "~/bot/types";
import { blacklistService, usersService } from "~/services";
import { config } from "~/config";

export const keyboard = new Menu<Context>("control_user");

keyboard.text(
  {
    text: (ctx) =>
      ctx.session.controlUser?.blacklist ? "Разблокировать" : "Заблокировать",
    payload: (ctx) => ctx.session.controlUser?.telegramId?.toString() ?? "-1",
  },
  async (ctx) => {
    if (!ctx.match) {
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
      },
    });
    if (!user) {
      return ctx.reply("User not found");
    }

    if (user.role !== Role.USER) {
      return ctx.answerCallbackQuery({
        text: "User is admin, you can't block",
        show_alert: true,
      });
    }

    ctx.session.controlUser = user;

    if (user.blacklist) {
      await blacklistService.delete({
        where: {
          userId: user.id,
        },
      });
    } else {
      await blacklistService.create({
        data: {
          userId: user.id,
        },
      });
    }

    ctx.session.controlUser = await usersService.findByTelegramId(userId, {
      include: {
        blacklist: true,
      },
    });

    ctx.menu.update();
  }
);
