import { CommandInteraction, CacheType } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandCategory } from "@RTTRPG/@type";

// 타입스크립트에선 인터페이스보단 타입 형식이 좀 더 지원폭이 넒기에 그냥 type으로 선언함.
abstract class Command {
    public readonly category: CommandCategory;
    public readonly dmOnly: boolean;
    public readonly debug: boolean;
    public readonly builder: SlashCommandBuilder;
    
    public abstract run(interaction: CommandInteraction<CacheType>): void;

    constructor(
        category: CommandCategory = "guild", 
        debug = true,
        dmOnly = false,
        builder = new SlashCommandBuilder()
    ) {
        this.builder = builder;
        this.category = category;
        this.dmOnly = dmOnly;
        this.debug = debug ;
        
        this.builder.setDefaultPermission(false);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public /*virtual*/ setHiddenConfig(option: any): any {
        return option;
    }
}

export default Command;