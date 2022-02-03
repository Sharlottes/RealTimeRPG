/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommandInteraction, CacheType } from "discord.js";
import { Command } from "@뇌절봇/commands";

class Evaluate extends Command {
    public constructor() {
        super({
            debug: false,
            category: "global"
        });

        const builder = this.builder;
        builder
            .setName("eval")
            .setDescription("eval.")
            .addStringOption(option => option
                .setName("code")
                .setDescription("code.")
                .setRequired(true)
            )
    }

    public override setHiddenConfig(option: any) {
        return option;
    }

    public override run(interaction: CommandInteraction<CacheType>): void {
        const allows = [
            "462167403237867520",
            "473072758629203980"
        ]
    }
}

export default Evaluate;