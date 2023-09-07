import CM from "@/command/legacy/CommandManager";
import CommandManager from "@/game/managers/CommandManager";
import { PermissionGuard } from "@discordx/utilities";

import { Discord, Guard, SimpleCommand, SimpleCommandMessage } from "discordx";
import SpecialMembers from "../guards/SpecialMembers";

@Discord()
abstract class RefreshCommand {
  @SimpleCommand({ name: "refresh" })
  @Guard(
    SpecialMembers(() => process.env.OWNER_ID),
    PermissionGuard(["Administrator"])
  )
  async refrashGuildCommand({ message }: SimpleCommandMessage) {
    const time = Date.now();
    message.reply(
      `guild command refresh start! server: ${message.guild?.name}`
    );

    CM.commands.clear();
    CommandManager.init();
    await CM.refreshCommand("guild", message.guild!);

    message.reply(
      `guild command refresh has been done in ${Date.now() - time}ms`
    );
  }

  @SimpleCommand({ name: "refresh global" })
  @Guard(SpecialMembers(() => process.env.OWNER_ID))
  async refreshGlobalCommand({ message }: SimpleCommandMessage) {
    const time = Date.now();
    message.reply(`global command refresh start!`);

    CM.commands.clear();
    CommandManager.init();
    await CM.refreshCommand("global");

    message.reply(
      `global command refresh has been done in ${Date.now() - time}ms`
    );
  }
}
