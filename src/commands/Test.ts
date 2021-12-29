import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import firebase from "firebase-admin";

import { firebaseAdmin } from "../";
import { Command } from "./index";

class Test implements Command {
    public readonly builder: SlashCommandBuilder;
    private database: firebase.database.Database;

    public constructor(...params: any[]) {
        this.builder = new SlashCommandBuilder()
            .setName("test")
            .setDescription("test smth");
        
        this.database = firebaseAdmin.database;
    }

    public run(interaction: CommandInteraction) {
        const database = this.database;
        
        try {
            firebase.database().goOnline();
    
            database.ref("/Archive/" + interaction.user.id).set({
                Message: interaction.toString(),
                User: interaction.user.username,
                User_ID: interaction.user.id,
            });
            firebase.database().goOffline();
    
            interaction.reply({content: `hi!`, ephemeral: true});
        } catch(err) {
            console.log(err);
        }
    }
}

export default Test;