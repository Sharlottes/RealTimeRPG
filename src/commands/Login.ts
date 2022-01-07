import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { Command } from ".";

class Login extends Command {
    public readonly builder: SlashCommandBuilder;
    
    public constructor() {
        super();
        
        this.builder = new SlashCommandBuilder()
            .setName("login")
            .setDescription("desc");
    }
    
    public run(interaction: CommandInteraction<CacheType>) {

    }
}

export default Login;