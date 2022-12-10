// eslint-disable-next-line @typescript-eslint/no-empty-interface
import { Blacklist, User } from "@prisma/client";

export interface SessionData {
  controlUser?: (User & { blacklist: Blacklist | null }) | null;
}
