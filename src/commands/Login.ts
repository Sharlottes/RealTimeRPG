import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { Command } from ".";

class Login implements Command {
    public readonly builder: SlashCommandBuilder;
    
    public constructor() {
        this.builder = new SlashCommandBuilder()
            .setName("login")
            .setDescription("desc");
    }
    
    public run(interaction: CommandInteraction<CacheType>) {

    }
}

export default Login;