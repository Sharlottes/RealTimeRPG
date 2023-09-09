import { functionOrNot } from "@/utils";
import type { GuardFunction, SimpleCommandMessage } from "discordx";

export default function SpecialMembers(...memberIDs: MaybeFunction<string>[]) {
  const guard: GuardFunction<SimpleCommandMessage> = async ({ message }, _, next) => {
    if (memberIDs.map((memberID) => functionOrNot(memberID)).includes(message.author.id)) {
      await next();
    }
  };
  return guard;
}
