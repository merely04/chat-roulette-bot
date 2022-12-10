import { AsyncLocalStorage } from "async_hooks";
import { User, Node, Message, Blacklist } from "@prisma/client";
import { Logger } from "pino";

export interface LocalContext {
  user?: User & {
    node?: (Node & { users?: User[] | null }) | null;
    messages?: Message[];
    blacklist?: Blacklist | null;
  };
  logger?: Logger;
}

export const context = new AsyncLocalStorage<LocalContext>();
