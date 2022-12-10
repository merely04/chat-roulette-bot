import { prisma } from "~/prisma";
import { createService as createUsersService } from "./users.service";
import { createService as createBlacklistService } from "./blacklist.service";
import { createService as createFiltersService } from "./filters.service";
import { createService as createNodesService } from "./nodes.service";
import { createService as createMessagesService } from "./messages.service";

export const usersService = createUsersService(prisma);
export const blacklistService = createBlacklistService(prisma);
export const filtersService = createFiltersService(prisma);
export const nodesService = createNodesService(prisma);
export const messagesService = createMessagesService(prisma);
