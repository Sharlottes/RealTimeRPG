import { CommandInteraction, CacheType } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

// 타입스크립트에선 인터페이스보단 타입 형식이 좀 더 지원폭이 넒기에 그냥 type으로 선언함.
abstract class Command {
    public readonly guildOnly: boolean;
    public abstract readonly builder: SlashCommandBuilder;
    
    public abstract run(interaction: CommandInteraction<CacheType>): void;

    public constructor(guildOnly: boolean = false) {
      this.guildOnly = guildOnly;
    }
};

export default Command;