import {
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandBuilder,
} from "discord.js";

abstract class Command {
  public readonly category: CommandCategory;
  public readonly dmOnly: boolean;
  public readonly debug: boolean;
  public readonly builder: SlashCommandBuilder;

  public abstract run(
    interaction: ChatInputCommandInteraction<CacheType>
  ): void;

  constructor(
    category: CommandCategory = "guild",
    debug = true,
    dmOnly = false,
    builder = new SlashCommandBuilder()
  ) {
    this.builder = builder;
    this.category = category;
    this.dmOnly = dmOnly;
    this.debug = debug;

    this.builder.setDefaultPermission(false);
  }

  public setHiddenConfig(option: SlashCommandBuilder): SlashCommandBuilder {
    return option;
  }
}

export default Command;
