import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, CacheType } from "discord.js";
import { Command } from "."

class Refresh extends Command {
    public builder: SlashCommandBuilder;

    public constructor() {
        super(true);

        this.builder = new SlashCommandBuilder()
            .setName("refresh")
            .setDescription("refresh command. This command is only available to the guild owner.");
    }

    public run(interaction: CommandInteraction<CacheType>): void {
        if(interaction.channel?.type != "DM") {
            if(interaction.user.id == interaction.guild?.ownerId) {
                interaction.reply("h")
            }
        }
    }
}

export default Refresh;