import { CommandInteraction, CacheType } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import firebase from "firebase-admin";

import { firebaseAdmin } from "../../net/";
import { Command } from "..";

class Test extends Command {
    public readonly builder: SlashCommandBuilder;
    private database: firebase.database.Database;

    public constructor() {
        super();

        this.builder = new SlashCommandBuilder()
            .setName("test")
            .setDescription("test smth")
            .setDefaultPermission(false);
            
        this.database = firebaseAdmin.database;
    }

    public run(interaction: CommandInteraction<CacheType>) {
        const database = this.database;
        
        try {
            database.ref("/Archive/" + interaction.user.id).set({
                Message: interaction.toString(),
                User: interaction.user.username,
                User_ID: interaction.user.id,
            });
            interaction.reply({content: `hi!`, ephemeral: true});
        } catch(err) {
            console.log(err);
        }
    }
}

export default Test;