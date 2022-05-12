import { SlashCommandBuilder } from "@discordjs/builders";
import Discord, { CommandInteraction, CacheType } from "discord.js";

import CM, { Command } from "@RTTRPG/commands"

const masterIDs: string[] = [
    "462167403237867520"
]

class Refresh extends Command {
    public builder: SlashCommandBuilder;

    public constructor() {
        super({category: "guild"});

        const builder = this.builder = new SlashCommandBuilder()
            .setName("refresh")
            .setDescription("refresh command. This command is only available to the guild owner.");
    }

    public run(interaction: CommandInteraction<CacheType>): void {
        if(interaction.guild != null) {
            if(interaction.user.id == interaction.guild?.ownerId || masterIDs.includes(interaction.user.id)) {
                const time = new Date().getTime();
                const guild = interaction.guild;
                interaction.editReply("refresh start! server: " + guild.name);
                
                CM.refreshCommand("guild", guild).then(() => {
                    interaction.followUp(`refresh finished in ${(new Date().getTime() - time) / 1000}s`);
                });
            } else {
                interaction.editReply({
                    content: "이 명령어는 서버 소유자만 사용 가능합니다."
                })
            }
        }
    }
}

export default Refresh;