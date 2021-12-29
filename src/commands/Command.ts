import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

// 타입스크립트에선 인터페이스보단 타입 형식이 좀 더 지원폭이 넒기에 그냥 type으로 선언함.
type Command = {
  readonly builder: SlashCommandBuilder;
  readonly run: (interaction: CommandInteraction) => void;
};

export default Command;