export { default as Command } from "./Command";

import {
  ApplicationCommandDataResolvable,
  Collection,
  Guild,
} from "discord.js";
import { Routes } from "discord-api-types/v10";

import { CommandInfo } from "@type";
import { Command } from "commands";
import { app } from "index";

namespace CommandManager {
  export const commands: Collection<string, Command> = new Collection();

  /**
   *
   * @param command
   * @returns 명령어 추가여부
   */
  export async function register(command: Command): Promise<boolean> {
    const commandName: string = command.builder.name;

    if (!commands.has(commandName)) {
      commands.set(commandName, command);
      console.log(
        `[Command] register [ /${command.builder.name} ] to ${command.category} command.`
      );
      return true;
    } else {
      return false;
    }
  }

  export async function refreshCommand(target: "global"): Promise<void>;
  export async function refreshCommand(
    target: "guild",
    guild: Guild
  ): Promise<void>;

  export async function refreshCommand(
    target: "global" | "guild",
    guild?: Guild
  ): Promise<void> {
    const application = app.client.application;
    if (!application) return;

    const commandPath = guild
      ? Routes.applicationGuildCommands(application.id, guild.id)
      : Routes.applicationCommands(application.id);

    const data: CommandInfo[] = (await app.rest.get(
      commandPath
    )) as CommandInfo[];
    for (const command of data) {
      await app.rest.delete(`${commandPath}/${command.id}`);
      console.log(
        `[Command] delecting [ /$${commandPath}/${command.id} ] command has been done.`
      );
    }

    for (const [key, command] of commands) {
      if (command.category !== target) continue;
      const data = command.setHiddenConfig(command.builder).toJSON();
      await application.commands.create(
        data as ApplicationCommandDataResolvable,
        guild?.id
      );
      console.log(
        `[Command] registing [ /${command.builder.name} ] to ${command.category} command has been done.`
      );
    }
  }
}

export default CommandManager;
