import Discord from "discord.js";
import firebase from "firebase-admin";

import { firebaseAdmin } from "../";
import { Command } from "./index";

class Test implements Command {
    public readonly name: string;
    public readonly description: string;
    private database: firebase.database.Database;

    public constructor(...params: any[]) {
        this.name = "test";
        this.description = "test smth";
        
        this.database = firebaseAdmin.database;
    }

    public run (client: Discord.Client, message: Discord.Message, args: string[]): void {
        const database = this.database;
        
        try {
            firebase.database().goOnline();
    
            database.ref("/Archive/" + message.author.id).set({
                Message: message.content,
                User: message.author.username,
                User_ID: message.author.id,
            });
            firebase.database().goOffline();
    
            message.channel.send(`hi!`);
        } catch(err) {
            console.log(err);
        }
    }
}

export default Test;