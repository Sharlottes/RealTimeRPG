import { CommandInteraction, CacheType } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

export type CommandCategory = "guild" | "global"

type arg = {
    category?: CommandCategory,
    debug?: boolean,
    builder?: SlashCommandBuilder,
    dmOnly?: boolean
}

// 타입스크립트에선 인터페이스보단 타입 형식이 좀 더 지원폭이 넒기에 그냥 type으로 선언함.
abstract class Command {
    public readonly category: CommandCategory;
    public readonly dmOnly: boolean;
    public readonly debug: boolean;
    public readonly builder: SlashCommandBuilder;
    
    public abstract run(interaction: CommandInteraction<CacheType>): void;

    constructor(args: arg = {
        category: "guild", 
        debug: true,
        dmOnly: false,
        builder: new SlashCommandBuilder()
    }) {
        const {category, debug, builder, dmOnly} = args;
        
        this.builder = builder != undefined ? builder : new SlashCommandBuilder();
        this.category = category != undefined ? category : "guild";
        this.dmOnly = dmOnly != undefined ? dmOnly : false;
        this.debug = debug != undefined ? debug : true;
        
        this.builder.setDefaultPermission(false);
    }
    
    public /*virtual*/ setHiddenConfig(option: any): any {
        return option;
    }
};

export default Command;